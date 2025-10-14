
import { Link } from 'react-router-dom';
import { Shield, Zap, BarChart3, Upload, Search, FileText, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

const Index = () => {
  const features = [
    {
      icon: Shield,
      title: 'AI-Powered Analysis',
      description: 'Get intelligent insights on vulnerabilities using advanced AI models'
    },
    {
      icon: Zap,
      title: 'Instant Results',
      description: 'Fast scanning using OSV database and real-time vulnerability detection'
    },
    {
      icon: BarChart3,
      title: 'Detailed Reports',
      description: 'Comprehensive vulnerability breakdown with severity levels and recommendations'
    }
  ];

  const steps = [
    {
      icon: Upload,
      title: 'Upload SBOM',
      description: 'Drag and drop your Software Bill of Materials file'
    },
    {
      icon: Search,
      title: 'AI Analyzes',
      description: 'Our AI scans for vulnerabilities using the OSV database'
    },
    {
      icon: FileText,
      title: 'Get Report',
      description: 'Receive detailed vulnerability analysis and recommendations'
    }
  ];

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-blue-50 via-white to-blue-50 pt-20 pb-32">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center animate-fade-in">
            <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6 leading-tight">
              BOMbot
              <span className="block text-blue-600">AI-Powered SBOM Security Scanner</span>
            </h1>
            <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto leading-relaxed">
              Upload your Software Bill of Materials and get instant vulnerability analysis 
              powered by OpenAI. Protect your software supply chain with intelligent security insights.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Button size="lg" asChild className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 text-lg group">
                <Link to="/chat" className="flex items-center space-x-2">
                  <span>Start Scanning</span>
                  <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
                </Link>
              </Button>
              <Button variant="outline" size="lg" asChild className="px-8 py-3 text-lg">
                <Link to="/about">Learn More</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Powerful Security Features
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Advanced AI-driven vulnerability detection for modern software supply chains
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <Card key={feature.title} className="hover:shadow-lg transition-shadow duration-300 border-0 shadow-md group">
                <CardContent className="p-8 text-center">
                  <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-6 group-hover:bg-blue-200 transition-colors">
                    <feature.icon className="h-8 w-8 text-blue-600" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-4">{feature.title}</h3>
                  <p className="text-gray-600 leading-relaxed">{feature.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              How It Works
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Simple, fast, and secure vulnerability scanning in three easy steps
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {steps.map((step, index) => (
              <div key={step.title} className="text-center group">
                <div className="relative mb-8">
                  <div className="inline-flex items-center justify-center w-20 h-20 bg-blue-600 rounded-full text-white mb-4 group-hover:bg-blue-700 transition-colors">
                    <step.icon className="h-10 w-10" />
                  </div>
                  <div className="absolute -top-2 -right-2 w-8 h-8 bg-orange-500 rounded-full flex items-center justify-center text-white font-bold text-sm">
                    {index + 1}
                  </div>
                  {index < steps.length - 1 && (
                    <div className="hidden md:block absolute top-10 left-full w-full h-px bg-gray-300"></div>
                  )}
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-4">{step.title}</h3>
                <p className="text-gray-600 leading-relaxed">{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-blue-600">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold text-white mb-4">
            Ready to Secure Your Software Supply Chain?
          </h2>
          <p className="text-xl text-blue-100 mb-8">
            Start scanning your SBOM files today and discover vulnerabilities before they become threats.
          </p>
          <Button size="lg" variant="secondary" asChild className="px-8 py-3 text-lg">
            <Link to="/chat">Get Started Now</Link>
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-center">
            <div className="text-center">
              <div className="flex items-center justify-center space-x-2 mb-4">
                <Shield className="h-8 w-8 text-blue-400" />
                <span className="text-xl font-bold text-white">BOMbot</span>
              </div>
              <p className="text-gray-400 leading-relaxed">
                AI-powered SBOM vulnerability scanner for modern software security.
              </p>
            </div>
          </div>
          
          <div className="border-t border-gray-800 mt-8 pt-8 text-center">
            <p className="text-gray-400">
              © 2025 BOMbot. Built with security in mind.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
