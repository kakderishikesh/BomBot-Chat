
import { Card, CardContent } from '@/components/ui/card';
import { Shield, Brain, Database, Lock, Mail } from 'lucide-react';

const About = () => {
  const techStack = [
    { name: 'OSV Database', description: 'Open source vulnerability database for comprehensive security data' },
    { name: 'OpenAI GPT', description: 'Advanced AI models for intelligent vulnerability analysis' },
    { name: 'React + TypeScript', description: 'Modern frontend framework with type safety' },
    { name: 'Tailwind CSS', description: 'Utility-first CSS framework for responsive design' }
  ];

  const securityFeatures = [
    { name: 'File Validation', description: 'Strict validation of uploaded SBOM files' },
    { name: 'Data Privacy', description: 'Your files are processed securely and not stored permanently' },
    { name: 'Encrypted Communication', description: 'All data transmission is encrypted' },
    { name: 'No Data Retention', description: 'Analysis results are temporary and user-controlled' }
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-12">
      {/* Header */}
      <div className="text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-6">
          <Shield className="h-8 w-8 text-blue-600" />
        </div>
        <h1 className="text-4xl font-bold text-gray-900 mb-4">About BomBot</h1>
        <p className="text-xl text-gray-600 max-w-2xl mx-auto">
          AI-powered SBOM vulnerability scanner built for modern software security
        </p>
      </div>

      {/* What is BomBot */}
      <Card>
        <CardContent className="p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center">
            <Brain className="h-6 w-6 text-blue-600 mr-2" />
            What is BomBot?
          </h2>
          <div className="prose prose-gray max-w-none">
            <p className="text-gray-600 leading-relaxed mb-4">
              BomBot is an intelligent vulnerability scanner designed specifically for Software Bill of Materials (SBOM) files. 
              It combines the power of the OSV (Open Source Vulnerabilities) database with advanced AI analysis to provide 
              comprehensive security insights for your software supply chain.
            </p>
            <p className="text-gray-600 leading-relaxed mb-4">
              SBOM files contain detailed information about all the components, libraries, and dependencies in your software. 
              By analyzing these files, BomBot can identify potential security vulnerabilities, assess their severity, 
              and provide actionable recommendations for remediation.
            </p>
            <p className="text-gray-600 leading-relaxed">
              Our AI-powered analysis goes beyond simple database lookups, providing contextual insights and helping you 
              understand the impact of vulnerabilities on your specific use case.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Technology Stack */}
      <Card>
        <CardContent className="p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
            <Database className="h-6 w-6 text-green-600 mr-2" />
            Technology Stack
          </h2>
          <div className="grid md:grid-cols-2 gap-6">
            {techStack.map((tech) => (
              <div key={tech.name} className="border border-gray-200 rounded-lg p-4">
                <h3 className="font-semibold text-gray-900 mb-2">{tech.name}</h3>
                <p className="text-gray-600 text-sm">{tech.description}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Security Features */}
      <Card>
        <CardContent className="p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
            <Lock className="h-6 w-6 text-orange-600 mr-2" />
            Security & Privacy
          </h2>
          <div className="grid md:grid-cols-2 gap-6">
            {securityFeatures.map((feature) => (
              <div key={feature.name} className="border border-gray-200 rounded-lg p-4">
                <h3 className="font-semibold text-gray-900 mb-2">{feature.name}</h3>
                <p className="text-gray-600 text-sm">{feature.description}</p>
              </div>
            ))}
          </div>
          <div className="mt-6 p-4 bg-orange-50 border border-orange-200 rounded-lg">
            <p className="text-orange-800 text-sm">
              <strong>Privacy Notice:</strong> BomBot processes your SBOM files to provide vulnerability analysis. 
              Files are temporarily stored during analysis and automatically deleted. We do not retain your data 
              or share it with third parties.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Contact & Support */}
      <Card>
        <CardContent className="p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center">
            <Mail className="h-6 w-6 text-blue-600 mr-2" />
            Contact & Support
          </h2>
          <p className="text-gray-600 leading-relaxed mb-6">
            Need help with BomBot? Have questions about SBOM analysis or found a security issue? 
            We're here to help.
          </p>
          <div className="flex items-center space-x-4">
            <span className="font-medium text-gray-900">Contact:</span>
            <a href="mailto:support@bombot.com" className="text-blue-600 hover:text-blue-700">
              support@bombot.com
            </a>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default About;
