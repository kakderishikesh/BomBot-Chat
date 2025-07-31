# BomBot Full-Stack Deployment Guide

This guide covers deploying the **complete BomBot application** (UI + API) as a unified full-stack application with **self-hosted AI capability**.

## 📋 Overview

BomBot is now configured as a **unified full-stack application** that includes:
- **Frontend**: React UI built with Vite (TypeScript, TailwindCSS, Radix UI)
- **Backend**: Next.js API with hybrid AI integration (Jetstream + OpenAI fallback)
- **AI Integration**: Direct chat completions with self-hosted Llama 3.2 or OpenAI GPT-4
- **Security**: Real-time OSV vulnerability scanning with intelligent function calling

## 🏗️ Build Process

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

## 🌐 Vercel Deployment (Recommended)

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

**AI Configuration (Choose One):**

**Option A: Jetstream (Self-Hosted Llama)**
- `MODEL_PROVIDER=jetstream`
- `JETSTREAM_API_KEY` - Your Jetstream API key
- `JETSTREAM_BASE_URL` - Your Jetstream server URL (e.g., http://your-server:8080)
- `JETSTREAM_MODEL` - Model name (e.g., meta-llama/Llama-3.2-1B-Instruct)

**Option B: OpenAI (Fallback)**
- `MODEL_PROVIDER=openai`
- `OPENAI_API_KEY` - Your OpenAI API key

**Database (Required):**
- `NEXT_PUBLIC_SUPABASE_URL` - Your Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Your Supabase anon key
- `SUPABASE_SERVICE_ROLE_KEY` - Your Supabase service role key

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
├── /api/chat            # AI chat completion endpoint
├── /api/upload          # SBOM file upload endpoint
├── /api/osv-query       # Package vulnerability query
├── /api/run-status      # Legacy compatibility endpoint
└── /assets/*            # Static UI assets
```

## 🔧 Alternative Deployments

### Netlify
```bash
# Build command
npm run build

# Publish directory
.next

# Environment variables (choose AI provider)
MODEL_PROVIDER=jetstream
JETSTREAM_API_KEY=your_key
JETSTREAM_BASE_URL=http://your-server:8080
JETSTREAM_MODEL=meta-llama/Llama-3.2-1B-Instruct

# Database
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_key
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

## 🏃‍♂️ Local Production Testing

Test the production build locally:

```bash
# Build for production
npm run build

# Start production server
npm start

# Visit http://localhost:3000
```

## 📊 Build Output Analysis

**UI Build (Vite):**
- Main bundle: ~399kB JS (126kB gzipped)
- CSS: ~68kB (12kB gzipped)
- Assets: Properly hashed for caching

**API Build (Next.js):**
- 3 API endpoints (~79.7kB shared JS)
- Static optimization enabled
- Production-ready routing

## 🔍 Health Checks

After deployment, verify these endpoints:

```bash
# UI Health
curl https://your-app.vercel.app/

# API Health
curl -X POST https://your-app.vercel.app/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message":"Hello", "sessionId":"test", "messageIndex":1}'

curl -X POST https://your-app.vercel.app/api/osv-query \
  -H "Content-Type: application/json" \
  -d '{"name":"lodash", "ecosystem":"npm"}'

# Legacy endpoint (should return deprecation notice)
curl https://your-app.vercel.app/api/run-status
```

## 🐛 Troubleshooting

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
- For Jetstream: Verify server accessibility and API key
- For OpenAI: Verify API key permissions
- Check Supabase configuration and service role key

### Static File Issues
- Check that `public/dist/` contains UI files after build
- Verify Next.js routing in `next.config.cjs`

## 📈 Performance Optimizations

The deployment includes:
- **Static caching** for UI assets (1 year cache)
- **Next.js optimizations** (static generation, code splitting)
- **Vite optimizations** (tree shaking, minification)
- **Proper routing** (SPA behavior for UI, API routing)

## 🔐 Security Considerations

- Environment variables are secure in Vercel
- No sensitive data in client bundle
- API endpoints are properly isolated
- File uploads are validated and scanned

---

## 🎉 Success!

Your BomBot application is now deployed as a **unified full-stack application** with **self-hosted AI capability**:
- ✅ React UI accessible at root URL
- ✅ Next.js API endpoints at `/api/*`
- ✅ Self-hosted Llama 3.2 AI with direct chat completions
- ✅ File upload and SBOM scanning with AI analysis
- ✅ Package vulnerability queries with function calling
- ✅ Production-optimized builds with hybrid AI architecture

**Live Demo Structure:**
```
🌐 https://your-bombot-app.vercel.app
├── 🎨 Modern React UI (Vite-built)
├── 🤖 Self-Hosted AI Chat (Llama 3.2)
├── 📤 File Upload & AI SBOM Analysis  
├── 🔍 Intelligent Package Vulnerability Search
├── 🛡️ Real-time Security Analysis
└── ⚡ Direct Response Architecture (No Polling)
```

## 🎯 **AI Provider Configuration**

### **Jetstream Setup (Recommended)**
Your self-hosted Llama 3.2 model provides:
- **Complete data privacy** - No external AI API calls
- **Faster responses** - Direct API communication
- **Cost control** - Use your own compute resources
- **Customization** - Fine-tune the model if needed

### **OpenAI Fallback**
Can still use OpenAI GPT-4 if needed:
- Set `MODEL_PROVIDER=openai`
- Add `OPENAI_API_KEY` to environment variables
- Full backward compatibility maintained 