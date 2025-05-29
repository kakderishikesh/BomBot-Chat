import { readFileSync } from 'fs';
import { join } from 'path';

export default function Home() {
  return null; // This component won't actually render
}

export async function getServerSideProps({ res }) {
  try {
    // Read the built React app HTML
    const htmlPath = join(process.cwd(), 'public', 'dist', 'index.html');
    let htmlContent = readFileSync(htmlPath, 'utf-8');
    
    // Fix asset paths to point to the correct location with dynamic replacement
    // Replace all /assets/ references with /dist/assets/
    htmlContent = htmlContent
      .replace(/src="\/assets\//g, 'src="/dist/assets/')
      .replace(/href="\/assets\//g, 'href="/dist/assets/');
    
    // Set the content type and send the HTML directly
    res.setHeader('Content-Type', 'text/html');
    res.write(htmlContent);
    res.end();
    
    return { props: {} };
  } catch (error) {
    console.error('Error serving React app:', error);
    
    // Fallback HTML
    const fallbackHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>BomBot - Loading...</title>
        </head>
        <body>
          <div style="text-align: center; padding: 50px;">
            <h1>🤖 BomBot</h1>
            <p>Loading application...</p>
            <p>If this persists, please check the deployment logs.</p>
          </div>
        </body>
      </html>
    `;
    
    res.setHeader('Content-Type', 'text/html');
    res.write(fallbackHtml);
    res.end();
    
    return { props: {} };
  }
} 