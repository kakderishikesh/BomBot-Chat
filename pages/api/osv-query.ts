import { NextApiRequest, NextApiResponse } from 'next';
import { OpenAI } from 'openai';

const openai = new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY! 
});

interface OSVQueryRequest {
  version?: string;
  name?: string;
  ecosystem?: string;
  cve?: string;
  threadId?: string;
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

  const { version, name, ecosystem, cve, threadId }: OSVQueryRequest = req.body;

  if (!cve && (!name || !ecosystem)) {
    return res.status(400).json({ 
      error: 'Either CVE ID or both package name and ecosystem are required' 
    });
  }

  try {
    let response: Response;
    let data: OSVVulnerability | OSVQueryResponse;

    if (cve) {
      // Query specific CVE
      response = await fetch(`https://api.osv.dev/v1/vulns/${cve}`, {
        method: 'GET',
        headers: { 
          'Content-Type': 'application/json',
          'User-Agent': 'BomBot-SBOM-Scanner/1.0'
        }
      });
      
      if (!response.ok) {
        if (response.status === 404) {
          return res.status(404).json({ 
            error: `CVE ${cve} not found in OSV database` 
          });
        }
        throw new Error(`OSV API error: ${response.status}`);
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

      response = await fetch('https://api.osv.dev/v1/query', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'User-Agent': 'BomBot-SBOM-Scanner/1.0'
        },
        body: JSON.stringify(queryBody)
      });

      if (!response.ok) {
        throw new Error(`OSV API error: ${response.status}`);
      }

      data = await response.json() as OSVQueryResponse;
    }

    // If threadId is provided, send the results to the existing conversation
    if (threadId) {
      try {
        let messageContent: string;
        
        if (cve) {
          const vuln = data as OSVVulnerability;
          messageContent = `Here are the details for CVE ${cve}:\n\n${JSON.stringify(vuln, null, 2)}\n\nPlease provide a QUICK summary with clickable links. Keep it brief and suggest I can ask for "detailed analysis" if needed.`;
        } else {
          const queryResult = data as OSVQueryResponse;
          const vulnCount = queryResult.vulns?.length || 0;
          
          if (vulnCount === 0) {
            messageContent = `I queried the OSV database for package "${name}" in ecosystem "${ecosystem}"${version ? ` version "${version}"` : ''} and found no known vulnerabilities. ✅ This package appears to be safe!`;
          } else {
            messageContent = `I found ${vulnCount} vulnerability/vulnerabilities for package "${name}" in ecosystem "${ecosystem}"${version ? ` version "${version}"` : ''}:\n\n${JSON.stringify(queryResult, null, 2)}\n\nPlease provide a QUICK summary with clickable vulnerability links. Keep it brief and suggest I can ask for "detailed analysis" if needed.`;
          }
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
          result: data,
          runId: run.id,
          threadId: threadId,
          query: cve ? { cve } : { name, ecosystem, version }
        });
      } catch (assistantError) {
        console.error('Failed to send to assistant:', assistantError);
        // Still return the OSV data even if assistant fails
        return res.status(200).json({ 
          result: data,
          assistantError: 'Failed to send to AI assistant',
          query: cve ? { cve } : { name, ecosystem, version }
        });
      }
    }

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