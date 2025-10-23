# BomBot Full-Stack Deployment Guide

This guide covers deploying the **complete BomBot application** (UI + API) as a unified full-stack application.

## Overview

BomBot is now configured as a **unified full-stack application** that includes:
- **Frontend**: React UI built with Vite (TypeScript, TailwindCSS, Radix UI)
- **Backend**: Next.js API with OpenAI integration and OSV vulnerability scanning
- **Integration**: AI assistant with thread management and real-time polling

## Build Process

The application uses an integrated build system that:
1. **Builds UI** with Vite (`npm run build:ui`)
2. **Copies UI assets** to Next.js public folder
3. **Builds API** with Next.js (`npm run build:api`)
4. **Serves everything** through Next.js with proper routing

### Build Commands
```bash
# Development
npm run dev          # Full-stack dev with Vercel
npm run dev:ui       # UI only (Vite dev server)

# Production Build
npm run build        # Unified build (UI + API)
npm run start        # Production server
```

## Vercel Deployment (Recommended)

### 1. Repository Setup
```bash
# Ensure your repo is ready
git add .
git commit -m "Ready for unified deployment"
git push origin main
```

### 2. Vercel Configuration
The project includes `vercel.json` with optimized settings:

```json
{
  "framework": "nextjs",
  "buildCommand": "npm run build",
  "installCommand": "npm install",
  "outputDirectory": ".next"
}
```

### 3. Environment Variables
Set these in your Vercel dashboard:

**Required:**
- `OPENAI_API_KEY` - Your OpenAI API key
- `ASSISTANT_ID` - Your OpenAI Assistant ID

**Optional:**
- `OSV_SCANNER_PATH` - Path to OSV scanner binary (uses npm package if not set)

### 4. Deploy to Vercel

#### Option A: Vercel CLI
```bash
# Install Vercel CLI
npm i -g vercel

# Login and deploy
vercel login
vercel --prod
```

#### Option B: Vercel Dashboard
1. Go to [vercel.com](https://vercel.com)
2. Import your GitHub/GitLab repository
3. Framework: **Next.js** (auto-detected)
4. Build Command: `npm run build`
5. Install Command: `npm install`
6. Add environment variables
7. Deploy!

### 5. Deployment URL Structure
```
https://your-app.vercel.app/
├── /                    # React UI (main app)
├── /api/upload          # File upload endpoint
├── /api/osv-query       # Package vulnerability query
├── /api/run-status      # AI assistant status polling
└── /assets/*            # Static UI assets
```

## Alternative Deployments

### Netlify
```bash
# Build command
npm run build

# Publish directory
.next

# Environment variables (same as Vercel)
OPENAI_API_KEY=your_key
ASSISTANT_ID=your_id
```

### Railway
```bash
# Dockerfile (if needed)
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

### Self-Hosted (PM2)
```bash
# Install PM2
npm install -g pm2

# Build and start
npm run build
pm2 start npm --name "bombot" -- start
pm2 save
pm2 startup
```

## Local Production Testing

Test the production build locally:

```bash
# Build for production
npm run build

# Start production server
npm start

# Visit http://localhost:3000
```

## Build Output Analysis

**UI Build (Vite):**
- Main bundle: ~399kB JS (126kB gzipped)
- CSS: ~68kB (12kB gzipped)
- Assets: Properly hashed for caching

**API Build (Next.js):**
- 3 API endpoints (~79.7kB shared JS)
- Static optimization enabled
- Production-ready routing

## Health Checks

After deployment, verify these endpoints:

```bash
# UI Health
curl https://your-app.vercel.app/

# API Health
curl https://your-app.vercel.app/api/upload
curl https://your-app.vercel.app/api/osv-query
curl https://your-app.vercel.app/api/run-status
```

## Troubleshooting

### Build Issues
```bash
# Clear cache and rebuild
rm -rf .next dist node_modules/.cache
npm install
npm run build
```

### Environment Issues
- Ensure all required environment variables are set
- Check Vercel function logs for API errors
- Verify OpenAI API key permissions

### Static File Issues
- Check that `public/dist/` contains UI files after build
- Verify Next.js routing in `next.config.cjs`

## Performance Optimizations

The deployment includes:
- **Static caching** for UI assets (1 year cache)
- **Next.js optimizations** (static generation, code splitting)
- **Vite optimizations** (tree shaking, minification)
- **Proper routing** (SPA behavior for UI, API routing)

## Security Considerations

- Environment variables are secure in Vercel
- No sensitive data in client bundle
- API endpoints are properly isolated
- File uploads are validated and scanned

---

## Success!

Your BomBot application is now deployed as a **unified full-stack application** with:
- React UI accessible at root URL
- Next.js API endpoints at `/api/*`
- AI assistant with thread management
- File upload and SBOM scanning
- Package vulnerability queries
- Production-optimized builds

**Live Demo Structure:**
```
https://your-bombot-app.vercel.app
├── Modern React UI (Vite-built)
├── AI Assistant Chat
├── File Upload & SBOM Scanning  
├── Package Vulnerability Search
└── Real-time Security Analysis
``` 