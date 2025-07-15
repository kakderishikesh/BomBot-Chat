import { NextApiRequest, NextApiResponse } from 'next';
import { OpenAI } from 'openai';

const openai = new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY! 
});

// GUAC API Configuration with environment detection
const GUAC_GRAPHQL_URL = process.env.GUAC_GRAPHQL_URL || 'http://localhost:8080/query';
const GUAC_REST_URL = process.env.GUAC_REST_URL || 'http://localhost:8081';
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
        'User-Agent': 'BomBot-GUAC-Query/1.0'
      },
      body: JSON.stringify({ query }),
      signal: AbortSignal.timeout(10000) // 10 second timeout
    });

    if (!response.ok) {
      throw new Error(`GUAC GraphQL error: ${response.status} ${response.statusText}`);
    }

    const result = await response.json();
    
    if (result.errors) {
      throw new Error(`GraphQL query errors: ${JSON.stringify(result.errors)}`);
    }

    return result.data;
  } catch (error) {
    console.error('GUAC GraphQL query failed:', error);
    throw error;
  }
}

// Simplify GUAC response for easier consumption
function simplifyGuacResponse(data: any, queryType: string): any {
  if (!data) return null;

  switch (queryType) {
    case 'packages':
      return {
        packages: data.packages?.map((pkg: GuacPackage) => ({
          type: pkg.type,
          namespace: pkg.namespaces[0]?.namespace || '',
          name: pkg.namespaces[0]?.names[0]?.name || '',
          versions: pkg.namespaces[0]?.names[0]?.versions?.map(v => v.version) || []
        })) || []
      };

    case 'vulnerabilities':
      return {
        vulnerabilities: data.vulnerabilities?.map((vuln: GuacVulnerability) => ({
          id: vuln.vulnerabilityIDs[0]?.vulnerabilityID || '',
          type: vuln.type
        })) || []
      };

    case 'dependencies':
      return {
        dependencies: data.dependencies?.map((dep: GuacDependency) => ({
          package: {
            name: dep.package.namespaces[0]?.names[0]?.name || '',
            version: dep.package.namespaces[0]?.names[0]?.versions[0]?.version || ''
          },
          dependsOn: {
            name: dep.dependsOn.namespaces[0]?.names[0]?.name || '',
            version: dep.dependsOn.namespaces[0]?.names[0]?.versions[0]?.version || ''
          },
          type: dep.dependencyType
        })) || []
      };

    case 'relationships':
      return {
        sboms: data.hasSBOMs?.length || 0,
        vulnerabilities: data.certifyVulns?.length || 0,
        totalRelationships: (data.hasSBOMs?.length || 0) + (data.certifyVulns?.length || 0)
      };

    default:
      return data;
  }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
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
      message: 'Supply chain graph features require GUAC infrastructure to be running. Please refer to the setup guide.',
      fallback: true
    });
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
      success: false,
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
          return res.status(400).json({ 
            success: false,
            error: `Unknown query type: ${queryType}` 
          });
      }

      data = await executeGuacQuery(query);
    }

    // Process the response
    const processedData = returnFormat === 'simplified' 
      ? simplifyGuacResponse(data, queryType) 
      : data;

    // If threadId is provided, send results to the AI assistant
    if (threadId) {
      try {
        const messageContent = `GUAC query results for ${queryType}:\n\n${JSON.stringify(processedData, null, 2)}\n\nI can help you understand these supply chain relationships and their security implications.`;

        await openai.beta.threads.messages.create(threadId, {
          role: 'user',
          content: messageContent
        });

        const run = await openai.beta.threads.runs.create(threadId, {
          assistant_id: process.env.ASSISTANT_ID!,
        });

        return res.status(200).json({ 
          success: true,
          data: processedData,
          query: query,
          runId: run.id,
          threadId: threadId
        });
      } catch (assistantError) {
        console.error('Failed to send to assistant:', assistantError);
        // Still return the GUAC data even if assistant fails
        return res.status(200).json({ 
          success: true,
          data: processedData,
          query: query,
          assistantError: 'Failed to send to AI assistant'
        });
      }
    }

    // Return query results
    res.status(200).json({ 
      success: true,
      data: processedData,
      query: query
    });

  } catch (error) {
    console.error('GUAC query error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to query GUAC',
      details: error instanceof Error ? error.message : 'Unknown error',
      fallback: true
    });
  }
} 