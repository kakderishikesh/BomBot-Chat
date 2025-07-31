import { OpenAI } from 'openai';

// Types for chat completion
export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface ChatCompletionResponse {
  content: string;
  model: string;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

// OpenAI client (for fallback)
const openai = process.env.OPENAI_API_KEY ? new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY 
}) : null;

// Optimized system prompt for Llama models (shorter but comprehensive)
const SYSTEM_PROMPT = `You are BomBot, a cybersecurity analyst specializing in SBOM analysis and vulnerability assessment. You have access to real-time vulnerability data through the OSV database.

Core Mission: Provide clear, actionable security analysis for software dependencies, prioritizing critical vulnerabilities. Always use OSV.dev links for vulnerability references.

Key Capabilities:
1. Analyze SBOM files for security vulnerabilities
2. Query packages for vulnerability status 
3. Look up CVE details and impact
4. Provide prioritized remediation recommendations

Response Guidelines:
- Prioritize by severity: CRITICAL > HIGH > MEDIUM > LOW
- Always use OSV.dev links: https://osv.dev/vulnerability/{ID}
- Provide specific version recommendations
- Give actionable next steps with timelines
- Be concise but comprehensive

For package queries: Immediately research current vulnerability data, summarize security status, highlight critical issues, recommend safe versions.

For CVE questions: Look up comprehensive details, explain affected packages, provide severity assessment, link to OSV.dev, recommend remediation.

For SBOM analysis: Process vulnerability data, identify critical packages first, provide structured summary with priorities, include vulnerability links.

You are the user's trusted security advisor. Always be proactive in researching current vulnerability data before responding.`;

// Function to detect if a message requires function calling
export function detectFunctionCall(message: string): { function: string; args: any } | null {
  // Detect CVE mentions
  const cvePattern = /CVE-\d{4}-\d{4,}/gi;
  const cveMatch = message.match(cvePattern);
  
  if (cveMatch) {
    return {
      function: 'query_cve_details',
      args: { cve_id: cveMatch[0] }
    };
  }

  // Detect package queries with various patterns
  const packageQueryPatterns = [
    /(?:is\s+|check\s+|about\s+|analyze\s+)([a-zA-Z0-9\-_./@]+)(?:\s+([0-9.]+))?\s*(?:safe|secure|vulnerable|version)?/gi,
    /([a-zA-Z0-9\-_./@]+)\s+([0-9.]+)\s*(?:safe|secure|vulnerable|version)/gi,
    /([a-zA-Z0-9\-_./@]+)\s*(?:package|library|dependency)/gi
  ];

  for (const pattern of packageQueryPatterns) {
    const match = pattern.exec(message);
    if (match) {
      const packageName = match[1];
      const version = match[2];
      
      // Try to determine ecosystem based on common package names
      let ecosystem = 'npm'; // default
      
      // Common Python packages
      if (['django', 'flask', 'requests', 'numpy', 'pandas', 'pillow', 'certifi', 'urllib3', 'setuptools', 'pip'].includes(packageName.toLowerCase())) {
        ecosystem = 'PyPI';
      }
      // Common Java packages
      else if (['spring', 'junit', 'log4j', 'jackson', 'hibernate', 'apache', 'maven'].some(p => packageName.toLowerCase().includes(p))) {
        ecosystem = 'Maven';
      }
      // Common Go packages
      else if (packageName.includes('/') && !packageName.includes('@')) {
        ecosystem = 'Go';
      }
      
      return {
        function: 'query_package_vulnerabilities',
        args: { name: packageName, ecosystem, version }
      };
    }
  }

  return null;
}

// Chat completion for Jetstream
export async function jetstreamChatCompletion(messages: ChatMessage[]): Promise<ChatCompletionResponse> {
  const baseUrl = process.env.JETSTREAM_BASE_URL;
  const apiKey = process.env.JETSTREAM_API_KEY;
  const model = process.env.JETSTREAM_MODEL;
  
  console.log('Jetstream API call:', {
    baseUrl,
    model,
    messageCount: messages.length,
    hasApiKey: !!apiKey
  });

  const requestBody = {
    model: model,
    messages: messages,
    max_tokens: 2048,
    temperature: 0.7,
    stream: false // Ensure we get a complete response
  };

  console.log('Request body:', JSON.stringify(requestBody, null, 2));

  // Try different API paths - uncomment the one that works
  const apiPath = '/api/chat/completions';  // Original
  // const apiPath = '/v1/chat/completions';    // Alternative 1
  // const apiPath = '/chat/completions';       // Alternative 2
  
  const response = await fetch(`${baseUrl}${apiPath}`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(requestBody),
  });

  console.log('Response status:', response.status, response.statusText);

  if (!response.ok) {
    const errorBody = await response.text();
    console.error('Jetstream API error response:', errorBody);
    
    // Let all errors bubble up naturally - don't try to handle context limits
    throw new Error(`Jetstream API error: ${response.status} ${response.statusText} - ${errorBody}`);
  }

  const data = await response.json();
  console.log('Jetstream response:', data);
  
  return {
    content: data.choices?.[0]?.message?.content || '',
    model: data.model || model,
    usage: data.usage,
  };
}

// OpenAI chat completion (fallback)
export async function openaiChatCompletion(messages: ChatMessage[]): Promise<ChatCompletionResponse> {
  if (!openai) {
    throw new Error('OpenAI client not initialized');
  }

  const response = await openai.chat.completions.create({
    model: 'gpt-4',
    messages: messages,
    max_tokens: 2048,
    temperature: 0.7,
  });

  return {
    content: response.choices[0].message.content || '',
    model: response.model,
    usage: response.usage || undefined,
  };
}

// Main chat completion function
export async function chatCompletion(messages: ChatMessage[]): Promise<ChatCompletionResponse> {
  const provider = process.env.MODEL_PROVIDER || 'jetstream';
  
  // Add system prompt if not present
  if (messages.length === 0 || messages[0].role !== 'system') {
    messages.unshift({
      role: 'system',
      content: SYSTEM_PROMPT
    });
  }

  if (provider === 'jetstream') {
    return await jetstreamChatCompletion(messages);
  } else if (provider === 'openai') {
    return await openaiChatCompletion(messages);
  } else {
    throw new Error(`Unsupported model provider: ${provider}`);
  }
}

// Execute function calls manually (since Llama doesn't have native function calling)
export async function executeFunctionCall(functionName: string, args: any, baseUrl: string): Promise<string> {
  try {
    switch (functionName) {
      case 'query_package_vulnerabilities':
        const packageResponse = await fetch(`${baseUrl}/api/osv-query`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: args.name,
            ecosystem: args.ecosystem,
            version: args.version
          })
        });
        
        if (!packageResponse.ok) {
          console.error(`Package query failed: ${packageResponse.status} for ${args.name}@${args.version || 'latest'}`);
          throw new Error(`Package query failed: ${packageResponse.status}`);
        }
        
        const packageData = await packageResponse.json();
        
        // Handle OSV API warnings (when API was temporarily unavailable)
        if (packageData.warning) {
          return `⚠️ **OSV API Notice**: ${packageData.warning}
          
The vulnerability database is temporarily unavailable, so I couldn't check for vulnerabilities in **${args.name}** right now. 

**What you can do:**
- Try asking again in a few minutes
- Check directly at: https://osv.dev/list?q=${encodeURIComponent(args.name)}
- The package may still be safe to use, but verification isn't possible right now

This is a temporary issue with the external vulnerability database, not with your SBOM analysis.`;
        }
        
        return JSON.stringify(packageData, null, 2);
        
      case 'query_cve_details':
        const cveResponse = await fetch(`${baseUrl}/api/osv-query`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            cve: args.cve_id
          })
        });
        
        if (!cveResponse.ok) {
          console.error(`CVE query failed: ${cveResponse.status} for ${args.cve_id}`);
          throw new Error(`CVE query failed: ${cveResponse.status}`);
        }
        
        const cveData = await cveResponse.json();
        
        // Handle OSV API warnings (when API was temporarily unavailable)
        if (cveData.warning) {
          return `⚠️ **OSV API Notice**: ${cveData.warning}
          
The vulnerability database is temporarily unavailable, so I couldn't retrieve details for **${args.cve_id}** right now.

**What you can do:**
- Try asking again in a few minutes  
- Check directly at: https://osv.dev/vulnerability/${args.cve_id}
- Look up the CVE on other databases like NVD

This is a temporary issue with the external vulnerability database.`;
        }
        
        return JSON.stringify(cveData, null, 2);
        
      default:
        throw new Error(`Unknown function: ${functionName}`);
    }
  } catch (error) {
    console.error(`Function execution error for ${functionName}:`, error);
    throw error;
  }
}