import { NextApiRequest, NextApiResponse } from 'next';
import { OpenAI } from 'openai';

const openai = new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY! 
});

// GUAC API Configuration with environment detection
const GUAC_GRAPHQL_URL = process.env.GUAC_GRAPHQL_URL || 'http://localhost:8080/query';
const GUAC_ENABLED = process.env.GUAC_ENABLED !== 'false' && process.env.NODE_ENV !== 'production';

// Helper function to check if GUAC is available
async function checkGuacAvailability(): Promise<boolean> {
  if (!GUAC_ENABLED) {
    return false;
  }
  
  try {
    const response = await fetch(GUAC_GRAPHQL_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: '{ __schema { types { name } } }' }),
      signal: AbortSignal.timeout(5000) // 5 second timeout
    });
    return response.ok;
  } catch (error) {
    console.warn('GUAC services not available:', error instanceof Error ? error.message : 'Unknown error');
    return false;
  }
}

interface GuacRelationshipRequest {
  queryType: 'dependencies' | 'dependents' | 'vulnerabilities' | 'sboms' | 'attestations' | 'provenance' | 'blast_radius' | 'custom';
  subject: {
    type?: 'package' | 'artifact' | 'vulnerability';
    name?: string;
    namespace?: string;
    version?: string;
    digest?: string;
    vulnerabilityId?: string;
  };
  options?: {
    maxDepth?: number;
    includeTransitive?: boolean;
    filterTypes?: string[];
    limitResults?: number;
  };
  customQuery?: string;
  threadId?: string;
  userEmail?: string;
}

interface GuacRelationshipResponse {
  success: boolean;
  data?: any;
  summary?: {
    totalNodes: number;
    totalEdges: number;
    queryType: string;
    subject: string;
  };
  error?: string;
  details?: any;
  query?: string;
  runId?: string;
  threadId?: string;
  assistantError?: string;
  fallback?: boolean;
}

// Helper function to build package identifier
function buildPackageIdentifier(subject: any): string {
  const parts = [];
  if (subject.type) parts.push(`type: "${subject.type}"`);
  if (subject.namespace) parts.push(`namespace: "${subject.namespace}"`);
  if (subject.name) parts.push(`name: "${subject.name}"`);
  if (subject.version) parts.push(`version: "${subject.version}"`);
  return parts.join(', ');
}

// Helper function to build dependency tree query
function buildDependencyTreeQuery(subject: any, options: any = {}): string {
  const maxDepth = options.maxDepth || 3;
  const includeTransitive = options.includeTransitive !== false;
  const packageSpec = buildPackageIdentifier(subject);

  return `
    query {
      dependencies(dependencySpec: {
        package: {${packageSpec}}
      }) {
        package {
          type
          namespaces {
            namespace
            names {
              name
              versions {
                version
                id
              }
            }
          }
        }
        dependsOn {
          type
          namespaces {
            namespace
            names {
              name
              versions {
                version
                id
              }
            }
          }
        }
        dependencyType
        justification
        versionRange
        origin
        collector
      }
      ${includeTransitive ? `
        # Transitive dependencies (up to depth ${maxDepth})
        packages(pkgSpec: {${packageSpec}}) {
          type
          namespaces {
            namespace
            names {
              name
              versions {
                version
                id
              }
            }
          }
        }
      ` : ''}
    }
  `;
}

// Helper function to build dependents query (what depends on this package)
function buildDependentsQuery(subject: any, options: any = {}): string {
  const packageSpec = buildPackageIdentifier(subject);

  return `
    query {
      dependencies(dependencySpec: {
        dependsOn: {${packageSpec}}
      }) {
        package {
          type
          namespaces {
            namespace
            names {
              name
              versions {
                version
                id
              }
            }
          }
        }
        dependsOn {
          type
          namespaces {
            namespace
            names {
              name
              versions {
                version
                id
              }
            }
          }
        }
        dependencyType
        justification
        versionRange
        origin
        collector
      }
    }
  `;
}

// Helper function to build vulnerability relationships query
function buildVulnerabilityRelationshipsQuery(subject: any, options: any = {}): string {
  if (subject.vulnerabilityId) {
    // Query packages affected by this vulnerability
    return `
      query {
        certifyVulns(certifyVulnSpec: {
          vulnerability: {
            vulnerabilityID: "${subject.vulnerabilityId}"
          }
        }) {
          package {
            type
            namespaces {
              namespace
              names {
                name
                versions {
                  version
                  id
                }
              }
            }
          }
          vulnerability {
            type
            vulnerabilityIDs {
              vulnerabilityID
            }
          }
          metadata {
            dbURI
            dbVersion
            scannerURI
            scannerVersion
            timeScanned
            origin
            collector
          }
        }
        # Also get vulnerability metadata
        vulnerabilities(vulnSpec: {
          vulnerabilityID: "${subject.vulnerabilityId}"
        }) {
          type
          vulnerabilityIDs {
            vulnerabilityID
          }
          metadata {
            scoreType
            scoreValue
            timeScanned
            dbURI
            dbVersion
          }
        }
      }
    `;
  } else {
    // Query vulnerabilities affecting this package
    const packageSpec = buildPackageIdentifier(subject);
    return `
      query {
        certifyVulns(certifyVulnSpec: {
          package: {${packageSpec}}
        }) {
          package {
            type
            namespaces {
              namespace
              names {
                name
                versions {
                  version
                  id
                }
              }
            }
          }
          vulnerability {
            type
            vulnerabilityIDs {
              vulnerabilityID
            }
          }
          metadata {
            dbURI
            dbVersion
            scannerURI
            scannerVersion
            timeScanned
            origin
            collector
          }
        }
      }
    `;
  }
}

// Helper function to build SBOM relationships query
function buildSBOMRelationshipsQuery(subject: any, options: any = {}): string {
  const packageSpec = buildPackageIdentifier(subject);

  return `
    query {
      hasSBOMs(hasSBOMSpec: {
        subject: {
          package: {${packageSpec}}
        }
      }) {
        subject {
          __typename
          ... on Package {
            type
            namespaces {
              namespace
              names {
                name
                versions {
                  version
                  id
                }
              }
            }
          }
          ... on Artifact {
            algorithm
            digest
          }
        }
        uri
        algorithm
        digest
        downloadLocation
        origin
        collector
        knownSince
      }
      # Also get included packages in SBOMs
      hasSourceAt(hasSourceAtSpec: {
        package: {${packageSpec}}
      }) {
        package {
          type
          namespaces {
            namespace
            names {
              name
              versions {
                version
              }
            }
          }
        }
        source {
          type
          namespaces {
            namespace
            names {
              name
            }
          }
        }
        knownSince
        justification
        origin
        collector
      }
    }
  `;
}

// Helper function to build attestations query
function buildAttestationsQuery(subject: any, options: any = {}): string {
  const packageSpec = buildPackageIdentifier(subject);

  return `
    query {
      certifyGood(certifyGoodSpec: {
        subject: {
          package: {${packageSpec}}
        }
      }) {
        subject {
          __typename
          ... on Package {
            type
            namespaces {
              namespace
              names {
                name
                versions {
                  version
                }
              }
            }
          }
        }
        justification
        knownSince
        origin
        collector
      }
      certifyBad(certifyBadSpec: {
        subject: {
          package: {${packageSpec}}
        }
      }) {
        subject {
          __typename
          ... on Package {
            type
            namespaces {
              namespace
              names {
                name
                versions {
                  version
                }
              }
            }
          }
        }
        justification
        knownSince
        origin
        collector
      }
      scorecards(scorecardSpec: {
        source: {${packageSpec}}
      }) {
        source {
          type
          namespaces {
            namespace
            names {
              name
            }
          }
        }
        scorecard {
          timeScanned
          aggregateScore
          checks {
            check
            score
          }
          scorecardVersion
          scorecardCommit
          origin
          collector
        }
      }
    }
  `;
}

// Helper function to build blast radius query (impact analysis)
function buildBlastRadiusQuery(subject: any, options: any = {}): string {
  const packageSpec = buildPackageIdentifier(subject);
  const maxDepth = options.maxDepth || 5;

  return `
    query {
      # Direct dependents
      dependencies(dependencySpec: {
        dependsOn: {${packageSpec}}
      }) {
        package {
          type
          namespaces {
            namespace
            names {
              name
              versions {
                version
                id
              }
            }
          }
        }
        dependencyType
        justification
      }
      
      # Vulnerabilities in this package
      certifyVulns(certifyVulnSpec: {
        package: {${packageSpec}}
      }) {
        vulnerability {
          type
          vulnerabilityIDs {
            vulnerabilityID
          }
        }
        metadata {
          scoreType
          scoreValue
        }
      }
      
      # SBOMs containing this package
      hasSBOMs(hasSBOMSpec: {
        subject: {
          package: {${packageSpec}}
        }
      }) {
        uri
        downloadLocation
      }
    }
  `;
}

// Execute GraphQL query against GUAC
async function executeGuacQuery(query: string): Promise<any> {
  try {
    const response = await fetch(GUAC_GRAPHQL_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'BomBot-GUAC-Relationships/1.0'
      },
      body: JSON.stringify({ query }),
      signal: AbortSignal.timeout(10000) // 10 second timeout
    });

    if (!response.ok) {
      throw new Error(`GUAC GraphQL error: ${response.status} ${response.statusText}`);
    }

    const result = await response.json();
    
    if (result.errors) {
      throw new Error(`GraphQL errors: ${JSON.stringify(result.errors)}`);
    }

    return result.data;
  } catch (error) {
    console.error('GUAC relationship query failed:', error);
    throw error;
  }
}

// Process and analyze relationship data
function analyzeRelationships(data: any, queryType: string, subject: any): any {
  const analysis: any = {
    queryType,
    subject: `${subject.name}@${subject.version || 'latest'}`,
    totalNodes: 0,
    totalEdges: 0,
    details: {}
  };

  switch (queryType) {
    case 'dependencies':
      if (data.dependencies) {
        analysis.totalEdges = data.dependencies.length;
        analysis.details.directDependencies = data.dependencies.length;
        analysis.details.dependencies = data.dependencies.map((dep: any) => ({
          name: dep.dependsOn.namespaces[0]?.names[0]?.name || 'unknown',
          version: dep.dependsOn.namespaces[0]?.names[0]?.versions[0]?.version || 'unknown',
          type: dep.dependencyType,
          justification: dep.justification
        }));
      }
      break;

    case 'dependents':
      if (data.dependencies) {
        analysis.totalEdges = data.dependencies.length;
        analysis.details.dependentPackages = data.dependencies.length;
        analysis.details.dependents = data.dependencies.map((dep: any) => ({
          name: dep.package.namespaces[0]?.names[0]?.name || 'unknown',
          version: dep.package.namespaces[0]?.names[0]?.versions[0]?.version || 'unknown',
          type: dep.dependencyType,
          justification: dep.justification
        }));
      }
      break;

    case 'vulnerabilities':
      if (data.certifyVulns) {
        analysis.totalEdges = data.certifyVulns.length;
        analysis.details.vulnerabilityCount = data.certifyVulns.length;
        analysis.details.vulnerabilities = data.certifyVulns.map((cert: any) => ({
          vulnerabilityId: cert.vulnerability.vulnerabilityIDs[0]?.vulnerabilityID || 'unknown',
          package: cert.package?.namespaces[0]?.names[0]?.name || subject.name,
          scanTime: cert.metadata?.timeScanned,
          scanner: cert.metadata?.scannerURI
        }));
      }
      if (data.vulnerabilities) {
        analysis.details.vulnerabilityMetadata = data.vulnerabilities.map((vuln: any) => ({
          id: vuln.vulnerabilityIDs[0]?.vulnerabilityID,
          scoreType: vuln.metadata?.scoreType,
          scoreValue: vuln.metadata?.scoreValue
        }));
      }
      break;

    case 'sboms':
      if (data.hasSBOMs) {
        analysis.totalEdges = data.hasSBOMs.length;
        analysis.details.sbomCount = data.hasSBOMs.length;
        analysis.details.sboms = data.hasSBOMs.map((sbom: any) => ({
          uri: sbom.uri,
          algorithm: sbom.algorithm,
          digest: sbom.digest,
          downloadLocation: sbom.downloadLocation
        }));
      }
      break;

    case 'blast_radius':
      const dependents = data.dependencies?.length || 0;
      const vulnerabilities = data.certifyVulns?.length || 0;
      const sboms = data.hasSBOMs?.length || 0;
      
      analysis.totalEdges = dependents + vulnerabilities + sboms;
      analysis.details = {
        impactScore: calculateImpactScore(dependents, vulnerabilities, sboms),
        dependentPackages: dependents,
        vulnerabilities: vulnerabilities,
        containingSBOMs: sboms,
        riskLevel: determineRiskLevel(dependents, vulnerabilities)
      };
      break;
  }

  return analysis;
}

// Helper function to calculate impact score
function calculateImpactScore(dependents: number, vulnerabilities: number, sboms: number): number {
  // Simple scoring algorithm: dependents weight=1, vulnerabilities weight=5, sboms weight=0.5
  return (dependents * 1) + (vulnerabilities * 5) + (sboms * 0.5);
}

// Helper function to determine risk level
function determineRiskLevel(dependents: number, vulnerabilities: number): string {
  if (vulnerabilities > 0 && dependents > 10) return 'CRITICAL';
  if (vulnerabilities > 0 && dependents > 5) return 'HIGH';
  if (vulnerabilities > 0) return 'MEDIUM';
  if (dependents > 20) return 'MEDIUM';
  return 'LOW';
}

export default async function handler(req: NextApiRequest, res: NextApiResponse<GuacRelationshipResponse>) {
  if (req.method !== 'POST') {
    return res.status(405).json({ 
      success: false, 
      error: 'Method Not Allowed' 
    });
  }

  // Check if GUAC is available
  const guacAvailable = await checkGuacAvailability();
  
  if (!guacAvailable) {
    return res.status(503).json({
      success: false,
      error: 'GUAC services are not available',
      details: 'Supply chain relationship analysis requires GUAC infrastructure to be running. Please refer to the setup guide.',
      fallback: true
    });
  }

  const {
    queryType,
    subject,
    options = {},
    customQuery,
    threadId,
    userEmail
  }: GuacRelationshipRequest = req.body;

  if (!queryType && !customQuery) {
    return res.status(400).json({ 
      success: false,
      error: 'Either queryType or customQuery is required' 
    });
  }

  if (!subject && !customQuery) {
    return res.status(400).json({ 
      success: false,
      error: 'Subject is required for relationship queries' 
    });
  }

  try {
    let query: string;
    let data: any;

    // Build and execute query
    if (customQuery) {
      query = customQuery;
      data = await executeGuacQuery(query);
    } else {
      switch (queryType) {
        case 'dependencies':
          query = buildDependencyTreeQuery(subject, options);
          break;
        case 'dependents':
          query = buildDependentsQuery(subject, options);
          break;
        case 'vulnerabilities':
          query = buildVulnerabilityRelationshipsQuery(subject, options);
          break;
        case 'sboms':
          query = buildSBOMRelationshipsQuery(subject, options);
          break;
        case 'attestations':
          query = buildAttestationsQuery(subject, options);
          break;
        case 'blast_radius':
          query = buildBlastRadiusQuery(subject, options);
          break;
        default:
          return res.status(400).json({ 
            success: false,
            error: `Unknown query type: ${queryType}` 
          });
      }

      data = await executeGuacQuery(query);
    }

    // Analyze the relationship data
    const analysis = analyzeRelationships(data, queryType, subject);

    // If threadId is provided, send results to the AI assistant
    if (threadId) {
      try {
        let messageContent: string;
        
        if (queryType === 'dependencies') {
          messageContent = `Supply chain dependency analysis for ${subject.name}:\n\n${JSON.stringify(analysis, null, 2)}\n\nThis shows what packages ${subject.name} depends on. I can help you understand security risks, licensing concerns, or suggest dependency management strategies.`;
        } else if (queryType === 'dependents') {
          messageContent = `Impact analysis for ${subject.name}:\n\n${JSON.stringify(analysis, null, 2)}\n\nThis shows which packages depend on ${subject.name}. If you update or remove this package, these ${analysis.details.dependentPackages || 0} packages could be affected.`;
        } else if (queryType === 'vulnerabilities') {
          messageContent = `Vulnerability mapping for ${subject.name || subject.vulnerabilityId}:\n\n${JSON.stringify(analysis, null, 2)}\n\nThis shows vulnerability relationships in your supply chain. I can help prioritize remediation and assess impact.`;
        } else if (queryType === 'blast_radius') {
          messageContent = `Blast radius analysis for ${subject.name}:\n\n${JSON.stringify(analysis, null, 2)}\n\nRisk Level: ${analysis.details.riskLevel}\nImpact Score: ${analysis.details.impactScore}\n\nThis shows the potential impact if this package has issues. I can help you understand the risks and create mitigation strategies.`;
        } else {
          messageContent = `Supply chain relationship analysis:\n\n${JSON.stringify(analysis, null, 2)}\n\nI can help you understand these relationships and their security implications.`;
        }

        await openai.beta.threads.messages.create(threadId, {
          role: 'user',
          content: messageContent
        });

        const run = await openai.beta.threads.runs.create(threadId, {
          assistant_id: process.env.ASSISTANT_ID!,
        });

        return res.status(200).json({ 
          success: true,
          data: data,
          summary: analysis,
          query: query,
          runId: run.id,
          threadId: threadId
        });
      } catch (assistantError) {
        console.error('Failed to send to assistant:', assistantError);
        // Still return the GUAC data even if assistant fails
        return res.status(200).json({ 
          success: true,
          data: data,
          summary: analysis,
          query: query,
          assistantError: 'Failed to send to AI assistant'
        });
      }
    }

    // Return relationship analysis
    res.status(200).json({ 
      success: true,
      data: data,
      summary: analysis,
      query: query
    });

  } catch (error) {
    console.error('GUAC relationship query error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to query GUAC relationships',
      details: error instanceof Error ? error.message : 'Unknown error',
      fallback: true
    });
  }
} 