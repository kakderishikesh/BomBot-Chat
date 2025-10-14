#!/usr/bin/env node

import { execSync } from 'child_process';
import { copyFileSync, existsSync, mkdirSync, readdirSync, statSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');

console.log('🚀 Building full-stack BOMbot application...');

// Step 1: Build the UI with Vite
console.log('📦 Building UI with Vite...');
try {
  execSync('npm run build:ui', { 
    cwd: projectRoot, 
    stdio: 'inherit' 
  });
  console.log('✅ UI build completed successfully');
} catch (error) {
  console.error('❌ UI build failed:', error.message);
  process.exit(1);
}

// Step 2: Copy UI build contents to Next.js public/dist folder
console.log('📁 Copying UI build to Next.js public folder...');
const distDir = join(projectRoot, 'dist');
const publicDistDir = join(projectRoot, 'public', 'dist');

function copyRecursive(src, dest) {
  if (!existsSync(dest)) {
    mkdirSync(dest, { recursive: true });
  }

  const entries = readdirSync(src);
  
  for (const entry of entries) {
    const srcPath = join(src, entry);
    const destPath = join(dest, entry);
    
    if (statSync(srcPath).isDirectory()) {
      copyRecursive(srcPath, destPath);
    } else {
      copyFileSync(srcPath, destPath);
    }
  }
}

try {
  if (existsSync(distDir)) {
    // Remove existing public/dist directory to avoid conflicts
    if (existsSync(publicDistDir)) {
      execSync(`rm -rf "${publicDistDir}"`, { cwd: projectRoot });
    }
    
    // Copy the CONTENTS of dist folder, not the dist folder itself
    copyRecursive(distDir, publicDistDir);
    console.log('✅ UI files copied to public/dist');
  } else {
    console.error('❌ UI dist folder not found');
    process.exit(1);
  }
} catch (error) {
  console.error('❌ Failed to copy UI files:', error.message);
  process.exit(1);
}

// Step 3: Build the Next.js API
console.log('🔧 Building Next.js API...');
try {
  execSync('npm run build:api', { 
    cwd: projectRoot, 
    stdio: 'inherit' 
  });
  console.log('✅ API build completed successfully');
} catch (error) {
  console.error('❌ API build failed:', error.message);
  process.exit(1);
}

console.log('🎉 Full-stack build completed successfully!');
console.log('🌐 Ready for deployment with both UI and API integrated'); 