import { GetServerSideProps } from 'next';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

export default function Home() {
  return null; // This won't render since we handle everything in getServerSideProps
}

export const getServerSideProps: GetServerSideProps = async ({ res }) => {
  try {
    // Path to the built React app
    const htmlPath = join(process.cwd(), 'public', 'dist', 'index.html');
    
    if (!existsSync(htmlPath)) {
      throw new Error(`React app not found at ${htmlPath}`);
    }
    
    // Read the HTML content
    let htmlContent = readFileSync(htmlPath, 'utf-8');
    
    // Fix ALL asset paths to point to the correct location
    htmlContent = htmlContent
      .replace(/src="\/assets\//g, 'src="/dist/assets/')
      .replace(/href="\/assets\//g, 'href="/dist/assets/')
      .replace(/="\/assets\//g, '="/dist/assets/')
      // Also fix any references to favicon and robot.svg
      .replace(/href="\/robot\.svg"/g, 'href="/robot.svg"')
      .replace(/href="\/favicon\.ico"/g, 'href="/favicon.ico"');
    
    // Set proper headers for HTML content
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    
    // Send the corrected HTML
    res.write(htmlContent);
    res.end();
    
    return { props: {} };
  } catch (error) {
    console.error('Error serving React app:', error);
    
    // Enhanced fallback HTML for debugging
    const fallbackHtml = `
      <!DOCTYPE html>
      <html lang="en">
        <head>
          <title>BomBot - Deployment Issue</title>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <style>
            body { 
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              max-width: 800px; 
              margin: 0 auto; 
              padding: 40px 20px;
              line-height: 1.6;
              background: #f8fafc;
            }
            .container { background: white; padding: 40px; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
            .header { color: #1e40af; margin-bottom: 30px; text-align: center; }
            .error { 
              background: #fef2f2; 
              border-left: 4px solid #ef4444; 
              padding: 20px; 
              border-radius: 6px; 
              margin: 20px 0; 
              color: #991b1b;
            }
            .info { 
              background: #eff6ff; 
              border-left: 4px solid #3b82f6; 
              padding: 20px; 
              border-radius: 6px; 
              margin: 20px 0; 
              color: #1e40af;
            }
            .btn {
              background: #3b82f6;
              color: white;
              border: none;
              padding: 12px 24px;
              border-radius: 6px;
              cursor: pointer;
              font-size: 16px;
              margin: 10px 5px;
              text-decoration: none;
              display: inline-block;
            }
            .btn:hover { background: #2563eb; }
            .debug { 
              background: #f3f4f6; 
              padding: 15px; 
              border-radius: 6px; 
              font-family: 'Monaco', 'Consolas', monospace; 
              font-size: 13px;
              overflow-x: auto;
              margin: 15px 0;
            }
            details { margin: 20px 0; }
            summary { cursor: pointer; font-weight: 600; padding: 10px; background: #f1f5f9; border-radius: 6px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🤖 BomBot</h1>
              <p>AI-Powered SBOM Security Analysis</p>
            </div>
            
            <div class="error">
              <h3>⚠️ Application Loading Issue</h3>
              <p>The React application is not loading properly. This appears to be a deployment configuration issue.</p>
            </div>
            
            <div class="info">
              <h4>🔧 Troubleshooting Options</h4>
              <p>Try these alternative access methods:</p>
              <a href="/dist/index.html" class="btn">📁 Direct Static Access</a>
              <button onclick="window.location.reload()" class="btn">🔄 Refresh Page</button>
              <button onclick="localStorage.clear(); window.location.reload()" class="btn">🗑️ Clear Cache & Reload</button>
            </div>
            
            <details>
              <summary>🔍 Technical Debugging Information</summary>
              <div class="debug">
                <strong>Error Details:</strong><br>
                ${error.message}<br><br>
                <strong>Timestamp:</strong> ${new Date().toISOString()}<br>
                <strong>User Agent:</strong> <span id="userAgent"></span><br>
                <strong>Current URL:</strong> <span id="currentUrl"></span><br><br>
                <strong>Expected File Locations:</strong><br>
                • React App: /public/dist/index.html<br>
                • CSS Assets: /public/dist/assets/*.css<br>
                • JS Assets: /public/dist/assets/*.js<br><br>
                <strong>Suggested Actions:</strong><br>
                1. Check if build completed successfully<br>
                2. Verify asset paths are correct<br>
                3. Ensure Vercel deployment includes all files<br>
                4. Check browser console for additional errors
              </div>
            </details>
            
            <div style="text-align: center; margin-top: 30px; color: #6b7280; font-size: 14px;">
              If this issue persists, please contact the development team.<br>
              This page will be automatically updated once the deployment is fixed.
            </div>
          </div>
          
          <script>
            document.getElementById('userAgent').textContent = navigator.userAgent;
            document.getElementById('currentUrl').textContent = window.location.href;
            
            // Auto-refresh every 30 seconds if there's an active deployment
            setTimeout(() => {
              if (confirm('Would you like to refresh the page to check if the issue has been resolved?')) {
                window.location.reload();
              }
            }, 30000);
          </script>
        </body>
      </html>
    `;
    
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.statusCode = 500;
    res.write(fallbackHtml);
    res.end();
    
    return { props: {} };
  }
}; 