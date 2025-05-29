import { useState } from 'react';
import { useChat } from '@/contexts/ChatContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Search } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

const PackageQueryForm = () => {
  const { addMessage, setLoading, isLoading, currentThreadId, setCurrentThreadId } = useChat();
  const [formData, setFormData] = useState({
    packageName: '',
    ecosystem: '',
    version: '',
    cve: ''
  });

  const ecosystems = [
    { value: 'npm', label: 'npm (Node.js)' },
    { value: 'PyPI', label: 'PyPI (Python)' },
    { value: 'Maven', label: 'Maven (Java)' },
    { value: 'NuGet', label: 'NuGet (.NET)' },
    { value: 'crates.io', label: 'Cargo (Rust)' },
    { value: 'Go', label: 'Go Modules' },
    { value: 'RubyGems', label: 'RubyGems' },
    { value: 'Packagist', label: 'Composer (PHP)' },
    { value: 'Hex', label: 'Hex (Erlang/Elixir)' },
    { value: 'CocoaPods', label: 'CocoaPods (iOS)' },
    { value: 'SwiftURL', label: 'Swift Package Manager' }
  ];

  // Helper function to extract simple severity from OSV data
  const extractSeverity = (vuln: any) => {
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
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.packageName && !formData.cve) {
      toast({
        title: "Missing information",
        description: "Please provide either a package name or CVE ID",
        variant: "destructive",
      });
      return;
    }

    if (formData.packageName && !formData.ecosystem) {
      toast({
        title: "Missing ecosystem",
        description: "Please select an ecosystem when searching by package name",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    let queryMessage = '';
    if (formData.cve) {
      queryMessage = `Checking CVE: ${formData.cve}`;
    } else {
      queryMessage = `Checking package: ${formData.packageName}`;
      if (formData.ecosystem) {
        queryMessage += ` (${formData.ecosystem})`;
      }
      if (formData.version) {
        queryMessage += ` version ${formData.version}`;
      }
    }

    // Add user message
    addMessage({
      type: 'user',
      content: queryMessage,
    });

    try {
      // Prepare the request body
      const requestBody: any = {};
      
      if (formData.cve) {
        requestBody.cve = formData.cve;
      } else {
        requestBody.name = formData.packageName;
        requestBody.ecosystem = formData.ecosystem;
        if (formData.version) {
          requestBody.version = formData.version;
        }
      }

      // Include threadId if available for AI assistant integration
      if (currentThreadId) {
        requestBody.threadId = currentThreadId;
      }

      // Call the OSV query API
      const response = await fetch('/api/osv-query', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Query failed');
      }

      const result = await response.json();

      // Always display quick templated response first, regardless of threadId
      const osvData = result.result;
      let responseContent = '';
      let vulnerabilities = [];

      if (formData.cve) {
        // Single CVE response
        if (osvData) {
          responseContent = `**CVE Details for ${formData.cve}:**\n\n`;
          responseContent += `**Summary:** ${osvData.summary || 'No summary available'}\n`;
          responseContent += `**Severity:** ${osvData.severity?.[0]?.score || 'Not specified'}\n`;
          responseContent += `**Published:** ${new Date(osvData.published).toLocaleDateString()}\n`;
          
          if (osvData.affected && osvData.affected.length > 0) {
            responseContent += `\n**Affected Packages:**\n`;
            osvData.affected.forEach((affected: any, index: number) => {
              responseContent += `${index + 1}. ${affected.package.name} (${affected.package.ecosystem})\n`;
            });
          }

          responseContent += `\n💡 *Ask me "detailed analysis of ${formData.cve}" for comprehensive remediation guidance*`;

          vulnerabilities = [{
            id: formData.cve,
            severity: extractSeverity(osvData),
            package: osvData.affected?.[0]?.package.name || 'Multiple',
            version: osvData.affected?.[0]?.ranges?.[0]?.events?.[0]?.introduced || 'Multiple',
            description: osvData.summary || 'No description available'
          }];
        } else {
          responseContent = `CVE ${formData.cve} was not found in the OSV database.`;
        }
      } else {
        // Package query response
        if (osvData && osvData.vulns && osvData.vulns.length > 0) {
          const vulnCount = osvData.vulns.length;
          responseContent = `**Found ${vulnCount} vulnerabilit${vulnCount > 1 ? 'ies' : 'y'} for ${formData.packageName}**\n\n`;
          
          osvData.vulns.slice(0, 5).forEach((vuln: any, index: number) => {
            responseContent += `**${index + 1}. ${vuln.id}**\n`;
            responseContent += `- Severity: ${vuln.severity?.[0]?.score || 'Not specified'}\n`;
            responseContent += `- Summary: ${vuln.summary || 'No summary available'}\n\n`;
          });

          if (vulnCount > 5) {
            responseContent += `... and ${vulnCount - 5} more vulnerabilities.\n\n`;
          }

          responseContent += `💡 *Ask me "detailed analysis of ${formData.packageName}" for comprehensive security assessment*`;

          vulnerabilities = osvData.vulns.map((vuln: any) => ({
            id: vuln.id,
            severity: extractSeverity(vuln),
            package: formData.packageName,
            version: formData.version || 'Multiple',
            description: vuln.summary || 'No description available'
          }));
        } else {
          responseContent = `✅ **Good news!** No known vulnerabilities found for ${formData.packageName}${formData.version ? ` version ${formData.version}` : ''} in the ${formData.ecosystem} ecosystem.\n\n💡 *Ask me about this package for additional security recommendations*`;
        }
      }

      // Add quick templated response
      addMessage({
        type: 'assistant',
        content: responseContent,
        vulnerabilities: vulnerabilities.length > 0 ? vulnerabilities : undefined,
      });

      // Set up thread for follow-up questions if we got data and have threadId/runId
      if (result.runId && result.threadId) {
        setCurrentThreadId(result.threadId);
      }

      toast({
        title: "Query completed",
        description: `Analysis complete for ${formData.packageName || formData.cve}`,
      });

    } catch (error) {
      console.error('Query error:', error);
      addMessage({
        type: 'assistant',
        content: `❌ **Query failed:** ${error instanceof Error ? error.message : 'Unknown error occurred'}. Please check your input and try again.`,
      });
      
      toast({
        title: "Query failed",
        description: error instanceof Error ? error.message : "There was an error processing your query. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }

    // Reset form
    setFormData({
      packageName: '',
      ecosystem: '',
      version: '',
      cve: ''
    });
  };

  const pollForAIResponse = async (threadId: string, runId: string) => {
    const maxAttempts = 20; // Maximum polling attempts
    let attempts = 0;

    const poll = async () => {
      try {
        const response = await fetch(`/api/run-status?threadId=${threadId}&runId=${runId}`);
        
        if (!response.ok) {
          throw new Error('Failed to check analysis status');
        }

        const result = await response.json();

        if (result.completed) {
          if (result.status === 'completed' && result.response) {
            // Add the AI assistant's analysis response
            addMessage({
              type: 'assistant',
              content: result.response,
              useMarkdown: true,
            });
          } else if (result.status === 'failed') {
            addMessage({
              type: 'assistant',
              content: `❌ AI analysis failed: ${result.error || 'Unknown error occurred during analysis.'}`,
            });
          }
          return;
        }

        // Continue polling if not completed and under max attempts
        attempts++;
        if (attempts < maxAttempts) {
          setTimeout(poll, 2000); // Poll every 2 seconds
        } else {
          addMessage({
            type: 'assistant',
            content: `⏱️ AI analysis is taking longer than expected. The data has been retrieved from OSV, but detailed analysis is still processing.`,
          });
        }
      } catch (error) {
        console.error('AI polling error:', error);
        addMessage({
          type: 'assistant',
          content: `⚠️ There was an issue getting the AI analysis, but the vulnerability data has been retrieved successfully.`,
        });
      }
    };

    // Start polling after a short delay
    setTimeout(poll, 1000);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="packageName">Package Name</Label>
        <Input
          id="packageName"
          placeholder="e.g., lodash, express"
          value={formData.packageName}
          onChange={(e) => setFormData(prev => ({ ...prev, packageName: e.target.value }))}
          disabled={!!formData.cve}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="ecosystem">Ecosystem</Label>
        <Select 
          value={formData.ecosystem} 
          onValueChange={(value) => setFormData(prev => ({ ...prev, ecosystem: value }))}
          disabled={!!formData.cve}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select ecosystem" />
          </SelectTrigger>
          <SelectContent>
            {ecosystems.map((eco) => (
              <SelectItem key={eco.value} value={eco.value}>
                {eco.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="version">Version (optional)</Label>
        <Input
          id="version"
          placeholder="e.g., 1.2.3"
          value={formData.version}
          onChange={(e) => setFormData(prev => ({ ...prev, version: e.target.value }))}
          disabled={!!formData.cve}
        />
      </div>

      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t border-gray-300" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-white px-2 text-gray-500">OR</span>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="cve">CVE ID</Label>
        <Input
          id="cve"
          placeholder="e.g., CVE-2024-1234"
          value={formData.cve}
          onChange={(e) => setFormData(prev => ({ ...prev, cve: e.target.value }))}
          disabled={!!formData.packageName}
        />
      </div>

      <Button 
        type="submit" 
        className="w-full" 
        disabled={isLoading || (!formData.packageName && !formData.cve)}
      >
        {isLoading ? (
          <>
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
            Checking...
          </>
        ) : (
          <>
            <Search className="h-4 w-4 mr-2" />
            Check Package
          </>
        )}
      </Button>
    </form>
  );
};

export default PackageQueryForm;
