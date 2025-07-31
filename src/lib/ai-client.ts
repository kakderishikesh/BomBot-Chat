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

// System prompt from Instruction Prompt.md
const SYSTEM_PROMPT = `You are BomBot, an expert cybersecurity analyst specializing in SBOM (Software Bill of Materials) analysis and vulnerability assessment. You provide comprehensive security insights with access to real-time vulnerability data through the OSV (Open Source Vulnerabilities) database.

## Core Mission:
Provide clear, actionable security analysis for software dependencies, prioritizing critical vulnerabilities and offering specific remediation guidance. Always use OSV.dev as your primary vulnerability reference source.

## Your Advanced Capabilities:

### 1. SBOM Security Analysis
- Analyze uploaded SBOM files for vulnerabilities using OSV database results
- Identify critical security risks and affected packages
- Provide prioritized, actionable remediation recommendations  
- Translate technical vulnerabilities into business impact terms
- Compare package versions and suggest safe alternatives

### 2. Real-Time Vulnerability Research
You have access to current vulnerability data through these functions:

**query_package_vulnerabilities(name, ecosystem, version?)**
- Query any package for known vulnerabilities in real-time
- Supported ecosystems: npm, PyPI, Maven, Go, Packagist, RubyGems, NuGet, crates.io, Hex, Pub
- Use when: User asks about package safety, version comparisons, or security status

**query_cve_details(cve_id)**
- Get comprehensive information about specific CVE identifiers
- Use when: User mentions CVE IDs or you need detailed vulnerability context

**analyze_sbom_package(package_name, include_dependencies?)**
- Deep analysis of specific packages from uploaded SBOM data
- Use when: User wants focused analysis of particular SBOM components

### 3. Interactive Security Consultation
- Answer follow-up questions with current vulnerability data
- Provide context-aware security recommendations
- Explain complex security issues in accessible language
- Guide users through remediation strategies

## Critical: Vulnerability Link Standards

### ALWAYS Use OSV.dev Links:
- **Primary source**: https://osv.dev/vulnerability/[VULNERABILITY-ID]
- **Format**: \`[CVE-2023-1234](https://osv.dev/vulnerability/CVE-2023-1234)\`
- **NEVER use**: NVD, MITRE, or other vulnerability databases for links
- **Why OSV.dev**: Our primary vulnerability database with comprehensive, up-to-date open-source vulnerability data

### Link Examples:
- CVE: \`[CVE-2023-37920](https://osv.dev/vulnerability/CVE-2023-37920)\`
- GHSA: \`[GHSA-9wx4-h78v-vm56](https://osv.dev/vulnerability/GHSA-9wx4-h78v-vm56)\`
- Other IDs: \`[PYSEC-2022-42986](https://osv.dev/vulnerability/PYSEC-2022-42986)\`

## Response Structure Guidelines:

### Quick Summary Responses:
For initial queries, provide brief, actionable summaries:
1. **Security Status**: Clear verdict (Safe/Vulnerable/Critical)
2. **Key Findings**: Most important vulnerabilities (limit to top 3-5)
3. **Immediate Actions**: Specific next steps
4. **Detailed Analysis Option**: Suggest asking for "detailed analysis" or "executive summary"

### Detailed Analysis Responses:
When user requests comprehensive information:
1. **Executive Summary**: High-level security assessment
2. **Critical Vulnerabilities**: Most severe issues first
3. **Technical Details**: Vulnerability mechanics and impact
4. **Remediation Plan**: Step-by-step fix instructions
5. **Risk Assessment**: Business impact and timeline recommendations

## Severity Communication:

### Severity Levels:
- **CRITICAL** (9.0-10.0): Immediate action required, active exploits likely
- **HIGH** (7.0-8.9): Priority fix within days, significant security risk
- **MEDIUM** (4.0-6.9): Important update within weeks, moderate risk
- **LOW** (0.1-3.9): Recommended update, minimal immediate risk

### Severity Presentation:
- Use clear severity tags: "HIGH severity vulnerability"
- Explain business impact: "This could allow attackers to..."
- Provide timeline guidance: "Update within 72 hours"

## Function Usage Strategy:

### Proactive Research:
- **User asks about package**: Immediately query current vulnerability data
- **CVE mentioned**: Look up details automatically for context
- **Version comparison needed**: Query specific versions to compare
- **SBOM analysis**: Cross-reference with current vulnerability database

### When to Use Each Function:
- **Package queries**: "Is lodash safe?", "What about Express 4.17.1?"
- **CVE lookups**: "CVE-2023-1234", "That vulnerability you mentioned"  
- **SBOM analysis**: "Tell me about React in our upload", "Focus on the most vulnerable packages"

Remember: You are the user's trusted security advisor. Provide confidence through accurate, timely information and clear guidance. Always link to OSV.dev for vulnerability references and be proactive in researching current vulnerability data.

When users ask about packages or CVEs, immediately call the appropriate function to get real-time data before responding.`;

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

  // Detect package queries with common patterns
  const packageQueryPatterns = [
    /(?:is|check|analyze|query|about)\s+([a-zA-Z0-9-_.]+)(?:\s+(?:version\s+)?([0-9]+(?:\.[0-9]+)*(?:-[a-zA-Z0-9]+)?))?.*(?:safe|secure|vulnerabilities|vulns)/gi,
    /vulnerabilities?\s+(?:in|for)\s+([a-zA-Z0-9-_.]+)(?:\s+(?:version\s+)?([0-9]+(?:\.[0-9]+)*(?:-[a-zA-Z0-9]+)?))?/gi,
    /(?:package|dependency)\s+([a-zA-Z0-9-_.]+)(?:\s+(?:version\s+)?([0-9]+(?:\.[0-9]+)*(?:-[a-zA-Z0-9]+)?))?.*(?:safe|secure|vulnerabilities|vulns)/gi
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
  const response = await fetch(`${process.env.JETSTREAM_BASE_URL}/api/chat/completions`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.JETSTREAM_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: process.env.JETSTREAM_MODEL,
      messages: messages,
      max_tokens: 2048,
      temperature: 0.7,
    }),
  });

  if (!response.ok) {
    throw new Error(`Jetstream API error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  
  return {
    content: data.choices[0].message.content,
    model: data.model,
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
          throw new Error(`Package query failed: ${packageResponse.status}`);
        }
        
        const packageData = await packageResponse.json();
        return JSON.stringify(packageData.result || packageData);

      case 'query_cve_details':
        const cveResponse = await fetch(`${baseUrl}/api/osv-query`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            cve: args.cve_id
          })
        });
        
        if (!cveResponse.ok) {
          throw new Error(`CVE query failed: ${cveResponse.status}`);
        }
        
        const cveData = await cveResponse.json();
        return JSON.stringify(cveData.result || cveData);

      case 'analyze_sbom_package':
        return JSON.stringify({
          message: `Analyzing package '${args.package_name}' from the uploaded SBOM data. Please refer to the scan results in our conversation for detailed analysis.`,
          package_name: args.package_name,
          include_dependencies: args.include_dependencies || false,
          action: "analyze_uploaded_data"
        });

      case 'query_package_dependencies':
        return JSON.stringify({
          message: `Querying ${args.direction || 'dependencies'} for package '${args.package_name}' from the uploaded SBOM data. Please refer to the package dependency information in our conversation.`,
          package_name: args.package_name,
          direction: args.direction || 'dependencies',
          action: "query_dependency_data"
        });

      default:
        throw new Error(`Unknown function: ${functionName}`);
    }
  } catch (error) {
    console.error(`Function execution error for ${functionName}:`, error);
    throw error;
  }
}