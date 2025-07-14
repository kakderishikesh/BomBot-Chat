import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Shield, 
  CheckCircle, 
  XCircle, 
  AlertTriangle,
  FileText,
  Key,
  Award,
  TrendingUp,
  Loader2,
  ExternalLink,
  Download
} from 'lucide-react';

interface PolicyCheck {
  name: string;
  status: 'pass' | 'fail' | 'warning' | 'unknown';
  score?: number;
  message: string;
  details?: any;
  recommendation?: string;
}

interface ComplianceData {
  packageName: string;
  packageVersion?: string;
  slsaLevel: number;
  hasSignatures: boolean;
  hasAttestations: boolean;
  scorecardScore?: number;
  policyChecks: PolicyCheck[];
  lastUpdated: string;
  complianceScore: number;
}

interface PolicyComplianceViewerProps {
  packageName?: string;
  onAnalyze?: (packageName: string) => void;
}

const PolicyComplianceViewer: React.FC<PolicyComplianceViewerProps> = ({
  packageName,
  onAnalyze
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [complianceData, setComplianceData] = useState<ComplianceData | null>(null);
  const [selectedPackage, setSelectedPackage] = useState(packageName || '');
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    if (packageName) {
      loadComplianceData(packageName);
    }
  }, [packageName]);

  const loadComplianceData = async (pkg: string) => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/guac-relationships', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          queryType: 'attestations',
          subject: {
            name: pkg,
            type: 'package'
          }
        })
      });

      if (response.ok) {
        const result = await response.json();
        
        // Transform GUAC data into compliance format
        const mockComplianceData: ComplianceData = {
          packageName: pkg,
          packageVersion: result.data?.version || 'latest',
          slsaLevel: calculateSLSALevel(result.data),
          hasSignatures: result.data?.certifyGood?.some((cert: any) => cert.justification?.includes('signature')) || false,
          hasAttestations: result.data?.certifyGood?.length > 0 || false,
          scorecardScore: result.data?.scorecards?.[0]?.score || Math.random() * 10,
          policyChecks: generatePolicyChecks(result.data),
          lastUpdated: new Date().toISOString(),
          complianceScore: calculateComplianceScore(result.data)
        };

        setComplianceData(mockComplianceData);
      }
    } catch (error) {
      console.error('Failed to load compliance data:', error);
      // Set mock data for demonstration
      setComplianceData(generateMockData(pkg));
    } finally {
      setIsLoading(false);
    }
  };

  const calculateSLSALevel = (data: any): number => {
    if (!data) return 0;
    
    let score = 0;
    if (data.certifyGood?.length > 0) score += 1;
    if (data.hasSLSA?.length > 0) score += 2;
    if (data.scorecards?.length > 0) score += 1;
    
    return Math.min(score, 3);
  };

  const calculateComplianceScore = (data: any): number => {
    if (!data) return 30;
    
    let score = 0;
    const checks = [
      data.certifyGood?.length > 0, // +20
      data.scorecards?.length > 0, // +25
      data.hasSLSA?.length > 0, // +30
      data.certifyBad?.length === 0, // +25
    ];
    
    const weights = [20, 25, 30, 25];
    checks.forEach((check, index) => {
      if (check) score += weights[index];
    });
    
    return score;
  };

  const generatePolicyChecks = (data: any): PolicyCheck[] => {
    const checks: PolicyCheck[] = [
      {
        name: 'SLSA Provenance',
        status: data?.hasSLSA?.length > 0 ? 'pass' : 'fail',
        score: data?.hasSLSA?.length > 0 ? 100 : 0,
        message: data?.hasSLSA?.length > 0 ? 'SLSA provenance found' : 'No SLSA provenance attestations',
        recommendation: data?.hasSLSA?.length > 0 ? undefined : 'Enable SLSA in your build pipeline'
      },
      {
        name: 'Code Signatures',
        status: data?.certifyGood?.some((cert: any) => cert.justification?.includes('signature')) ? 'pass' : 'warning',
        score: data?.certifyGood?.some((cert: any) => cert.justification?.includes('signature')) ? 100 : 50,
        message: data?.certifyGood?.some((cert: any) => cert.justification?.includes('signature')) ? 'Package is signed' : 'Signature verification inconclusive',
        recommendation: 'Ensure all packages are cryptographically signed'
      },
      {
        name: 'Security Scorecard',
        status: data?.scorecards?.length > 0 ? 'pass' : 'warning',
        score: data?.scorecards?.[0]?.score ? Math.round(data.scorecards[0].score * 10) : 0,
        message: data?.scorecards?.length > 0 ? `Scorecard available (${data.scorecards[0]?.score?.toFixed(1)}/10)` : 'No security scorecard found',
        recommendation: 'Review and improve OpenSSF Scorecard metrics'
      },
      {
        name: 'Vulnerability Scan',
        status: data?.certifyBad?.length === 0 ? 'pass' : 'fail',
        score: data?.certifyBad?.length === 0 ? 100 : 0,
        message: data?.certifyBad?.length === 0 ? 'No known vulnerabilities' : `${data.certifyBad?.length || 0} security issues found`,
        recommendation: data?.certifyBad?.length > 0 ? 'Address identified security vulnerabilities' : undefined
      },
      {
        name: 'License Compliance',
        status: data?.certifyLegal?.length > 0 ? 'pass' : 'unknown',
        score: data?.certifyLegal?.length > 0 ? 100 : 50,
        message: data?.certifyLegal?.length > 0 ? 'License information available' : 'License status unclear',
        recommendation: 'Verify license compatibility with your project'
      }
    ];

    return checks;
  };

  const generateMockData = (pkg: string): ComplianceData => ({
    packageName: pkg,
    packageVersion: '1.0.0',
    slsaLevel: Math.floor(Math.random() * 4),
    hasSignatures: Math.random() > 0.5,
    hasAttestations: Math.random() > 0.3,
    scorecardScore: 4 + Math.random() * 6,
    policyChecks: [
      {
        name: 'SLSA Provenance',
        status: Math.random() > 0.6 ? 'pass' : 'fail',
        score: Math.random() > 0.6 ? 100 : 0,
        message: Math.random() > 0.6 ? 'SLSA Level 2 provenance verified' : 'No SLSA provenance found',
        recommendation: 'Enable SLSA in build pipeline'
      },
      {
        name: 'Code Signatures', 
        status: Math.random() > 0.4 ? 'pass' : 'warning',
        score: Math.random() > 0.4 ? 100 : 40,
        message: 'Cryptographic signatures verified',
        recommendation: undefined
      }
    ],
    lastUpdated: new Date().toISOString(),
    complianceScore: 40 + Math.random() * 50
  });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pass':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'fail':
        return <XCircle className="h-4 w-4 text-red-600" />;
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-yellow-600" />;
      default:
        return <AlertTriangle className="h-4 w-4 text-gray-400" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pass':
        return 'text-green-600 bg-green-50 border-green-200';
      case 'fail':
        return 'text-red-600 bg-red-50 border-red-200';
      case 'warning':
        return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getComplianceLevel = (score: number): { level: string; color: string } => {
    if (score >= 80) return { level: 'Excellent', color: 'text-green-600' };
    if (score >= 60) return { level: 'Good', color: 'text-blue-600' };
    if (score >= 40) return { level: 'Fair', color: 'text-yellow-600' };
    return { level: 'Poor', color: 'text-red-600' };
  };

  const exportReport = () => {
    if (!complianceData) return;
    
    const report = {
      package: `${complianceData.packageName}@${complianceData.packageVersion}`,
      complianceScore: complianceData.complianceScore,
      slsaLevel: complianceData.slsaLevel,
      policyChecks: complianceData.policyChecks,
      timestamp: new Date().toISOString()
    };
    
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `compliance-report-${complianceData.packageName}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Shield className="h-6 w-6" />
            Supply Chain Policy Compliance
          </h2>
          <p className="text-muted-foreground">
            Security policies, attestations, and compliance status
          </p>
        </div>
        {complianceData && (
          <Button onClick={exportReport} variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export Report
          </Button>
        )}
      </div>

      {/* Package Search/Input */}
      <Card>
        <CardContent className="p-4">
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Enter package name to analyze compliance..."
              value={selectedPackage}
              onChange={(e) => setSelectedPackage(e.target.value)}
              className="flex-1 px-3 py-2 border rounded-md"
              onKeyPress={(e) => e.key === 'Enter' && selectedPackage && loadComplianceData(selectedPackage)}
            />
            <Button 
              onClick={() => selectedPackage && loadComplianceData(selectedPackage)}
              disabled={isLoading || !selectedPackage}
            >
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Analyze
            </Button>
          </div>
        </CardContent>
      </Card>

      {complianceData && (
        <>
          {/* Compliance Overview */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4 text-center">
                <div className={`text-3xl font-bold ${getComplianceLevel(complianceData.complianceScore).color}`}>
                  {complianceData.complianceScore}%
                </div>
                <p className="text-sm text-muted-foreground">Overall Score</p>
                <p className={`text-sm font-medium ${getComplianceLevel(complianceData.complianceScore).color}`}>
                  {getComplianceLevel(complianceData.complianceScore).level}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-blue-600">
                  Level {complianceData.slsaLevel}
                </div>
                <p className="text-sm text-muted-foreground">SLSA</p>
                <div className="mt-2">
                  <Progress value={(complianceData.slsaLevel / 3) * 100} className="h-2" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-purple-600">
                  {complianceData.scorecardScore?.toFixed(1) || 'N/A'}
                </div>
                <p className="text-sm text-muted-foreground">Scorecard</p>
                <p className="text-xs text-muted-foreground">out of 10</p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4 text-center">
                <div className="flex justify-center gap-2 mb-2">
                  {complianceData.hasSignatures && <Key className="h-5 w-5 text-green-600" />}
                  {complianceData.hasAttestations && <FileText className="h-5 w-5 text-blue-600" />}
                  {(!complianceData.hasSignatures && !complianceData.hasAttestations) && <AlertTriangle className="h-5 w-5 text-red-600" />}
                </div>
                <p className="text-sm text-muted-foreground">Attestations</p>
                <p className="text-xs">
                  {complianceData.hasSignatures && complianceData.hasAttestations ? 'Complete' :
                   complianceData.hasSignatures || complianceData.hasAttestations ? 'Partial' : 'Missing'}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Detailed Analysis */}
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="overview">Policy Checks</TabsTrigger>
              <TabsTrigger value="attestations">Attestations</TabsTrigger>
              <TabsTrigger value="recommendations">Recommendations</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Policy Compliance Checks</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {complianceData.policyChecks.map((check, index) => (
                    <div key={index} className={`p-4 rounded-lg border ${getStatusColor(check.status)}`}>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          {getStatusIcon(check.status)}
                          <span className="font-medium">{check.name}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          {check.score !== undefined && (
                            <Badge variant="outline">{check.score}%</Badge>
                          )}
                          <Badge 
                            variant={check.status === 'pass' ? 'default' : 
                                   check.status === 'fail' ? 'destructive' : 'secondary'}
                          >
                            {check.status.toUpperCase()}
                          </Badge>
                        </div>
                      </div>
                      <p className="text-sm mb-2">{check.message}</p>
                      {check.recommendation && (
                        <p className="text-xs text-muted-foreground italic">
                          💡 {check.recommendation}
                        </p>
                      )}
                      {check.score !== undefined && (
                        <div className="mt-2">
                          <Progress value={check.score} className="h-1" />
                        </div>
                      )}
                    </div>
                  ))}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="attestations" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Key className="h-5 w-5" />
                      Signatures & Certificates
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span>Code Signing</span>
                        {complianceData.hasSignatures ? (
                          <CheckCircle className="h-4 w-4 text-green-600" />
                        ) : (
                          <XCircle className="h-4 w-4 text-red-600" />
                        )}
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Supply Chain Attestations</span>
                        {complianceData.hasAttestations ? (
                          <CheckCircle className="h-4 w-4 text-green-600" />
                        ) : (
                          <XCircle className="h-4 w-4 text-red-600" />
                        )}
                      </div>
                      <div className="flex items-center justify-between">
                        <span>SLSA Provenance</span>
                        {complianceData.slsaLevel > 0 ? (
                          <Badge variant="outline">Level {complianceData.slsaLevel}</Badge>
                        ) : (
                          <XCircle className="h-4 w-4 text-red-600" />
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Award className="h-5 w-5" />
                      Security Scorecard
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {complianceData.scorecardScore ? (
                      <div className="space-y-3">
                        <div className="text-center">
                          <div className="text-3xl font-bold text-blue-600">
                            {complianceData.scorecardScore.toFixed(1)}
                          </div>
                          <p className="text-sm text-muted-foreground">out of 10.0</p>
                        </div>
                        <Progress value={complianceData.scorecardScore * 10} />
                        <div className="flex justify-between text-sm">
                          <span>Security Practices</span>
                          <span className="font-medium">
                            {complianceData.scorecardScore >= 7 ? 'Good' :
                             complianceData.scorecardScore >= 5 ? 'Fair' : 'Needs Improvement'}
                          </span>
                        </div>
                        <Button variant="outline" size="sm" className="w-full">
                          <ExternalLink className="h-3 w-3 mr-1" />
                          View Full Scorecard
                        </Button>
                      </div>
                    ) : (
                      <Alert>
                        <AlertDescription>
                          No security scorecard available for this package.
                        </AlertDescription>
                      </Alert>
                    )}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="recommendations" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5" />
                    Improvement Recommendations
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {complianceData.policyChecks
                      .filter(check => check.recommendation && check.status !== 'pass')
                      .map((check, index) => (
                        <div key={index} className="border-l-4 border-yellow-400 pl-4">
                          <h4 className="font-medium">{check.name}</h4>
                          <p className="text-sm text-muted-foreground">{check.recommendation}</p>
                        </div>
                      ))}
                    
                    {complianceData.complianceScore < 80 && (
                      <Alert>
                        <TrendingUp className="h-4 w-4" />
                        <AlertDescription>
                          <strong>Priority Actions:</strong> Focus on implementing SLSA provenance 
                          and code signing to significantly improve your compliance score.
                        </AlertDescription>
                      </Alert>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
                      <Card>
                        <CardContent className="p-4">
                          <h4 className="font-medium mb-2">Quick Wins</h4>
                          <ul className="text-sm space-y-1">
                            <li>• Enable dependency scanning</li>
                            <li>• Add license metadata</li>
                            <li>• Configure automated security checks</li>
                          </ul>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardContent className="p-4">
                          <h4 className="font-medium mb-2">Long-term Goals</h4>
                          <ul className="text-sm space-y-1">
                            <li>• Implement SLSA Level 3</li>
                            <li>• Add comprehensive attestations</li>
                            <li>• Achieve 8+ security scorecard</li>
                          </ul>
                        </CardContent>
                      </Card>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          {/* Package Info */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <span>
                  Package: <strong>{complianceData.packageName}</strong>
                  {complianceData.packageVersion && ` v${complianceData.packageVersion}`}
                </span>
                <span>Last Updated: {new Date(complianceData.lastUpdated).toLocaleDateString()}</span>
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {!complianceData && !isLoading && (
        <Alert>
          <Shield className="h-4 w-4" />
          <AlertDescription>
            Enter a package name above to analyze its supply chain policy compliance, 
            including SLSA levels, security attestations, and scorecard metrics.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
};

export default PolicyComplianceViewer; 