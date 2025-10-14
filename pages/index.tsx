import { GetServerSideProps } from 'next';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

export default function Home() {
  return null; // Content is served via getServerSideProps
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
      .replace(/="\/assets\//g, '="/dist/assets/')
      // Fix favicon references
      .replace(/href="\/robot\.svg"/g, 'href="/robot.svg"')
      .replace(/href="\/favicon\.ico"/g, 'href="/favicon.ico"');
    
    // Set proper headers
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    
    // Send the HTML
    res.write(htmlContent);
    res.end();
    
    return { props: {} };
  } catch (error) {
    console.error('Error serving React app:', error);
    
    // Fallback error page
    const fallbackHtml = `
      <!DOCTYPE html>
      <html lang="en">
        <head>
          <title>BOMbot - Loading Error</title>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <style>
            body { 
              font-family: system-ui; 
              display: flex; 
              align-items: center; 
              justify-content: center; 
              min-height: 100vh; 
              margin: 0; 
              background: #f8fafc; 
            }
            .container { 
              text-align: center; 
              padding: 40px; 
              background: white; 
              border-radius: 12px; 
              box-shadow: 0 4px 6px rgba(0,0,0,0.1); 
            }
          </style>
        </head>
        <body>
          <div class="container">
            <h1 style="color: #1e40af;">🤖 BOMbot</h1>
            <p style="color: #6b7280;">Application loading error. Please refresh the page.</p>
            <button onclick="window.location.reload()" style="padding: 10px 20px; background: #3b82f6; color: white; border: none; border-radius: 6px; cursor: pointer;">
              Refresh
            </button>
          </div>
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