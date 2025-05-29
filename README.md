# BomBot - SBOM Vulnerability Scanner Backend

A serverless Vercel backend that provides AI-powered analysis of Software Bill of Materials (SBOM) files for security vulnerabilities using the OSV database.

## Features

- 📤 **SBOM File Upload & Scanning**: Upload SBOM files and get vulnerability analysis using osv-scanner
- 🔍 **Package Vulnerability Lookup**: Query specific packages and versions for known vulnerabilities
- 🆔 **CVE Information**: Get detailed information about specific CVEs
- 🤖 **AI Assistant Integration**: OpenAI Assistant interprets scan results and provides actionable insights
- ⚡ **Serverless**: Deployed on Vercel for scalability and performance
- 🔒 **Secure**: No API key exposure in logs or error messages

## Project Structure

```
BomBot-Chat/
├── pages/api/
│   ├── upload.ts      # Main SBOM upload & scanning endpoint
│   ├── osv-query.ts   # Package/CVE query endpoint  
│   └── run-status.ts  # Assistant run status checker
├── package.json       # Dependencies and scripts
├── tsconfig.json      # TypeScript configuration
├── vercel.json        # Vercel deployment config
├── README.md          # This file
├── env.example        # Environment variables template
└── .gitignore         # Git ignore rules
```

## API Endpoints

### 1. Upload & Scan SBOM (`POST /api/upload`)

Upload an SBOM file for vulnerability scanning with AI analysis:

```bash
curl -X POST \
  -F "file=@your-sbom.json" \
  https://your-app.vercel.app/api/upload
```

**Response:**
```json
{
  "success": true,
  "runId": "run_abc123",
  "threadId": "thread_xyz789",
  "fileName": "your-sbom.json",
  "vulnerabilitiesFound": 5
}
```

### 2. Query Package Vulnerabilities (`POST /api/osv-query`)

Query vulnerabilities for a specific package:

```bash
curl -X POST \
  -H "Content-Type: application/json" \
  -d '{
    "name": "lodash",
    "ecosystem": "npm",
    "version": "4.17.20",
    "threadId": "thread_xyz789"
  }' \
  https://your-app.vercel.app/api/osv-query
```

### 3. Query CVE Information (`POST /api/osv-query`)

Get details about a specific CVE:

```bash
curl -X POST \
  -H "Content-Type: application/json" \
  -d '{
    "cve": "CVE-2023-1234",
    "threadId": "thread_xyz789"
  }' \
  https://your-app.vercel.app/api/osv-query
```

### 4. Check Run Status (`GET /api/run-status`)

Check the status of an AI assistant run:

```bash
curl "https://your-app.vercel.app/api/run-status?threadId=thread_xyz789&runId=run_abc123"
```

## Quick Deploy to Vercel

### 1. Prerequisites

- [Vercel Account](https://vercel.com)
- [OpenAI API Key](https://platform.openai.com/api-keys)
- OpenAI Assistant ID (see setup below)

### 2. Deploy

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone)

Or manually:

```bash
# Clone the repository
git clone <your-repo-url>
cd BomBot-Chat

# Install Vercel CLI
npm i -g vercel

# Deploy to Vercel
vercel --prod
```

### 3. Set Environment Variables

In your Vercel Dashboard → Project → Settings → Environment Variables, add:

```
OPENAI_API_KEY=sk-proj-your-openai-api-key-here
ASSISTANT_ID=asst_your-assistant-id-here
```

> **Note**: OSV Scanner is automatically available in Vercel's environment - no additional setup needed!

## Local Development

### 1. Install Dependencies

```bash
npm install
```

### 2. Environment Setup

Create `.env` file (copy from `env.example`):

```env
OPENAI_API_KEY=sk-proj-your-openai-api-key-here
ASSISTANT_ID=asst_your-assistant-id-here
OSV_SCANNER_PATH=/opt/homebrew/bin/osv-scanner
```

### 3. Install OSV Scanner (Local Only)

#### macOS (Homebrew):
```bash
brew install osv-scanner
```

#### Linux:
```bash
curl -L https://github.com/google/osv-scanner/releases/latest/download/osv-scanner-linux-amd64 -o /usr/local/bin/osv-scanner
chmod +x /usr/local/bin/osv-scanner
```

### 4. Run Development Server

```bash
# Using Vercel CLI (recommended)
npx vercel dev

# Or using Next.js
npm run dev
```

## OpenAI Assistant Setup

### 1. Create Assistant

Go to [OpenAI Platform → Assistants](https://platform.openai.com/assistants) and create a new assistant.

### 2. Assistant Instructions

```
You are a cybersecurity expert specializing in SBOM (Software Bill of Materials) analysis and vulnerability assessment. Your role is to:

1. Analyze vulnerability scan results from osv-scanner and provide clear, actionable security insights
2. Explain the severity and impact of discovered vulnerabilities in plain language
3. Provide specific remediation steps and recommendations
4. Answer questions about specific packages, versions, and CVEs
5. Help users prioritize vulnerability fixes based on risk levels

Always provide practical, actionable advice and explain technical concepts in an accessible way.
```

### 3. Get Assistant ID

Copy the Assistant ID (starts with `asst_`) and add it to your environment variables.

## Supported SBOM Formats

- **SPDX** (.spdx, .json, .xml)
- **CycloneDX** (.json, .xml)
- **SWID** tags
- Generic JSON SBOM files

## Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │───▶│  Vercel APIs    │───▶│  OSV Database   │
│   (Upload UI)   │    │                 │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                              │
                              ▼
                       ┌─────────────────┐
                       │  OpenAI         │
                       │  Assistant      │
                       └─────────────────┘
```

## Security Features

- ✅ **No API Key Exposure**: Comprehensive audit ensures no accidental logging of sensitive data
- ✅ **Secure File Handling**: Files are temporarily stored and immediately deleted after scanning
- ✅ **Input Validation**: File type and size validation for SBOM uploads (10MB limit)
- ✅ **Environment Variables**: All sensitive data stored securely in environment variables
- ✅ **Rate Limiting**: Protected by Vercel's built-in rate limiting

## Error Handling

The API provides detailed error responses:

```json
{
  "error": "Failed to scan SBOM file",
  "details": "osv-scanner failed with code 1: invalid file format"
}
```

## Testing

Test your deployment:

```bash
# Test file upload
curl -X POST \
  -F "file=@your-sbom.json" \
  https://your-app.vercel.app/api/upload

# Test package query
curl -X POST \
  -H "Content-Type: application/json" \
  -d '{"name": "lodash", "ecosystem": "npm"}' \
  https://your-app.vercel.app/api/osv-query
```

## Technologies Used

- **Next.js** - API routes framework
- **TypeScript** - Type safety
- **Vercel** - Serverless deployment platform
- **OpenAI API** - AI assistant integration
- **OSV Database** - Vulnerability data source
- **osv-scanner** - Vulnerability scanning tool

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Make your changes
4. Test thoroughly
5. Commit: `git commit -m 'Add amazing feature'`
6. Push: `git push origin feature/amazing-feature`
7. Submit a pull request

## License

MIT License - see LICENSE file for details

## Support

For issues and questions:
- Create an issue on GitHub
- Check the [OSV Scanner documentation](https://github.com/google/osv-scanner)
- Review [OpenAI API documentation](https://platform.openai.com/docs)

---

**Built with ❤️ for SBOM security analysis**
