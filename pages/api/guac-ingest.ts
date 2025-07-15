import { NextApiRequest, NextApiResponse } from 'next';
import formidable from 'formidable';
import * as fs from 'fs';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';

// GUAC API Configuration with environment detection
const GUAC_GRAPHQL_URL = process.env.GUAC_GRAPHQL_URL || 'http://localhost:8080/query';
const GUAC_REST_URL = process.env.GUAC_REST_URL || 'http://localhost:8081';
const NATS_URL = process.env.NATS_URL || 'http://localhost:4222';
const GUAC_ENABLED = process.env.GUAC_ENABLED !== 'false' && process.env.NODE_ENV !== 'production';

// Helper function to check if GUAC is available
async function checkGuacAvailability(): Promise<boolean> {
  if (!GUAC_ENABLED) {
    return false;
  }
  
  try {
    const response = await fetch(GUAC_GRAPHQL_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: '{ __schema { types { name } } }' }),
      signal: AbortSignal.timeout(5000) // 5 second timeout
    });
    return response.ok;
  } catch (error) {
    console.warn('GUAC services not available:', error instanceof Error ? error.message : 'Unknown error');
    return false;
  }
}

interface GuacIngestRequest {
  sbomContent?: string;
  fileName?: string;
  format?: 'spdx' | 'cyclonedx' | 'auto';
  metadata?: {
    source?: string;
    origin?: string;
    collector?: string;
    timestamp?: string;
    userEmail?: string;
  };
}

interface GuacIngestResponse {
  success: boolean;
  ingestId?: string;
  message?: string;
  error?: string;
  details?: any;
  fallback?: boolean;
}

// Helper function to detect SBOM format
function detectSBOMFormat(content: string): 'spdx' | 'cyclonedx' | 'unknown' {
  try {
    const parsed = JSON.parse(content);
    
    // Check for SPDX format
    if (parsed.spdxVersion || parsed.SPDXID || parsed.dataLicense) {
      return 'spdx';
    }
    
    // Check for CycloneDX format
    if (parsed.bomFormat === 'CycloneDX' || parsed.specVersion || parsed.components) {
      return 'cyclonedx';
    }
    
    return 'unknown';
  } catch (error) {
    return 'unknown';
  }
}

// Helper function to validate SBOM content
function validateSBOM(content: string, format: string): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  try {
    const parsed = JSON.parse(content);
    
    if (format === 'spdx') {
      if (!parsed.spdxVersion) {
        errors.push('Missing required SPDX version');
      }
      if (!parsed.SPDXID) {
        errors.push('Missing required SPDX ID');
      }
      if (!parsed.name) {
        errors.push('Missing required document name');
      }
    } else if (format === 'cyclonedx') {
      if (!parsed.bomFormat || parsed.bomFormat !== 'CycloneDX') {
        errors.push('Invalid or missing CycloneDX bomFormat');
      }
      if (!parsed.specVersion) {
        errors.push('Missing required CycloneDX specVersion');
      }
    }
    
    return { valid: errors.length === 0, errors };
  } catch (error) {
    return { valid: false, errors: ['Invalid JSON format'] };
  }
}

// Helper function to send SBOM to GUAC via REST API
async function ingestSBOMViaREST(sbomContent: string, fileName: string, metadata: any): Promise<any> {
  try {
    const formData = new FormData();
    
    // Create a blob from the SBOM content
    const blob = new Blob([sbomContent], { type: 'application/json' });
    formData.append('file', blob, fileName);
    
    // Add metadata
    if (metadata.source) {
      formData.append('source', metadata.source);
    }
    if (metadata.origin) {
      formData.append('origin', metadata.origin);
    }
    if (metadata.collector) {
      formData.append('collector', metadata.collector);
    }

    const response = await fetch(`${GUAC_REST_URL}/ingest`, {
      method: 'POST',
      body: formData,
      headers: {
        'User-Agent': 'BomBot-GUAC-Integration/1.0'
      }
    });

    if (!response.ok) {
      throw new Error(`GUAC REST API error: ${response.status} ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('GUAC REST ingestion failed:', error);
    throw error;
  }
}

// Helper function to send SBOM via GraphQL mutation
async function ingestSBOMViaGraphQL(sbomContent: string, fileName: string, metadata: any): Promise<any> {
  try {
    // For GraphQL ingestion, we need to use the IngestSBOM mutation
    const mutation = `
      mutation IngestSBOM($document: String!, $format: String!, $metadata: IngestMetadata!) {
        ingestSBOM(document: $document, format: $format, metadata: $metadata) {
          id
          uri
          algorithm
          digest
        }
      }
    `;

    const variables = {
      document: sbomContent,
      format: detectSBOMFormat(sbomContent),
      metadata: {
        origin: metadata.origin || 'BomBot',
        collector: metadata.collector || 'BomBot-GUAC-Integration',
        timestamp: metadata.timestamp || new Date().toISOString()
      }
    };

    const response = await fetch(GUAC_GRAPHQL_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'BomBot-GUAC-Integration/1.0'
      },
      body: JSON.stringify({ query: mutation, variables })
    });

    if (!response.ok) {
      throw new Error(`GUAC GraphQL error: ${response.status} ${response.statusText}`);
    }

    const result = await response.json();
    
    if (result.errors) {
      throw new Error(`GraphQL ingestion errors: ${JSON.stringify(result.errors)}`);
    }

    return result.data;
  } catch (error) {
    console.error('GUAC GraphQL ingestion failed:', error);
    throw error;
  }
}

// Helper function to publish to NATS (for asynchronous processing)
async function publishToNATS(sbomContent: string, fileName: string, metadata: any): Promise<any> {
  try {
    const message = {
      id: uuidv4(),
      type: 'sbom_ingest',
      timestamp: new Date().toISOString(),
      payload: {
        content: sbomContent,
        fileName: fileName,
        format: detectSBOMFormat(sbomContent),
        metadata: metadata
      }
    };

    const response = await fetch(`${NATS_URL}/api/v1/stream/guac-ingest/publish`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'BomBot-GUAC-Integration/1.0'
      },
      body: JSON.stringify(message)
    });

    if (!response.ok) {
      throw new Error(`NATS publish error: ${response.status} ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('NATS publish failed:', error);
    throw error;
  }
}

// Main ingestion function
async function ingestSBOM(
  sbomContent: string, 
  fileName: string, 
  format: string,
  metadata: any
): Promise<GuacIngestResponse> {
  try {
    // Validate SBOM content
    const validation = validateSBOM(sbomContent, format);
    if (!validation.valid) {
      return {
        success: false,
        error: 'SBOM validation failed',
        details: validation.errors
      };
    }

    // Generate unique ingestion ID
    const ingestId = uuidv4();
    
    // Prepare metadata
    const enrichedMetadata = {
      ...metadata,
      ingestId,
      timestamp: new Date().toISOString(),
      source: metadata.source || 'BomBot',
      origin: metadata.origin || 'BomBot-Upload',
      collector: metadata.collector || 'BomBot-GUAC-Integration'
    };

    // Try multiple ingestion methods for robustness
    let result: any;
    let method: string;

    try {
      // Primary method: REST API
      result = await ingestSBOMViaREST(sbomContent, fileName, enrichedMetadata);
      method = 'REST';
    } catch (restError) {
      console.warn('REST ingestion failed, trying GraphQL:', restError);
      
      try {
        // Fallback method: GraphQL
        result = await ingestSBOMViaGraphQL(sbomContent, fileName, enrichedMetadata);
        method = 'GraphQL';
      } catch (gqlError) {
        console.warn('GraphQL ingestion failed, trying NATS:', gqlError);
        
        try {
          // Last resort: NATS async processing
          result = await publishToNATS(sbomContent, fileName, enrichedMetadata);
          method = 'NATS';
        } catch (natsError) {
          throw new Error(`All ingestion methods failed. REST: ${restError}. GraphQL: ${gqlError}. NATS: ${natsError}`);
        }
      }
    }

    return {
      success: true,
      ingestId,
      message: `SBOM successfully ingested via ${method}`,
      details: {
        method,
        fileName,
        format,
        timestamp: enrichedMetadata.timestamp,
        result
      }
    };

  } catch (error) {
    console.error('SBOM ingestion failed:', error);
    return {
      success: false,
      error: 'SBOM ingestion failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse<GuacIngestResponse>) {
  if (req.method !== 'POST') {
    return res.status(405).json({ 
      success: false, 
      error: 'Method Not Allowed' 
    });
  }

  // Check if GUAC is available
  const guacAvailable = await checkGuacAvailability();
  
  if (!guacAvailable) {
    return res.status(503).json({
      success: false,
      error: 'GUAC services are not available',
      message: 'SBOM ingestion to supply chain graph requires GUAC infrastructure. SBOMs are still processed normally.',
      fallback: true
    });
  }

  try {
    let sbomContent: string;
    let fileName: string;
    let metadata: any = {};

    // Check if request has file upload or JSON payload
    const contentType = req.headers['content-type'] || '';

    if (contentType.includes('multipart/form-data')) {
      // Handle file upload
      const form = new formidable.IncomingForm({ 
        maxFileSize: 10 * 1024 * 1024, // 10MB limit
        keepExtensions: true
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
        return res.status(400).json({ 
          success: false, 
          error: 'No file uploaded' 
        });
      }

      sbomContent = fs.readFileSync(file.filepath, 'utf-8');
      fileName = file.originalFilename || 'uploaded-sbom.json';
      
      // Extract metadata from form fields
      if (fields.source) metadata.source = Array.isArray(fields.source) ? fields.source[0] : fields.source;
      if (fields.origin) metadata.origin = Array.isArray(fields.origin) ? fields.origin[0] : fields.origin;
      if (fields.collector) metadata.collector = Array.isArray(fields.collector) ? fields.collector[0] : fields.collector;
      if (fields.userEmail) metadata.userEmail = Array.isArray(fields.userEmail) ? fields.userEmail[0] : fields.userEmail;

    } else if (contentType.includes('application/json')) {
      // Handle JSON payload
      const body: GuacIngestRequest = req.body;

      if (!body.sbomContent) {
        return res.status(400).json({ 
          success: false, 
          error: 'SBOM content is required' 
        });
      }

      sbomContent = body.sbomContent;
      fileName = body.fileName || 'sbom.json';
      metadata = body.metadata || {};

    } else {
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid content type. Use multipart/form-data or application/json' 
      });
    }

    // Detect format if not specified
    const format = detectSBOMFormat(sbomContent);
    if (format === 'unknown') {
      return res.status(400).json({ 
        success: false, 
        error: 'Unknown SBOM format. Supported formats: SPDX, CycloneDX' 
      });
    }

    // Ingest SBOM into GUAC
    const result = await ingestSBOM(sbomContent, fileName, format, metadata);

    if (result.success) {
      res.status(200).json(result);
    } else {
      res.status(500).json(result);
    }

  } catch (error) {
    console.error('GUAC ingest API error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Internal server error during SBOM ingestion',
      details: error instanceof Error ? error.message : 'Unknown error',
      fallback: true
    });
  }
}

// Disable Next.js body parsing for multipart/form-data
export const config = {
  api: {
    bodyParser: false,
  },
}; 