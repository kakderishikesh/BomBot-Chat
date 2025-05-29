
import { useState } from 'react';
import { useChat } from '@/contexts/ChatContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Search, Package } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

const PackageQueryForm = () => {
  const { addMessage, setLoading, isLoading } = useChat();
  const [formData, setFormData] = useState({
    packageName: '',
    ecosystem: '',
    version: '',
    cve: ''
  });

  const ecosystems = [
    { value: 'npm', label: 'npm (Node.js)' },
    { value: 'pypi', label: 'PyPI (Python)' },
    { value: 'maven', label: 'Maven (Java)' },
    { value: 'nuget', label: 'NuGet (.NET)' },
    { value: 'cargo', label: 'Cargo (Rust)' },
    { value: 'go', label: 'Go Modules' },
    { value: 'rubygems', label: 'RubyGems' },
    { value: 'composer', label: 'Composer (PHP)' }
  ];

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
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Mock response
      const hasVulnerabilities = Math.random() > 0.5;
      let responseContent = '';
      let vulnerabilities = [];

      if (formData.cve) {
        responseContent = `CVE ${formData.cve} is a ${['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'][Math.floor(Math.random() * 4)]} severity vulnerability. It affects several packages in the ecosystem.`;
        vulnerabilities = [{
          id: formData.cve,
          severity: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'][Math.floor(Math.random() * 4)],
          package: 'affected-package',
          version: '1.0.0',
          description: 'This is a mock vulnerability description for demonstration purposes.'
        }];
      } else {
        if (hasVulnerabilities) {
          const vulnCount = Math.floor(Math.random() * 3) + 1;
          responseContent = `Found ${vulnCount} vulnerabilit${vulnCount > 1 ? 'ies' : 'y'} in ${formData.packageName}${formData.version ? ` version ${formData.version}` : ''}. Here are the details:`;
          vulnerabilities = Array.from({ length: vulnCount }, (_, i) => ({
            id: `CVE-2024-${1000 + i}`,
            severity: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'][Math.floor(Math.random() * 4)],
            package: formData.packageName,
            version: formData.version || '1.0.0',
            description: `Mock vulnerability ${i + 1} for demonstration purposes.`
          }));
        } else {
          responseContent = `Good news! No known vulnerabilities found in ${formData.packageName}${formData.version ? ` version ${formData.version}` : ''}. The package appears to be secure based on current OSV data.`;
        }
      }

      // Add assistant response
      addMessage({
        type: 'assistant',
        content: responseContent,
        vulnerabilities: vulnerabilities.length > 0 ? vulnerabilities : undefined,
      });

      toast({
        title: "Query completed",
        description: `Analysis complete for ${formData.packageName || formData.cve}`,
      });

    } catch (error) {
      toast({
        title: "Query failed",
        description: "There was an error processing your query. Please try again.",
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

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="packageName">Package Name</Label>
        <Input
          id="packageName"
          placeholder="e.g., lodash, express"
          value={formData.packageName}
          onChange={(e) => setFormData(prev => ({ ...prev, packageName: e.target.value }))}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="ecosystem">Ecosystem</Label>
        <Select value={formData.ecosystem} onValueChange={(value) => setFormData(prev => ({ ...prev, ecosystem: value }))}>
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
