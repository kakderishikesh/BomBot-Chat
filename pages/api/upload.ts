import formidable from 'formidable';
import fs from 'fs';
import { NextApiRequest, NextApiResponse } from 'next';
import tmp from 'tmp';
import path from 'path';
import { supabaseServer } from '@/lib/supabase-server';
import { v4 as uuidv4 } from 'uuid';
import { chatCompletion, ChatMessage } from '@/lib/ai-client';

export const config = {
  api: {
    bodyParser: false, // Required for formidable
    externalResolver: true,
  },
};

interface SBOMPackage {
  name: string;
  version?: string;
  ecosystem: string;
  id?: string; // SPDX ID or component reference
}

interface DependencyRelationship {
  parent: string; // Package ID or name
  child: string;  // Dependency ID or name
  relationship: string; // Type: 'DEPENDS_ON', 'BUILD_DEPENDS_ON', etc.
}

interface DependencyGraphNode {
  id: string;
  label: string;
  version?: string;
  ecosystem: string;
  hasVulnerabilities: boolean;
  vulnerabilityCount: number;
}

interface DependencyGraphEdge {
  from: string;
  to: string;
  label: string;
  relationship: string;
}

interface DependencyGraph {
  nodes: DependencyGraphNode[];
  edges: DependencyGraphEdge[];
}

interface OSVVulnerability {
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
}

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
      vulnerabilities: OSVVulnerability[];
    }>;
  }>;
}

// Parse SBOM file to extract packages and dependencies
function parseSBOMData(sbomContent: string, fileName: string): { packages: SBOMPackage[], dependencies: DependencyRelationship[] } {
  try {
    const sbom = JSON.parse(sbomContent);
    const packages: SBOMPackage[] = [];
    const dependencies: DependencyRelationship[] = [];

    // Handle SPDX format
    if (sbom.spdxVersion || sbom.SPDXID) {
      // Parse packages
      if (sbom.packages) {
        sbom.packages.forEach((pkg: any) => {
          if (pkg.name && pkg.name !== 'NOASSERTION') {
            // Extract ecosystem from package manager or downloadLocation
            let ecosystem = 'npm'; // default
            if (pkg.downloadLocation) {
              const url = pkg.downloadLocation.toLowerCase();
              if (url.includes('pypi') || url.includes('python')) ecosystem = 'PyPI';
              else if (url.includes('maven')) ecosystem = 'Maven';
              else if (url.includes('nuget')) ecosystem = 'NuGet';
              else if (url.includes('golang') || url.includes('go.mod')) ecosystem = 'Go';
              else if (url.includes('rubygems')) ecosystem = 'RubyGems';
              else if (url.includes('cargo') || url.includes('crates')) ecosystem = 'crates.io';
            }
            
            packages.push({
              name: pkg.name,
              version: pkg.versionInfo || pkg.version,
              ecosystem: ecosystem,
              id: pkg.SPDXID
            });
          }
        });
      }

      // Parse relationships for dependencies
      if (sbom.relationships) {
        sbom.relationships.forEach((rel: any) => {
          if (rel.relationshipType && (
            rel.relationshipType === 'DEPENDS_ON' || 
            rel.relationshipType === 'BUILD_DEPENDS_ON' ||
            rel.relationshipType === 'DEV_DEPENDS_ON' ||
            rel.relationshipType === 'RUNTIME_DEPENDS_ON'
          )) {
            dependencies.push({
              parent: rel.spdxElementId,
              child: rel.relatedSpdxElement,
              relationship: rel.relationshipType
            });
          }
        });
      }
    }
    // Handle CycloneDX format
    else if (sbom.bomFormat === 'CycloneDX' || sbom.components) {
      // Parse components
      if (sbom.components) {
        sbom.components.forEach((component: any) => {
          if (component.name && component.purl) {
            // Parse package URL (purl) to extract ecosystem
            const purlParts = component.purl.split(':');
            if (purlParts.length >= 3) {
              const ecosystem = purlParts[1];
              const ecosystemMap: { [key: string]: string } = {
                'npm': 'npm',
                'pypi': 'PyPI', 
                'maven': 'Maven',
                'nuget': 'NuGet',
                'golang': 'Go',
                'gem': 'RubyGems',
                'cargo': 'crates.io',
                'composer': 'Packagist'
              };
              
              packages.push({
                name: component.name,
                version: component.version,
                ecosystem: ecosystemMap[ecosystem] || ecosystem,
                id: component['bom-ref'] || component.purl
              });
            }
          }
        });
      }

      // Parse dependencies from CycloneDX
      if (sbom.dependencies) {
        sbom.dependencies.forEach((dep: any) => {
          if (dep.ref && dep.dependsOn) {
            dep.dependsOn.forEach((childRef: string) => {
              dependencies.push({
                parent: dep.ref,
                child: childRef,
                relationship: 'DEPENDS_ON'
              });
            });
          }
        });
      }
    }
    // Handle generic JSON SBOM
    else if (sbom.packages || sbom.dependencies) {
      const packageList = sbom.packages || sbom.dependencies || [];
      packageList.forEach((pkg: any) => {
        if (pkg.name) {
          packages.push({
            name: pkg.name,
            version: pkg.version,
            ecosystem: pkg.ecosystem || 'npm', // default to npm
            id: pkg.id || pkg.purl || pkg.name
          });
        }
      });

      // Parse dependencies from generic format
      if (sbom.dependencyGraph || sbom.relationships) {
        const depData = sbom.dependencyGraph || sbom.relationships;
        if (Array.isArray(depData)) {
          depData.forEach((rel: any) => {
            if (rel.from && rel.to) {
              dependencies.push({
                parent: rel.from,
                child: rel.to,
                relationship: rel.type || 'DEPENDS_ON'
              });
            }
          });
        }
      }
    }

    return { packages, dependencies };
  } catch (error) {
    console.error('Error parsing SBOM:', error);
    throw new Error('Invalid SBOM format. Please ensure the file is valid JSON.');
  }
}

// Helper function to extract simple severity from OSV data
function extractSeverity(vuln: any) {
  // Try to find CVSS severity first
  if (vuln.severity && vuln.severity.length > 0) {
    for (const sev of vuln.severity) {
      if (sev.type === 'CVSS_V3') {
        const score = parseFloat(sev.score?.split('/')[0] || '0');
        if (score >= 9.0) return 'CRITICAL';
        if (score >= 7.0) return 'HIGH';
        if (score >= 4.0) return 'MEDIUM';
        if (score > 0) return 'LOW';
      }
    }
  }
  
  // Try database_specific for GHSA severity
  if (vuln.database_specific?.severity) {
    return vuln.database_specific.severity.toUpperCase();
  }
  
  // Fallback to parsing from summary or other fields
  const content = (vuln.summary || vuln.details || '').toUpperCase();
  if (content.includes('CRITICAL')) return 'CRITICAL';
  if (content.includes('HIGH')) return 'HIGH';
  if (content.includes('MEDIUM') || content.includes('MODERATE')) return 'MEDIUM';
  if (content.includes('LOW')) return 'LOW';
  
  return 'Unknown';
}

// Generate dependency graph from packages and dependencies
function generateDependencyGraph(
  packages: SBOMPackage[], 
  dependencies: DependencyRelationship[], 
  vulnerabilityResults: Array<{ package: SBOMPackage; vulnerabilities: OSVVulnerability[] }>
): DependencyGraph {
  const vulnMap = new Map(vulnerabilityResults.map(vr => [vr.package.name, vr.vulnerabilities.length]));
  
  // Create nodes for all packages
  const nodes: DependencyGraphNode[] = packages.map(pkg => {
    const wasScanned = vulnMap.has(pkg.name);
    const vulnCount = wasScanned ? vulnMap.get(pkg.name)! : -1; // -1 indicates not scanned
    
    return {
      id: pkg.id || pkg.name,
      label: pkg.name,
      version: pkg.version,
      ecosystem: pkg.ecosystem,
      hasVulnerabilities: wasScanned && vulnCount > 0,
      vulnerabilityCount: vulnCount
    };
  });

  // Create edges for dependencies
  const packageIdMap = new Map(packages.map(pkg => [pkg.id || pkg.name, pkg]));
  const edges: DependencyGraphEdge[] = dependencies
    .filter(dep => packageIdMap.has(dep.parent) && packageIdMap.has(dep.child))
    .map(dep => {
      const parentPkg = packageIdMap.get(dep.parent)!;
      const childPkg = packageIdMap.get(dep.child)!;
      return {
        from: dep.parent,
        to: dep.child,
        label: dep.relationship.replace('_', ' '),
        relationship: dep.relationship
      };
    });

  return { nodes, edges };
}

// Query OSV API for package vulnerabilities
async function queryOSVForPackage(pkg: SBOMPackage): Promise<OSVVulnerability[]> {
  try {
    const queryBody: any = {
      package: { 
        name: pkg.name, 
        ecosystem: pkg.ecosystem 
      }
    };
    
    if (pkg.version) {
      queryBody.version = pkg.version;
    }

    const response = await fetch('https://api.osv.dev/v1/query', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'User-Agent': 'BomBot-SBOM-Scanner/1.0'
      },
      body: JSON.stringify(queryBody)
    });

    if (!response.ok) {
      console.warn(`OSV query failed for ${pkg.name}: ${response.status}`);
      return [];
    }

    const result = await response.json();
    return result.vulns || [];
  } catch (error) {
    console.warn(`Error querying OSV for ${pkg.name}:`, error);
    return [];
  }
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
    
    // Extract session and message info from fields
    const sessionId = Array.isArray(fields.sessionId) ? fields.sessionId[0] : fields.sessionId;
    const messageIndex = Array.isArray(fields.messageIndex) ? 
      parseInt(fields.messageIndex[0]) : 
      parseInt(fields.messageIndex || '0');
    const userEmail = Array.isArray(fields.userEmail) ? fields.userEmail[0] : fields.userEmail;
    const existingThreadId = Array.isArray(fields.threadId) ? fields.threadId[0] : fields.threadId;

    // Validate file type (basic check for SBOM files)
    const validExtensions = ['.json', '.xml', '.spdx', '.cyclonedx'];
    const fileExt = path.extname(fileName).toLowerCase();
    
    if (!validExtensions.includes(fileExt) && !fileName.includes('sbom') && !fileName.includes('spdx')) {
      return res.status(400).json({ 
        error: 'Invalid file type. Please upload a valid SBOM file (.json, .xml, .spdx, .cyclonedx)' 
      });
    }

    // Read and parse SBOM file
    const sbomContent = fs.readFileSync(filePath, 'utf-8');
    let packages: SBOMPackage[];
    let dependencies: DependencyRelationship[];
    
    try {
      const parsedData = parseSBOMData(sbomContent, fileName);
      packages = parsedData.packages;
      dependencies = parsedData.dependencies;
    } catch (parseError) {
      return res.status(400).json({ 
        error: 'Failed to parse SBOM file. Please ensure it follows SPDX or CycloneDX format.',
        details: parseError instanceof Error ? parseError.message : 'Unknown parsing error'
      });
    }

    if (packages.length === 0) {
      return res.status(400).json({ 
        error: 'No packages found in SBOM file. Please verify the file format.' 
      });
    }

    // Query OSV for vulnerabilities (limit to first 150 packages to avoid timeout)
    console.log(`Scanning ${Math.min(packages.length, 150)} packages for vulnerabilities...`);
    const packagesToScan = packages.slice(0, 150);
    const vulnerabilityResults: Array<{
      package: SBOMPackage;
      vulnerabilities: OSVVulnerability[];
    }> = [];

    // Process packages in batches to avoid rate limiting
    for (let i = 0; i < packagesToScan.length; i += 5) {
      const batch = packagesToScan.slice(i, i + 5);
      const batchPromises = batch.map(pkg => 
        queryOSVForPackage(pkg).then(vulns => ({ package: pkg, vulnerabilities: vulns }))
      );
      
      const batchResults = await Promise.all(batchPromises);
      vulnerabilityResults.push(...batchResults);
      
      // Small delay between batches
      if (i + 5 < packagesToScan.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    // Build scan results in osv-scanner compatible format
    const scanResults: ScanResult = {
      results: [{
        source: {
          path: fileName,
          type: 'sbom'
        },
        packages: vulnerabilityResults
          .filter(result => result.vulnerabilities.length > 0)
          .map(result => ({
            package: {
              name: result.package.name,
              version: result.package.version || 'unknown',
              ecosystem: result.package.ecosystem
            },
            vulnerabilities: result.vulnerabilities
          }))
      }]
    };

    // Generate conversation ID for this SBOM analysis
    const conversationId = uuidv4();
    console.log(`Created conversation: ${conversationId} for SBOM upload`);

    // Send the scan results to the AI for analysis
    const totalVulns = vulnerabilityResults.reduce((sum, result) => sum + result.vulnerabilities.length, 0);
    const vulnPackages = vulnerabilityResults.filter(result => result.vulnerabilities.length > 0).length;
    
    // Generate dependency graph for visualization
    const dependencyGraph = generateDependencyGraph(packages, dependencies, vulnerabilityResults);

    // Create dependency mapping for easier AI analysis
    const packageMap = new Map(packages.map(pkg => [pkg.id || pkg.name, pkg]));
    const dependencyMap = new Map<string, string[]>();
    
    // Build dependency relationships for AI context
    dependencies.forEach(dep => {
      const parent = packageMap.get(dep.parent);
      const child = packageMap.get(dep.child);
      
      if (parent && child) {
        const parentKey = `${parent.name}@${parent.version || 'unknown'}`;
        if (!dependencyMap.has(parentKey)) {
          dependencyMap.set(parentKey, []);
        }
        dependencyMap.get(parentKey)!.push(`${child.name}@${child.version || 'unknown'} (${dep.relationship})`);
      }
    });

    // Create the message for AI analysis
    const sbomAnalysisMessage: ChatMessage = {
      role: 'user',
      content: `I've uploaded ${existingThreadId ? 'an additional' : 'an'} SBOM file "${fileName}" with ${packages.length} packages${existingThreadId ? ' for comparison with the previous SBOM(s)' : ''}. Here's the comprehensive analysis data:

**Quick Scan Summary:**
- Total packages scanned: ${packagesToScan.length}
- Packages with vulnerabilities: ${vulnPackages}
- Total vulnerabilities found: ${totalVulns}
- Dependency relationships found: ${dependencies.length}

**Vulnerability Scan Data:**
${JSON.stringify(scanResults, null, 2)}

**Package Dependency Information:**
${JSON.stringify(Object.fromEntries(dependencyMap), null, 2)}

**All Packages in SBOM:**
${JSON.stringify(packages.map(pkg => ({
  name: pkg.name,
  version: pkg.version || 'unknown',
  ecosystem: pkg.ecosystem,
  id: pkg.id
})), null, 2)}

${existingThreadId ? 
  'Please provide a QUICK summary of the most critical findings with OSV.dev links (NOT NVD links). Since this is an additional SBOM, you can also compare it with previously uploaded SBOMs. Use osv.dev format for vulnerability links. Keep it brief and actionable. Suggest that I can ask for "executive summary", "detailed analysis", "dependency analysis", or "SBOM comparison" for comprehensive information.' :
  'Please provide a QUICK summary of the most critical findings with OSV.dev links (NOT NVD links). Use osv.dev format for vulnerability links. Keep it brief and actionable. Suggest that I can ask for "executive summary", "detailed analysis", or "dependency analysis" for comprehensive information.'}`
    };

    // Get AI analysis
    let aiResponse = '';
    let isContextLimitError = false;
    try {
      const completion = await chatCompletion([sbomAnalysisMessage]);
      aiResponse = completion.content;
    } catch (aiError) {
      console.error('Failed to get AI analysis:', aiError);
      
      // Check if it's a context limit error
      if (aiError instanceof Error && aiError.message === 'CONTEXT_LIMIT_EXCEEDED') {
        isContextLimitError = true;
        aiResponse = `🤖 **SBOM Analysis Complete - Context Limit Reached**

I've successfully scanned your SBOM file "${fileName}" and found:
- **${packagesToScan.length} packages scanned**
- **${vulnPackages} packages with vulnerabilities**
- **${totalVulns} total vulnerabilities found**

However, our conversation has gotten quite long, and I've reached my memory limit. To get detailed AI analysis of these results:

**Please start a new chat** and re-upload this SBOM file for comprehensive AI-powered security insights.

**Current scan results are ready** - you can still see the vulnerability data above, but for detailed analysis and recommendations, a fresh conversation will work best! 🚀`;
      } else {
        aiResponse = `✅ **SBOM Analysis Complete**

I've successfully scanned your SBOM file "${fileName}" and found:
- **${packagesToScan.length} packages scanned**
- **${vulnPackages} packages with vulnerabilities**
- **${totalVulns} total vulnerabilities found**

The raw scan data has been processed. You can ask me specific questions about:
- "Tell me about the most critical vulnerabilities"
- "What packages should I update first?"
- "Give me an executive summary"
- "Show me detailed analysis"

I'm ready to help you understand and prioritize these security findings.`;
      }
    }

    // Log file upload to Supabase if session info is provided
    if (sessionId && messageIndex !== undefined) {
      try {
        await supabaseServer
          .from('chat_logs')
          .insert([{
            id: uuidv4(),
            session_id: sessionId,
            thread_id: conversationId,
            message_index: messageIndex,
            message_type: 'file_upload',
            user_message: `Uploaded SBOM file: ${fileName}`,
            ai_response: aiResponse,
            file_name: fileName,
            file_size: file.size,
            vulnerability_count: totalVulns,
            user_email: userEmail,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          }]);
      } catch (logError) {
        console.error('Error logging file upload:', logError);
        // Continue even if logging fails
      }
    }

    // Clean up the uploaded file
    try {
      fs.unlinkSync(filePath);
    } catch (cleanupError) {
      console.warn('Failed to cleanup uploaded file:', cleanupError);
    }

    res.status(200).json({ 
      success: true,
      conversationId: conversationId,
      aiResponse: aiResponse,
      isContextLimitError: isContextLimitError,
      fileName: fileName,
      packagesScanned: packagesToScan.length,
      totalPackages: packages.length,
      vulnerabilitiesFound: totalVulns,
      dependencyRelationships: dependencies.length,
      dependencyGraph: dependencyGraph,
      sessionId: sessionId,
      messageIndex: messageIndex,
      quickSummary: {
        packagesWithVulns: vulnPackages,
        totalVulns: totalVulns,
        dependenciesFound: dependencies.length,
        topVulnerabilities: vulnerabilityResults
          .filter(result => result.vulnerabilities.length > 0)
          .slice(0, 5)
          .map(result => ({
            package: result.package.name,
            version: result.package.version || 'unknown',
            vulns: result.vulnerabilities.slice(0, 3).map(vuln => ({
              id: vuln.id,
              severity: extractSeverity(vuln),
              summary: vuln.summary || 'No summary available'
            }))
          }))
      }
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