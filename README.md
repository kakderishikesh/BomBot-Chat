# BomBot - Self-Hosted AI SBOM Security Analysis Platform

> **Next-Generation Security Analysis**  
> A hybrid-architecture full-stack security platform with **self-hosted Llama 3.2 1B AI** that provides instant vulnerability analysis, intelligent function calling, and comprehensive SBOM security assessment with complete data privacy.


## System Architecture

BomBot implements a **self-hosted AI architecture** with direct chat completions and intelligent function calling for comprehensive security analysis:

```
┌─────────────────────────────────────────────────────────────┐
│                 BomBot Self-Hosted Platform                 │
├─────────────────────────────────────────────────────────────┤
│  React UI (Vite)              Next.js API Routes     │
│  ├── ChatInterface.tsx           ├── /api/chat             │
│  ├── Direct AI Chat              ├── /api/upload           │
│  ├── ChatMessage.tsx             ├── /api/osv-query        │
│  ├── VulnerabilityCards          └── /api/run-status       │
│  └── Conversation History                                  │
├─────────────────────────────────────────────────────────────┤
│  AI Client Engine (src/lib/ai-client.ts)               │
│  ├── Function Call Detection     ├── Conversation Context  │
│  ├── Hybrid Provider Support     ├── Direct Responses     │
│  └── Manual Function Execution   └── Error Recovery       │
└─────────────────┬───────────────────────────────────────────┘
                  │
    ┌─────────────▼─────────────────────────────────────┐
    │          AI & Data Integrations                   │
    ├───────────────────────────────────────────────────┤
    │  Jetstream (Self-Hosted)   OSV.dev API      │
    │  ├── Llama 3.2-1B-Instruct    ├── Package Queries │
    │  ├── Direct Chat Completions  ├── CVE Lookups     │
    │  ├── Complete Data Privacy    └── Real-time Data  │
    │  └── Custom Prompting                             │
    │                                                   │
    │  OpenAI Fallback (Optional)                    │
    │  └── GPT-4 Compatibility                          │
    └───────────────────────────────────────────────────┘
```

## Advanced Features

### **Self-Hosted AI Architecture**
- **Direct Chat Completions**: Instant responses from your own Llama 3.2 model
- **Complete Data Privacy**: All AI processing stays on your infrastructure
- **Intelligent Function Calling**: Automatic package/CVE query detection and execution
- **Conversation Context**: Maintains chat history for better AI responses
- **Hybrid Provider Support**: Jetstream primary, OpenAI fallback capability

### **Intelligent Package Analysis**
- **Multi-Ecosystem Support**: npm, PyPI, Maven, Go, NuGet, RubyGems, Cargo, Composer, Hex, SwiftPM
- **Version-Specific Queries**: Precise vulnerability matching for specific package versions
- **Severity Intelligence**: CVSS score parsing to clean severity levels (CRITICAL/HIGH/MEDIUM/LOW)
- **CVE Cross-Reference**: Direct OSV.dev integration for authoritative vulnerability data

### **SBOM Processing Engine**
- **Multi-Format Support**: SPDX, CycloneDX, Generic JSON schemas
- **Batch Processing**: Concurrent vulnerability scanning with rate limiting
- **Dependency Mapping**: Package ecosystem detection from PURL and metadata
- **Scalable Architecture**: Handles up to 50 packages per SBOM (serverless optimization)

### **Advanced Chat System**
- **Direct Responses**: Immediate AI responses without polling or threads
- **Conversation History**: Smart context management for multi-turn conversations
- **Markdown Rendering**: Rich formatted responses with proper spacing
- **File Upload Integration**: Drag-and-drop SBOM processing with instant AI analysis

### **Smart Vulnerability Cards**
- **Interactive UI**: Clickable cards with direct OSV.dev links
- **Severity Visualization**: Color-coded badges with appropriate icons
- **Package Context**: Version-aware vulnerability attribution
- **Export Ready**: Structured data for reporting and integration

## Technical Implementation

### Frontend Architecture (React + TypeScript)

#### **Core Components**
```typescript
// ChatInterface.tsx - Main orchestration component
- File upload handling (drag-and-drop + file picker)
- Direct AI chat integration with conversation history
- Instant response handling (no polling required)
- Smart function call detection and execution

// AI Client (src/lib/ai-client.ts) - Unified AI interface
- Jetstream and OpenAI provider support
- Automatic function call detection for packages/CVEs
- Manual function execution for Llama 3.2
- Conversation context management

// ChatMessage.tsx - Dynamic message rendering
- Markdown rendering with syntax highlighting
- Vulnerability card generation from AI responses
- Copy-to-clipboard functionality
- Responsive design with accessibility

// VulnerabilityCard Component
- Interactive severity badges with color coding
- Direct OSV.dev linking (not NVD)
- Package version display with ecosystem info
- Description truncation with smart expansion
```

#### **State Management**
```typescript
// ChatContext.tsx - Centralized state with conversation history
interface ChatState {
  messages: Message[];
  conversationHistory: Array<{role: 'user' | 'assistant', content: string}>;
  isLoading: boolean;
  currentThreadId: string | null;
  uploadedFiles: UploadedFile[];
  userEmail: string | null;
}

interface Message {
  id: string;
  type: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  vulnerabilities?: Vulnerability[];
  useMarkdown?: boolean; // Controls rendering strategy
}
```

#### **Severity Processing Pipeline**
```typescript
// Enhanced severity extraction with multiple fallbacks
function extractSeverity(vuln: OSVVulnerability): string {
  // 1. CVSS v3 score parsing (primary)
  if (vuln.severity?.find(s => s.type === 'CVSS_V3')) {
    const score = parseFloat(cvssVector.split('/')[0]);
    return scoreToBracket(score); // 9.0+ = CRITICAL, 7.0+ = HIGH, etc.
  }
  
  // 2. Database-specific severity (GHSA, etc.)
  if (vuln.database_specific?.severity) {
    return vuln.database_specific.severity.toUpperCase();
  }
  
  // 3. Content analysis fallback
  return analyzeSeverityFromContent(vuln.summary, vuln.details);
}
```

### Backend Architecture (Next.js API)

#### **API Route Specifications**

##### `/api/upload` - SBOM Processing Pipeline
```typescript
interface UploadFlow {
  1. File validation (type, size, structure)
  2. Multi-format SBOM parsing (SPDX/CycloneDX/Generic)
  3. Package extraction with ecosystem mapping
  4. Batch OSV API queries (rate-limited)
  5. Vulnerability aggregation and severity normalization
  6. Direct AI analysis with structured SBOM data
  7. Instant AI response generation
  8. Conversation ID creation for follow-up chats
}

// Response includes AI analysis and structured data
interface UploadResponse {
  success: boolean;
  conversationId: string;
  aiResponse: string; // Direct AI analysis
  vulnerabilitiesFound: number;
  quickSummary: QuickSummaryData;
  dependencyGraph: DependencyGraph;
}
```

##### `/api/chat` - Direct AI Chat Completions
```typescript
interface ChatAPI {
  directResponses: boolean; // No polling required
  conversationHistory: Array<{role: string, content: string}>;
  functionCalling: {
    packageDetection: boolean; // Auto-detects package queries
    cveDetection: boolean;     // Auto-detects CVE mentions
    automaticExecution: boolean; // Executes OSV queries
  };
  
  providers: {
    jetstream: JetstreamConfig; // Primary self-hosted
    openai: OpenAIConfig;       // Fallback option
  };
}
```

##### `/api/osv-query` - Package Intelligence
```typescript
interface QueryCapabilities {
  packageQueries: {
    ecosystems: string[]; // 11 supported ecosystems
    versionSupport: boolean;
    realTimeData: boolean;
  };
  
  cveQueries: {
    directLookup: boolean;
    aliasResolution: boolean;
    affectedPackages: boolean;
  };
  
  // Simplified - no AI integration (handled by chat API)
  directDataReturn: boolean;
}
```

##### `/api/run-status` - Legacy Compatibility
```typescript
// Deprecated - kept for backward compatibility
interface CompatibilityEndpoint {
  status: 'deprecated';      // Always returns completed
  message: 'This endpoint is deprecated. Use /api/chat for direct responses.';
}
```

#### **Self-Hosted AI Integration**

##### **Function Call Detection**
```typescript
interface FunctionDetection {
  packageQueries: {
    patterns: RegExp[]; // Detects "Is X safe?", "check package Y"
    extraction: {
      packageName: string;
      version?: string;
      ecosystem: string; // Auto-detected or default npm
    };
  };
  
  cveQueries: {
    pattern: /CVE-\d{4}-\d{4,}/gi;
    directExecution: boolean; // Immediate OSV lookup
  };
}
```

##### **AI Client Configuration**
```typescript
interface AIClientConfig {
  provider: 'jetstream' | 'openai';
  jetstream: {
    baseUrl: string;        // Your Jetstream server
    apiKey: string;         // Authentication
    model: string;          // Llama model name
    temperature: 0.7;       // Balanced creativity
    max_tokens: 2048;       // Response length
  };
  openai: {
    model: "gpt-4";
    temperature: 0.1;       // High consistency for security
    max_tokens: 2048;
  };
  systemPrompt: string;     // From Instruction Prompt.md
}
```

## Configuration & Deployment

### Environment Variables
```bash
# AI Provider Configuration (Choose One)
MODEL_PROVIDER=jetstream               # Use 'jetstream' or 'openai'

# Jetstream Configuration (Self-Hosted Llama)
JETSTREAM_API_KEY=sk-xxxxx            # Your Jetstream API key
JETSTREAM_BASE_URL=http://server:8080  # Your Jetstream server URL  
JETSTREAM_MODEL=meta-llama/Llama-3.2-1B-Instruct

# OpenAI Configuration (Fallback)
OPENAI_API_KEY=sk-proj-xxxxx          # OpenAI API access (optional)
# Database Configuration (Required)
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJxxx
SUPABASE_SERVICE_ROLE_KEY=eyJxxx

# Optional - Development
OSV_SCANNER_PATH=/usr/local/bin/osv-scanner  # Local binary path
NODE_ENV=production                     # Runtime environment
```

### Self-Hosted AI Setup

Your **Llama 3.2-1B-Instruct** model is configured with the comprehensive system prompt from `Instruction Prompt.md`, providing:

```yaml
AI Configuration:
  model: "meta-llama/Llama-3.2-1B-Instruct"
  provider: "jetstream" 
  temperature: 0.7
  max_tokens: 2048
  
Core Capabilities:
  1. Real-time vulnerability research using OSV.dev database
  2. Intelligent function call detection (packages/CVEs)
  3. Manual function execution for Llama compatibility
  4. Comprehensive security analysis with business impact
  5. Conversation context preservation across messages
  
Data Privacy:
  - All AI processing on your infrastructure
  - No external API calls for chat completions
  - Complete control over model behavior
  - Custom fine-tuning possible
  
Function Detection:
  - Package queries: "Is lodash safe?", "check express 4.17.1"
  - CVE queries: "Tell me about CVE-2023-1234"
  - Automatic OSV API integration
  - Instant response delivery (no polling)

Fallback Support:
  - OpenAI GPT-4 available if needed
  - Seamless provider switching
  - Same function calling capabilities
```

## Performance Metrics

### Bundle Analysis
```
Production Build:
├── UI Assets
│   ├── JavaScript: 520KB → 163KB gzipped (-69%)
│   ├── CSS: 90KB → 14KB gzipped (-84%)
│   └── Total: 177KB gzipped (optimized for features)
│
├── API Routes
│   ├── Shared Runtime: 85KB (includes AI client)
│   ├── Cold Start: <2s on Vercel
│   └── Memory Usage: ~140MB per function
│
└── Dependencies
    ├── React/UI: ~40KB gzipped
    ├── AI Client: ~25KB gzipped (hybrid support)
    ├── Form Processing: ~25KB gzipped
    └── Markdown Rendering: ~20KB gzipped
```

### Runtime Performance
```
Response Times (95th percentile):
├── Package Queries: <500ms (OSV API latency)
├── SBOM Processing: 2-8s (size dependent)
├── AI Chat Responses: 1-5s (direct completion)
├── Function Calls: <2s (OSV API + AI processing)
└── UI Interactions: <100ms (client-side)

Scalability Limits:
├── File Size: 10MB (Vercel function limit)
├── SBOM Packages: 150 (rate limiting optimization)
├── Concurrent Users: Unlimited (serverless)
├── Jetstream: Your server capacity dependent
├── AI Rate Limits: Self-hosted = no limits
└── Context Window: ~4,000 tokens (automatic management)
```

## Usage Patterns

### Enterprise SBOM Analysis
```typescript
// Typical enterprise workflow
1. Upload company SBOM file (SPDX/CycloneDX)
2. Receive instant vulnerability summary with priority rankings
3. Review interactive vulnerability cards with OSV.dev links
4. Ask AI: "What should we prioritize for our next sprint?"
5. Get detailed remediation plan with business impact assessment
6. Export findings for security team review
```

### Developer Package Research
```typescript
// Developer security research workflow  
1. Query specific package: "Is express 4.17.1 safe?"
2. Get immediate vulnerability status with severity badges
3. Ask follow-up: "What about the latest version?"
4. Receive comparative analysis with upgrade recommendations
5. Deep-dive: "Give me detailed analysis of these vulnerabilities"
6. Get technical implementation guidance
```

## **Context Window Management**

Your self-hosted **Llama 3.2-1B-Instruct** model has a context window limit (~4,000 tokens) that ensures optimal performance but requires conversation management for extended sessions.

### **Understanding Context Limits**

```typescript
Context Window Breakdown:
├── System Prompt: ~400 tokens (BomBot instructions)
├── Conversation History: Variable (grows with each message)
├── Current Message: ~50-200 tokens
└── Response Generation: ~200-800 tokens

Typical Limits:
├── Short messages: ~40 exchanges before limit
├── SBOM discussions: ~15-25 exchanges before limit  
├── Technical conversations: ~20-30 exchanges before limit
└── File upload conversations: ~10-20 exchanges before limit
```

### **Automatic Context Management**

BomBot **automatically detects** when approaching context limits and provides user-friendly guidance:

**For Chat Messages:**
```
Context Limit Reached

I've reached my conversation memory limit! Our chat has gotten quite long 
and I need to start fresh to continue helping you effectively.

What to do next:
- Click the "✚ New Chat" button to start a fresh conversation
- I'll be ready to help with your security analysis questions
- You can re-upload any SBOM files if needed

Don't worry - starting fresh won't affect my ability to help you!
```

**For SBOM Uploads:**
```
SBOM Analysis Complete - Context Limit Reached

I've successfully scanned your SBOM file and found vulnerabilities, 
but our conversation has gotten quite long.

Please start a new chat and re-upload this SBOM file for comprehensive 
AI-powered security insights.

Current scan results are ready - you can still see the vulnerability data!
```

### **Smart User Experience**

When context limits are reached:
**Friendly messaging**: No technical errors, clear guidance  
**Visual hints**: "✚ New Chat" button pulses and auto-scrolls into view  
**Data preservation**: SBOM scan results remain visible  
**Instant recovery**: One click to start fresh conversation  
**Full functionality**: All features work immediately in new chat  

### **Best Practices for Long Sessions**

```typescript
Conversation Management Tips:
├── Regular breaks: Start new chat every 20-30 exchanges
├── Topic separation: New chat for different SBOM files  
├── Complex analysis: Break into focused conversations
└── Multi-file analysis: Upload files in separate chats for detailed comparison

Optimal Workflow:
1. Upload SBOM → Get analysis → Ask follow-up questions
2. When context limit reached → Start new chat
3. Re-upload same SBOM → Continue with fresh context
4. Repeat for additional files or in-depth analysis
```

### **Technical Implementation**

```typescript
// Context limit detection and handling
Token Estimation: ~4 characters per token
Limit Threshold: 4,000 tokens (conservative)
Error Handling: CONTEXT_LIMIT_EXCEEDED
User Response: Friendly guidance + UI hints
Recovery: Immediate new chat capability

// Monitoring in logs
Console Output:
├── Token estimation before each request
├── Context limit warnings when approaching
├── Graceful fallback messages
└── UI hint activation status
```

### **Why This Approach Works**

**Advantages over complex context management:**
- **Reliable**: No risk of losing important context through truncation
- **Predictable**: Users always know when they need to restart  
- **Simple**: One-click recovery without confusion
- **Effective**: Fresh context often provides better analysis
- **Transparent**: Clear communication about limitations

**Perfect for security workflows:**
- Each SBOM analysis gets full AI attention
- No risk of mixed context between different files
- Clear separation between different security assessments
- Optimal performance maintained throughout session

## Development Workflow

### Local Development Setup
```bash
# Complete development environment
git clone https://github.com/kakderishikesh/BomBot-Chat.git
cd BomBot-Chat

# Install dependencies
npm install

# Environment setup
cp .env.example .env
# Configure your AI provider:
# For Jetstream: MODEL_PROVIDER, JETSTREAM_API_KEY, etc.
# For OpenAI: OPENAI_API_KEY (fallback)

# Optional: Install OSV Scanner locally
brew install osv-scanner  # macOS

# Start development servers
npm run dev          # Full-stack development (recommended)
```

### Development Commands
```bash
# Development
npm run dev          # Full-stack with hot reload
npm run dev:ui       # UI development server only

# Building
npm run build        # Production build (UI + API)
npm run build:ui     # UI build only
npm run build:api    # API build only

# Quality Assurance
npm run type-check   # TypeScript validation
npm run lint         # Code quality checks
```

## Security Features

### Data Handling
```typescript
Security Measures:
├── File Processing
│   ├── Temporary file creation in isolated containers
│   ├── Automatic cleanup after processing
│   ├── Size and type validation (10MB limit)
│   └── No persistent storage of uploaded content
│
├── API Security  
│   ├── Environment variable encryption (Vercel)
│   ├── No API key exposure to client
│   ├── Request validation and sanitization
│   └── Rate limiting on OSV API calls
│
├── OpenAI Integration
│   ├── Isolated thread creation per session
│   ├── Function call validation
│   └── Response content filtering
│
└── Client-Side Security
    ├── Secure API communication (HTTPS)
    ├── Input validation on all forms
    └── XSS protection via React's built-in escaping
```

## Key Features Summary

### **Current Capabilities**
- **Hybrid Response System**: Instant templated responses + AI deep analysis
- **Multi-Format SBOM Support**: SPDX, CycloneDX, Generic JSON
- **11 Package Ecosystems**: npm, PyPI, Maven, Go, NuGet, RubyGems, etc.
- **Real-time OSV.dev Integration**: Authoritative vulnerability data
- **Clean Severity Tags**: CRITICAL/HIGH/MEDIUM/LOW (not CVSS vectors)
- **Interactive Vulnerability Cards**: Clickable, exportable, OSV.dev linked
- **Persistent AI Conversations**: Thread-based context preservation
- **Markdown Rich Responses**: Properly formatted AI analysis
- **Drag-and-Drop File Upload**: 10MB limit with progress tracking
- **Silent Polling**: No timeout interruptions for better UX

### **Technical Stack**
- **Frontend**: React 18 + TypeScript + Vite + TailwindCSS + Radix UI
- **Backend**: Next.js 14 + TypeScript + OpenAI API + OSV.dev API
- **Deployment**: Vercel Serverless with optimized build pipeline
- **AI**: GPT-4 Turbo with custom security analyst assistant
- **State Management**: React Context with custom hooks
- **File Processing**: Multi-format parsing with batch vulnerability scanning

---

## Quick Start

1. **Deploy**: Use Vercel or similar platform for deployment
2. **Configure**: Add `OPENAI_API_KEY` and `ASSISTANT_ID` to Vercel environment
3. **Use**: Upload SBOM files and start chatting with your AI security expert!

---

## License

This project is licensed under the **Mozilla Public License 2.0** - see the [LICENSE](LICENSE) file for details.

### Key License Features:
- **Open Source**: Free to use, modify, and distribute
- **Copyleft**: Modifications must be shared under the same license
- **Patent Protection**: Includes patent licensing provisions
- **Commercial Use**: Allowed with proper attribution
- **Compatible**: Works with many other open source licenses

For more information about MPL-2.0, visit: https://mozilla.org/MPL/2.0/

---

*Last Updated: July 2025 | Version: 2.0.0 | Build: d1bfa0a*
