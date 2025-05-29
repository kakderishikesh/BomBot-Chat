# 🤖 BomBot - AI-Powered SBOM Security Scanner

A unified full-stack application that combines an intuitive React UI with a powerful Next.js API to provide AI-powered analysis of Software Bill of Materials (SBOM) files for security vulnerabilities.

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/your-username/bombot-chat)

## ✨ Features

### 🎨 **Modern Web Interface**
- **Drag & Drop File Upload**: Upload SBOM files with real-time progress tracking
- **Interactive Chat Interface**: Chat with AI assistant about vulnerabilities
- **Package Search**: Query specific packages and versions for vulnerabilities
- **Real-time Updates**: Live polling for AI assistant responses
- **Responsive Design**: Beautiful UI built with Radix UI and TailwindCSS

### 🔧 **Powerful Backend**
- **SBOM File Processing**: Comprehensive scanning using osv-scanner
- **AI Assistant Integration**: OpenAI Assistant provides intelligent security insights
- **Vulnerability Database**: Real-time queries to OSV vulnerability database
- **Thread Management**: Persistent chat conversations with context
- **Serverless Architecture**: Scalable deployment on Vercel

### 🛡️ **Security & Compliance**
- **Secure File Handling**: Temporary file processing with automatic cleanup
- **No API Key Exposure**: Comprehensive security audit completed
- **Input Validation**: File type and size validation (10MB limit)
- **Environment Variable Security**: All sensitive data properly secured

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────┐
│                 BomBot Full-Stack                   │
├─────────────────────────────────────────────────────┤
│  🎨 React UI (Vite)        🔧 Next.js API          │
│  ├── File Upload           ├── /api/upload          │
│  ├── Chat Interface        ├── /api/osv-query       │
│  ├── Package Search        ├── /api/run-status      │
│  └── Real-time Updates     └── Thread Management    │
└─────────────────┬───────────────────────────────────┘
                  │
    ┌─────────────▼─────────────┐
    │     External Services     │
    ├───────────────────────────┤
    │  🤖 OpenAI Assistant      │
    │  📊 OSV Database          │
    │  🔍 osv-scanner           │
    └───────────────────────────┘
```

## 🚀 Quick Start

### 1. **Deploy to Vercel (Recommended)**

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone)

**Manual Deployment:**
```bash
# Clone and deploy
git clone <your-repo-url>
cd BomBot-Chat
npm install
vercel --prod
```

### 2. **Set Environment Variables**

In Vercel Dashboard → Settings → Environment Variables:

```env
OPENAI_API_KEY=sk-proj-your-openai-api-key-here
ASSISTANT_ID=asst_your-assistant-id-here
```

### 3. **Access Your Application**

Visit your Vercel URL to start using BomBot! 🎉

## 💻 Local Development

### Prerequisites
- Node.js 18+ 
- npm or yarn
- OpenAI API key
- OpenAI Assistant ID

### Setup

```bash
# Clone repository
git clone <your-repo-url>
cd BomBot-Chat

# Install dependencies
npm install

# Create environment file
cp .env.example .env
# Add your OPENAI_API_KEY and ASSISTANT_ID

# Install OSV Scanner (for local development)
brew install osv-scanner  # macOS
# or
curl -L https://github.com/google/osv-scanner/releases/latest/download/osv-scanner-linux-amd64 -o /usr/local/bin/osv-scanner && chmod +x /usr/local/bin/osv-scanner  # Linux

# Start development servers
npm run dev          # Full-stack with Vercel CLI
# or
npm run dev:ui       # UI only (http://localhost:5173)
```

### Build Commands

```bash
# Development
npm run dev          # Full-stack development server
npm run dev:ui       # UI development server only

# Production
npm run build        # Build both UI and API
npm run start        # Start production server
npm run preview      # Preview UI build

# Utilities
npm run type-check   # TypeScript type checking
npm run lint         # Code linting
```

## 🏗️ Project Structure

```
BomBot-Chat/
├── 🎨 Frontend (React + Vite)
│   ├── src/
│   │   ├── components/     # UI components
│   │   ├── contexts/       # React contexts (Chat, Theme)
│   │   ├── hooks/          # Custom React hooks
│   │   ├── lib/            # Utilities and API clients
│   │   └── types/          # TypeScript type definitions
│   ├── public/             # Static assets
│   └── index.html          # Entry point
│
├── 🔧 Backend (Next.js API)
│   ├── pages/api/
│   │   ├── upload.ts       # SBOM upload & scanning
│   │   ├── osv-query.ts    # Package/CVE queries
│   │   └── run-status.ts   # AI assistant status
│   └── lib/                # Server utilities
│
├── 📦 Build & Config
│   ├── scripts/build.js    # Unified build script
│   ├── package.json        # Dependencies & scripts
│   ├── tsconfig.json       # TypeScript config
│   ├── vercel.json         # Deployment config
│   └── next.config.cjs     # Next.js config
│
└── 📚 Documentation
    ├── README.md           # This file
    ├── DEPLOYMENT.md       # Deployment guide
    └── .env.example        # Environment template
```

## 🔌 API Endpoints

### 📤 **File Upload & Scanning**
```bash
POST /api/upload
Content-Type: multipart/form-data

# Upload SBOM file with optional thread ID for existing conversation
curl -X POST \
  -F "file=@sbom.json" \
  -F "threadId=thread_abc123" \
  https://your-app.vercel.app/api/upload
```

**Response:**
```json
{
  "success": true,
  "runId": "run_xyz789",
  "threadId": "thread_abc123",
  "fileName": "sbom.json",
  "vulnerabilitiesFound": 12
}
```

### 🔍 **Package Vulnerability Query**
```bash
POST /api/osv-query
Content-Type: application/json

# Query specific package vulnerabilities
curl -X POST \
  -H "Content-Type: application/json" \
  -d '{
    "name": "lodash",
    "ecosystem": "npm", 
    "version": "4.17.20",
    "threadId": "thread_abc123"
  }' \
  https://your-app.vercel.app/api/osv-query
```

### 📊 **Assistant Status Polling**
```bash
GET /api/run-status?threadId=thread_abc123&runId=run_xyz789

# Check if AI assistant has completed analysis
curl "https://your-app.vercel.app/api/run-status?threadId=thread_abc123&runId=run_xyz789"
```

## 🤖 OpenAI Assistant Setup

### 1. Create Assistant
Visit [OpenAI Platform → Assistants](https://platform.openai.com/assistants)

### 2. Assistant Configuration
```
Name: BomBot Security Analyst
Model: gpt-4-turbo-preview

Instructions:
You are a cybersecurity expert specializing in SBOM (Software Bill of Materials) analysis and vulnerability assessment. Your role is to:

1. Analyze vulnerability scan results from osv-scanner and provide clear, actionable security insights
2. Explain the severity and impact of discovered vulnerabilities in plain language  
3. Provide specific remediation steps and recommendations
4. Answer questions about specific packages, versions, and CVEs
5. Help users prioritize vulnerability fixes based on risk levels
6. Maintain conversation context across multiple queries in the same thread

Always provide practical, actionable advice and explain technical concepts in an accessible way. Use emojis and formatting to make responses engaging and easy to read.
```

### 3. Copy Assistant ID
Save the Assistant ID (starts with `asst_`) to your environment variables.

## 📋 Supported File Formats

- **SPDX**: .spdx, .json, .xml, .yaml
- **CycloneDX**: .json, .xml
- **SWID Tags**: .json, .xml
- **Generic SBOM**: .json format
- **Maximum file size**: 10MB

## 🧪 Testing Your Deployment

### UI Testing
```bash
# Access the web interface
open https://your-app.vercel.app

# Test file upload through UI
# Test package search functionality  
# Test chat interaction with AI assistant
```

### API Testing
```bash
# Test file upload
curl -X POST \
  -F "file=@test-sbom.json" \
  https://your-app.vercel.app/api/upload

# Test package query
curl -X POST \
  -H "Content-Type: application/json" \
  -d '{"name": "express", "ecosystem": "npm"}' \
  https://your-app.vercel.app/api/osv-query

# Test status endpoint
curl "https://your-app.vercel.app/api/run-status?threadId=thread_123&runId=run_456"
```

## 🎯 Use Cases

### 🏢 **Enterprise Security Teams**
- Upload company SBOMs for comprehensive vulnerability analysis
- Get AI-powered prioritization of security fixes
- Maintain conversation history for audit trails

### 👨‍💻 **Developers**
- Quick package vulnerability checks during development
- Understand security implications of dependencies
- Get actionable remediation guidance

### 🔒 **Security Researchers**
- Analyze open source project vulnerabilities
- Research CVE details and impact assessments
- Bulk SBOM processing for security studies

## 🔧 Technologies Used

### Frontend
- **React 18** - UI framework
- **TypeScript** - Type safety
- **Vite** - Build tool and dev server
- **TailwindCSS** - Utility-first styling
- **Radix UI** - Accessible component primitives
- **React Router** - Client-side routing
- **React Hook Form** - Form management

### Backend  
- **Next.js 14** - API framework
- **TypeScript** - Type safety
- **OpenAI API** - AI assistant integration
- **osv-scanner** - Vulnerability scanning
- **Formidable** - File upload handling

### Deployment
- **Vercel** - Serverless hosting platform
- **Node.js 18+** - Runtime environment

## 🚀 Performance

### Build Optimization
- **UI Bundle**: ~399kB JS (126kB gzipped)
- **CSS**: ~68kB (12kB gzipped)  
- **API**: 3 endpoints, ~79.7kB shared JS
- **Caching**: 1-year cache for static assets

### Runtime Performance
- **Cold start**: <2s on Vercel
- **File processing**: <10s for typical SBOMs
- **AI responses**: 5-30s depending on complexity
- **Real-time polling**: 2s intervals for status updates

## 🤝 Contributing

We welcome contributions! Please see our contributing guidelines:

1. **Fork** the repository
2. **Create** a feature branch: `git checkout -b feature/amazing-feature`
3. **Make** your changes with proper TypeScript types
4. **Test** both UI and API functionality
5. **Commit** with descriptive messages
6. **Push** to your branch: `git push origin feature/amazing-feature` 
7. **Submit** a pull request

### Development Guidelines
- Follow existing code style and TypeScript conventions
- Add tests for new functionality
- Update documentation for API changes
- Ensure both UI and API builds pass

## 🙋‍♂️ Support & Community

### Getting Help
- 📖 **Documentation**: Check [DEPLOYMENT.md](DEPLOYMENT.md) for deployment details
- 🐛 **Issues**: Report bugs on [GitHub Issues](https://github.com/your-username/bombot-chat/issues)
- 💬 **Discussions**: Join conversations in [GitHub Discussions](https://github.com/your-username/bombot-chat/discussions)

### External Resources
- [OSV Scanner Documentation](https://github.com/google/osv-scanner)
- [OpenAI API Documentation](https://platform.openai.com/docs)
- [Vercel Deployment Guide](https://vercel.com/docs)

---

## 🎉 Ready to Secure Your Software Supply Chain?

**Deploy BomBot today and start getting AI-powered security insights for your SBOMs!**

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone)

---

*Built with ❤️ for software supply chain security*
