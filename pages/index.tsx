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
    
    // Fix asset paths to point to the correct location
    htmlContent = htmlContent
      .replace(/src="\/assets\//g, 'src="/dist/assets/')
      .replace(/href="\/assets\//g, 'href="/dist/assets/')
      .replace(/="\/assets\//g, '="/dist/assets/');
    
    // Set proper headers and serve the HTML
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.write(htmlContent);
    res.end();
    
    return { props: {} };
  } catch (error) {
    console.error('Error serving React app:', error);
    
    // Fallback HTML with debugging info
    const fallbackHtml = `
      <!DOCTYPE html>
      <html lang="en">
        <head>
          <title>BomBot - Loading Error</title>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <style>
            body { 
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              text-align: center; 
              padding: 50px; 
              max-width: 600px; 
              margin: 0 auto; 
              line-height: 1.6;
            }
            .header { color: #2563eb; margin-bottom: 30px; }
            .error { 
              background: #fef2f2; 
              border: 1px solid #fecaca; 
              padding: 20px; 
              border-radius: 8px; 
              margin: 20px 0; 
              color: #991b1b;
            }
            .loading { margin: 30px 0; }
            .refresh-btn {
              background: #2563eb;
              color: white;
              border: none;
              padding: 12px 24px;
              border-radius: 6px;
              cursor: pointer;
              font-size: 16px;
              margin: 10px;
            }
            .refresh-btn:hover { background: #1d4ed8; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>🤖 BomBot</h1>
            <p>AI-Powered SBOM Security Analysis</p>
          </div>
          
          <div class="error">
            <h3>⚠️ Application Loading Issue</h3>
            <p>The React application is not loading properly. This is likely a temporary deployment issue.</p>
          </div>
          
          <div class="loading">
            <p><strong>What you can try:</strong></p>
            <button class="refresh-btn" onclick="window.location.reload()">🔄 Refresh Page</button>
            <br>
            <button class="refresh-btn" onclick="window.location.href='/dist/index.html'">📁 Direct App Access</button>
          </div>
          
          <details style="margin-top: 30px; text-align: left;">
            <summary style="cursor: pointer; font-weight: bold;">🔍 Technical Details</summary>
            <div style="margin-top: 10px; padding: 10px; background: #f3f4f6; border-radius: 4px; font-family: monospace; font-size: 12px;">
              Error: ${error.message}<br>
              Time: ${new Date().toISOString()}<br>
              This issue is usually resolved within a few minutes after deployment.
            </div>
          </details>
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