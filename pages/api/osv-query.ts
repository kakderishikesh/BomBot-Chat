import { NextApiRequest, NextApiResponse } from 'next';

interface OSVQueryRequest {
  version?: string;
  name?: string;
  ecosystem?: string;
  cve?: string;
  userEmail?: string;
}

interface OSVVulnerability {
  id: string;
  summary: string;
  details: string;
  aliases?: string[];
  modified: string;
  published: string;
  severity?: Array<{
    type: string;
    score: string;
  }>;
  affected: Array<{
    package: {
      name: string;
      ecosystem: string;
    };
    ranges: Array<{
      type: string;
      events: Array<{
        introduced?: string;
        fixed?: string;
        last_affected?: string;
      }>;
    }>;
    versions?: string[];
  }>;
  references: Array<{
    type: string;
    url: string;
  }>;
  database_specific?: any;
}

interface OSVQueryResponse {
  vulns: OSVVulnerability[];
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { version, name, ecosystem, cve, userEmail }: OSVQueryRequest = req.body;

  if (!cve && (!name || !ecosystem)) {
    return res.status(400).json({ 
      error: 'Either CVE ID or both package name and ecosystem are required' 
    });
  }

  try {
    let response: Response;
    let data: OSVVulnerability | OSVQueryResponse;

    if (cve) {
      // Query specific CVE with retry logic
      let retries = 2;
      let lastError: Error | null = null;
      
      for (let attempt = 0; attempt <= retries; attempt++) {
        try {
          response = await fetch(`https://api.osv.dev/v1/vulns/${cve}`, {
            method: 'GET',
            headers: { 
              'Content-Type': 'application/json',
              'User-Agent': 'BomBot-SBOM-Scanner/1.0'
            },
            signal: AbortSignal.timeout(10000) // 10 second timeout
          });
          
          if (response.ok) {
            break; // Success, exit retry loop
          }
          
          if (response.status === 404) {
            return res.status(200).json({ 
              success: false,
              error: `CVE ${cve} not found in OSV database`,
              query: { cve }
            });
          }
          
          if (response.status === 401) {
            console.warn(`OSV API returned 401 for CVE ${cve} - attempt ${attempt + 1}/${retries + 1}`);
            if (attempt === retries) {
              return res.status(200).json({ 
                success: true,
                result: null,
                query: { cve },
                warning: 'OSV API temporarily unavailable - CVE details could not be retrieved'
              });
            }
          } else if (response.status === 429) {
            console.warn(`OSV API rate limited for CVE ${cve} - attempt ${attempt + 1}/${retries + 1}`);
            if (attempt < retries) {
              await new Promise(resolve => setTimeout(resolve, 2000 * (attempt + 1)));
            }
          } else {
            lastError = new Error(`OSV API error: ${response.status}`);
          }
          
          // Wait before retry (except for last attempt)
          if (attempt < retries) {
            await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)));
          }
          
        } catch (fetchError) {
          lastError = fetchError instanceof Error ? fetchError : new Error('Unknown fetch error');
          console.warn(`OSV API fetch error for CVE ${cve} - attempt ${attempt + 1}/${retries + 1}:`, lastError.message);
          
          if (attempt < retries) {
            await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)));
          }
        }
      }
      
      // If we get here, all retries failed
      if (!response || !response.ok) {
        throw lastError || new Error(`OSV API error: ${response?.status || 'unknown'}`);
      }
      
      data = await response.json() as OSVVulnerability;
    } else {
      // Query by package name and version
      const queryBody: any = {
        package: { name, ecosystem }
      };
      
      if (version) {
        queryBody.version = version;
      }

      // Add retry logic for OSV API calls
      let retries = 2;
      let lastError: Error | null = null;
      
      for (let attempt = 0; attempt <= retries; attempt++) {
        try {
          response = await fetch('https://api.osv.dev/v1/query', {
            method: 'POST',
            headers: { 
              'Content-Type': 'application/json',
              'User-Agent': 'BomBot-SBOM-Scanner/1.0'
            },
            body: JSON.stringify(queryBody),
            // Add timeout
            signal: AbortSignal.timeout(10000) // 10 second timeout
          });

          if (response.ok) {
            break; // Success, exit retry loop
          }
          
          // Handle specific error codes
          if (response.status === 401) {
            console.warn(`OSV API returned 401 for ${name}@${version || 'latest'} - attempt ${attempt + 1}/${retries + 1}`);
            if (attempt === retries) {
              // On final attempt, return empty results instead of failing
              console.error(`OSV API 401 after ${retries + 1} attempts for ${name}@${version || 'latest'}`);
              return res.status(200).json({ 
                success: true,
                result: { vulns: [] },
                query: { name, ecosystem, version },
                warning: 'OSV API temporarily unavailable - no vulnerabilities could be checked'
              });
            }
          } else if (response.status === 429) {
            console.warn(`OSV API rate limited for ${name}@${version || 'latest'} - attempt ${attempt + 1}/${retries + 1}`);
            // Wait longer for rate limiting
            if (attempt < retries) {
              await new Promise(resolve => setTimeout(resolve, 2000 * (attempt + 1)));
            }
          } else {
            lastError = new Error(`OSV API error: ${response.status}`);
          }
          
          // Wait before retry (except for last attempt)
          if (attempt < retries) {
            await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)));
          }
          
        } catch (fetchError) {
          lastError = fetchError instanceof Error ? fetchError : new Error('Unknown fetch error');
          console.warn(`OSV API fetch error for ${name}@${version || 'latest'} - attempt ${attempt + 1}/${retries + 1}:`, lastError.message);
          
          // Wait before retry (except for last attempt)  
          if (attempt < retries) {
            await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)));
          }
        }
      }
      
      // If we get here, all retries failed
      if (!response || !response.ok) {
        throw lastError || new Error(`OSV API error: ${response?.status || 'unknown'}`);
      }

      data = await response.json() as OSVQueryResponse;
    }

    // OSV query completed successfully

    // Return raw OSV data
    res.status(200).json({ 
      success: true,
      result: data,
      query: cve ? { cve } : { name, ecosystem, version }
    });

  } catch (error) {
    console.error('OSV query error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch data from OSV database',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
} 