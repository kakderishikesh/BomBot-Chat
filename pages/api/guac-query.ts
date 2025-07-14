import { NextApiRequest, NextApiResponse } from 'next';
import { OpenAI } from 'openai';

const openai = new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY! 
});

// GUAC API Configuration
const GUAC_GRAPHQL_URL = process.env.GUAC_GRAPHQL_URL || 'http://localhost:8080/query';
const GUAC_REST_URL = process.env.GUAC_REST_URL || 'http://localhost:8081';

interface GuacQueryRequest {
  queryType: 'packages' | 'vulnerabilities' | 'dependencies' | 'relationships' | 'custom';
  filters?: {
    packageName?: string;
    packageType?: string;
    namespace?: string;
    version?: string;
    vulnerabilityId?: string;
    ecosystem?: string;
  };
  customQuery?: string;
  threadId?: string;
  userEmail?: string;
  returnFormat?: 'graphql' | 'simplified';
}

interface GuacPackage {
  type: string;
  namespaces: Array<{
    namespace: string;
    names: Array<{
      name: string;
      versions: Array<{
        version: string;
        id: string;
      }>;
    }>;
  }>;
}

interface GuacVulnerability {
  type: string;
  vulnerabilityIDs: Array<{
    vulnerabilityID: string;
  }>;
}

interface GuacDependency {
  package: GuacPackage;
  dependsOn: GuacPackage;
  dependencyType: string;
  justification: string;
}

// Helper function to build GraphQL queries
function buildPackageQuery(filters: any = {}): string {
  const pkgSpec = [];
  
  if (filters.packageName) {
    pkgSpec.push(`name: "${filters.packageName}"`);
  }
  if (filters.packageType) {
    pkgSpec.push(`type: "${filters.packageType}"`);
  }
  if (filters.namespace) {
    pkgSpec.push(`namespace: "${filters.namespace}"`);
  }
  if (filters.version) {
    pkgSpec.push(`version: "${filters.version}"`);
  }

  const pkgSpecStr = pkgSpec.length > 0 ? `pkgSpec: {${pkgSpec.join(', ')}}` : 'pkgSpec: {}';

  return `
    query {
      packages(${pkgSpecStr}) {
        type
        namespaces {
          namespace
          names {
            name
            versions {
              version
              id
              qualifiers {
                key
                value
              }
              subpath
            }
          }
        }
      }
    }
  `;
}

function buildVulnerabilityQuery(filters: any = {}): string {
  const vulnSpec = [];
  
  if (filters.vulnerabilityId) {
    vulnSpec.push(`vulnerabilityID: "${filters.vulnerabilityId}"`);
  }
  if (filters.packageType) {
    vulnSpec.push(`type: "${filters.packageType}"`);
  }

  const vulnSpecStr = vulnSpec.length > 0 ? `vulnSpec: {${vulnSpec.join(', ')}}` : 'vulnSpec: {}';

  return `
    query {
      vulnerabilities(${vulnSpecStr}) {
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
          scannerURI
          scannerVersion
          origin
          collector
        }
      }
    }
  `;
}

function buildDependencyQuery(filters: any = {}): string {
  const depSpec = [];
  
  if (filters.packageName || filters.packageType || filters.namespace) {
    const pkgFilters = [];
    if (filters.packageName) pkgFilters.push(`name: "${filters.packageName}"`);
    if (filters.packageType) pkgFilters.push(`type: "${filters.packageType}"`);
    if (filters.namespace) pkgFilters.push(`namespace: "${filters.namespace}"`);
    
    if (pkgFilters.length > 0) {
      depSpec.push(`package: {${pkgFilters.join(', ')}}`);
    }
  }

  const depSpecStr = depSpec.length > 0 ? `dependencySpec: {${depSpec.join(', ')}}` : 'dependencySpec: {}';

  return `
    query {
      dependencies(${depSpecStr}) {
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
        origin
        collector
      }
    }
  `;
}

function buildRelationshipQuery(filters: any = {}): string {
  // Query for HasSBOM, CertifyVuln, and other relationships
  return `
    query {
      hasSBOMs(hasSBOMSpec: {}) {
        subject {
          __typename
          ... on Package {
            type
            namespaces {
              namespace
              names {
                name
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
      }
      certifyVulns(certifyVulnSpec: {}) {
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

// Execute GraphQL query against GUAC
async function executeGuacQuery(query: string): Promise<any> {
  try {
    const response = await fetch(GUAC_GRAPHQL_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'BomBot-GUAC-Integration/1.0'
      },
      body: JSON.stringify({ query })
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
    console.error('GUAC GraphQL query failed:', error);
    throw error;
  }
}

// Simplify GUAC response for easier consumption
function simplifyGuacResponse(data: any, queryType: string): any {
  switch (queryType) {
    case 'packages':
      if (data.packages) {
        return data.packages.map((pkg: GuacPackage) => ({
          type: pkg.type,
          packages: pkg.namespaces.flatMap(ns => 
            ns.names.flatMap(name => 
              name.versions.map(version => ({
                namespace: ns.namespace,
                name: name.name,
                version: version.version,
                id: version.id
              }))
            )
          )
        }));
      }
      break;

    case 'vulnerabilities':
      if (data.vulnerabilities) {
        return data.vulnerabilities.map((vuln: GuacVulnerability) => ({
          type: vuln.type,
          ids: vuln.vulnerabilityIDs.map(v => v.vulnerabilityID)
        }));
      }
      break;

    case 'dependencies':
      if (data.dependencies) {
        return data.dependencies.map((dep: GuacDependency) => ({
          package: dep.package.namespaces[0]?.names[0]?.name || 'unknown',
          dependsOn: dep.dependsOn.namespaces[0]?.names[0]?.name || 'unknown',
          type: dep.dependencyType,
          justification: dep.justification
        }));
      }
      break;

    case 'relationships':
      return {
        sboms: data.hasSBOMs?.length || 0,
        vulnerabilityLinks: data.certifyVulns?.length || 0,
        totalRelationships: (data.hasSBOMs?.length || 0) + (data.certifyVulns?.length || 0)
      };
  }

  return data;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const {
    queryType,
    filters = {},
    customQuery,
    threadId,
    userEmail,
    returnFormat = 'simplified'
  }: GuacQueryRequest = req.body;

  if (!queryType && !customQuery) {
    return res.status(400).json({ 
      error: 'Either queryType or customQuery is required' 
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
        case 'packages':
          query = buildPackageQuery(filters);
          break;
        case 'vulnerabilities':
          query = buildVulnerabilityQuery(filters);
          break;
        case 'dependencies':
          query = buildDependencyQuery(filters);
          break;
        case 'relationships':
          query = buildRelationshipQuery(filters);
          break;
        default:
          return res.status(400).json({ error: `Unknown query type: ${queryType}` });
      }

      data = await executeGuacQuery(query);
    }

    // Process and return response
    const result = returnFormat === 'simplified' 
      ? simplifyGuacResponse(data, queryType) 
      : data;

    // If threadId is provided, send results to the AI assistant
    if (threadId) {
      try {
        let messageContent: string;
        
        if (queryType === 'packages') {
          const packageCount = result?.length || 0;
          messageContent = `I found ${packageCount} packages in the GUAC supply chain graph matching your criteria:\n\n${JSON.stringify(result, null, 2)}\n\nThis data shows packages with their versions and relationships. You can ask me to analyze specific packages, find dependencies, or explore security implications.`;
        } else if (queryType === 'vulnerabilities') {
          const vulnCount = result?.length || 0;
          messageContent = `Found ${vulnCount} vulnerabilities in the GUAC database:\n\n${JSON.stringify(result, null, 2)}\n\nThese vulnerabilities have been mapped to packages in your supply chain. I can provide detailed analysis of impact and remediation strategies.`;
        } else if (queryType === 'dependencies') {
          const depCount = result?.length || 0;
          messageContent = `Found ${depCount} dependency relationships in GUAC:\n\n${JSON.stringify(result, null, 2)}\n\nThis shows how packages depend on each other in your supply chain. I can help analyze dependency risks and suggest security improvements.`;
        } else if (queryType === 'relationships') {
          messageContent = `Supply chain relationship analysis from GUAC:\n\n${JSON.stringify(result, null, 2)}\n\nThis shows SBOMs, vulnerability mappings, and other relationships. I can help you understand the security posture and compliance status.`;
        } else {
          messageContent = `GUAC query results:\n\n${JSON.stringify(result, null, 2)}\n\nI can help analyze this supply chain data and provide security insights.`;
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
          data: result,
          query: query,
          runId: run.id,
          threadId: threadId,
          filters: filters
        });
      } catch (assistantError) {
        console.error('Failed to send to assistant:', assistantError);
        // Still return the GUAC data even if assistant fails
        return res.status(200).json({ 
          success: true,
          data: result,
          query: query,
          assistantError: 'Failed to send to AI assistant',
          filters: filters
        });
      }
    }

    // Return raw GUAC data
    res.status(200).json({ 
      success: true,
      data: result,
      query: query,
      filters: filters
    });

  } catch (error) {
    console.error('GUAC query error:', error);
    res.status(500).json({ 
      error: 'Failed to query GUAC database',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
} 