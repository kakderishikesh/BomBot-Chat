import formidable, { IncomingForm } from 'formidable';
import fs from 'fs';
import { spawn } from 'child_process';
import { NextApiRequest, NextApiResponse } from 'next';
import { OpenAI } from 'openai';
import tmp from 'tmp';
import path from 'path';

export const config = {
  api: {
    bodyParser: false, // Required for formidable
    externalResolver: true,
  },
};

const openai = new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY! 
});

interface ScanResult {
  results: Array<{
    source: {
      path: string;
      type: string;
    };
    packages: Array<{
      package: {
        name: string;
        version: string;
        ecosystem: string;
      };
      vulnerabilities: Array<{
        id: string;
        summary: string;
        details: string;
        severity?: Array<{
          type: string;
          score: string;
        }>;
        affected: Array<{
          package: {
            name: string;
            ecosystem: string;
          };
          ranges: Array<{
            type: string;
            events: Array<{
              introduced?: string;
              fixed?: string;
            }>;
          }>;
        }>;
        references: Array<{
          type: string;
          url: string;
        }>;
      }>;
    }>;
  }>;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  // Create temporary directory for uploads
  const tmpDir = tmp.dirSync({ unsafeCleanup: true });
  
  try {
    const form = formidable({ 
      uploadDir: tmpDir.name, 
      keepExtensions: true,
      maxFileSize: 10 * 1024 * 1024, // 10MB limit
    });

    const { fields, files } = await new Promise<{
      fields: any;
      files: any;
    }>((resolve, reject) => {
      form.parse(req, (err, fields, files) => {
        if (err) reject(err);
        else resolve({ fields, files });
      });
    });

    const file = Array.isArray(files.file) ? files.file[0] : files.file;
    if (!file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const filePath = file.filepath;
    const fileName = file.originalFilename || 'uploaded-sbom';

    // Validate file type (basic check for SBOM files)
    const validExtensions = ['.json', '.xml', '.spdx', '.cyclonedx'];
    const fileExt = path.extname(fileName).toLowerCase();
    
    if (!validExtensions.includes(fileExt) && !fileName.includes('sbom') && !fileName.includes('spdx')) {
      return res.status(400).json({ 
        error: 'Invalid file type. Please upload a valid SBOM file (.json, .xml, .spdx, .cyclonedx)' 
      });
    }

    // Run osv-scanner on the uploaded file
    const scannerPromise = new Promise<string>((resolve, reject) => {
      // Try different possible paths for osv-scanner
      const possiblePaths = [
        'osv-scanner',
        './osv-scanner',
        '/usr/local/bin/osv-scanner',
        '/opt/homebrew/bin/osv-scanner',
        process.env.OSV_SCANNER_PATH || 'osv-scanner'
      ];

      let scannerPath = possiblePaths[0];
      
      const scanner = spawn(scannerPath, [
        '--format=json',
        '--sbom',
        filePath
      ], {
        stdio: ['pipe', 'pipe', 'pipe']
      });

      let output = '';
      let errorOutput = '';

      scanner.stdout.on('data', (data) => {
        output += data.toString();
      });

      scanner.stderr.on('data', (data) => {
        errorOutput += data.toString();
      });

      scanner.on('close', (code) => {
        if (code === 0 || code === 1) {
          // Exit code 0: no vulnerabilities found
          // Exit code 1: vulnerabilities found (still successful scan)
          resolve(output);
        } else {
          console.error('osv-scanner stderr:', errorOutput);
          reject(new Error(`osv-scanner failed with code ${code}: ${errorOutput}`));
        }
      });

      scanner.on('error', (err) => {
        reject(new Error(`Failed to start osv-scanner: ${err.message}`));
      });
    });

    let scanOutput: string;
    try {
      scanOutput = await scannerPromise;
    } catch (error) {
      console.error('OSV scanner error:', error);
      return res.status(500).json({ 
        error: 'Failed to scan SBOM file. Please ensure the file is a valid SBOM format.',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }

    // Parse the scanner output
    let parsedResults: ScanResult;
    try {
      parsedResults = JSON.parse(scanOutput);
    } catch (parseError) {
      console.error('Failed to parse osv-scanner output:', parseError);
      return res.status(500).json({ 
        error: 'Failed to parse scanner results',
        rawOutput: scanOutput
      });
    }

    // Create a thread with the OpenAI Assistant
    const thread = await openai.beta.threads.create();

    // Send the scan results to the assistant
    await openai.beta.threads.messages.create(thread.id, {
      role: 'user',
      content: `I've uploaded an SBOM file "${fileName}" and here are the vulnerability scan results from osv-scanner:\n\n${JSON.stringify(parsedResults, null, 2)}\n\nPlease analyze these results and provide a summary of the vulnerabilities found, their severity levels, and recommended actions.`
    });

    // Create a run with the assistant
    const run = await openai.beta.threads.runs.create(thread.id, {
      assistant_id: process.env.ASSISTANT_ID!,
      tools: [
        {
          type: "function",
          function: {
            name: "query_package_vulnerabilities",
            description: "Query the OSV database for vulnerabilities in a specific package and version",
            parameters: {
              type: "object",
              properties: {
                name: {
                  type: "string",
                  description: "The package name (e.g., 'lodash', 'express')"
                },
                ecosystem: {
                  type: "string",
                  description: "The package ecosystem (npm, PyPI, Maven, Go, etc.)",
                  enum: ["npm", "PyPI", "Maven", "Go", "Packagist", "RubyGems", "NuGet", "crates.io", "Hex", "Pub"]
                },
                version: {
                  type: "string",
                  description: "Optional: specific version to check (e.g., '4.17.20')"
                }
              },
              required: ["name", "ecosystem"]
            }
          }
        },
        {
          type: "function",
          function: {
            name: "query_cve_details",
            description: "Get detailed information about a specific CVE from the OSV database",
            parameters: {
              type: "object",
              properties: {
                cve_id: {
                  type: "string",
                  description: "The CVE identifier (e.g., 'CVE-2023-1234')"
                }
              },
              required: ["cve_id"]
            }
          }
        },
        {
          type: "function",
          function: {
            name: "analyze_sbom_package",
            description: "Analyze a specific package from the uploaded SBOM data in detail",
            parameters: {
              type: "object",
              properties: {
                package_name: {
                  type: "string",
                  description: "The name of the package to analyze from the SBOM"
                },
                include_dependencies: {
                  type: "boolean",
                  description: "Whether to include analysis of package dependencies",
                  default: false
                }
              },
              required: ["package_name"]
            }
          }
        }
      ]
    });

    // Clean up the uploaded file
    try {
      fs.unlinkSync(filePath);
    } catch (cleanupError) {
      console.warn('Failed to cleanup uploaded file:', cleanupError);
    }

    res.status(200).json({ 
      success: true,
      runId: run.id, 
      threadId: thread.id,
      fileName: fileName,
      vulnerabilitiesFound: parsedResults.results?.[0]?.packages?.reduce((total, pkg) => 
        total + (pkg.vulnerabilities?.length || 0), 0) || 0
    });

  } catch (error) {
    console.error('Upload handler error:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  } finally {
    // Cleanup temporary directory
    try {
      tmpDir.removeCallback();
    } catch (cleanupError) {
      console.warn('Failed to cleanup temp directory:', cleanupError);
    }
  }
} 