import React, { useEffect, useRef, useState } from 'react';
import { DataSet, Network } from 'vis-network/standalone/esm/vis-network';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ZoomIn, ZoomOut, Maximize2, HelpCircle } from 'lucide-react';

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

interface DependencyGraphData {
  nodes: DependencyGraphNode[];
  edges: DependencyGraphEdge[];
}

interface DependencyGraphProps {
  data: DependencyGraphData;
  className?: string;
}

const DependencyGraph: React.FC<DependencyGraphProps> = ({ data, className = '' }) => {
  const networkRef = useRef<HTMLDivElement>(null);
  const networkInstance = useRef<Network | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [selectedNode, setSelectedNode] = useState<DependencyGraphNode | null>(null);

  useEffect(() => {
    if (!networkRef.current || !data.nodes.length) return;

    // Transform data for vis-network
    const nodes = new DataSet(
      data.nodes.map(node => ({
        id: node.id,
        label: `${node.label}\n${node.version ? `v${node.version}` : ''}`,
        title: `${node.label}@${node.version || 'unknown'}\nEcosystem: ${node.ecosystem}\nVulnerabilities: ${node.vulnerabilityCount}`,
        color: {
          background: node.hasVulnerabilities 
            ? node.vulnerabilityCount >= 3 ? '#ef4444' // red for high vuln count
            : node.vulnerabilityCount >= 1 ? '#f97316' // orange for some vulns  
            : '#10b981' // green for safe
            : '#6b7280', // gray for unknown
          border: node.hasVulnerabilities ? '#dc2626' : '#374151',
          font: { color: node.hasVulnerabilities ? 'white' : 'black' }
        },
        font: { size: 12, face: 'Arial' },
        shape: 'box',
        margin: 8,
        chosen: true
      }))
    );

    const edges = new DataSet(
      data.edges.map(edge => ({
        from: edge.from,
        to: edge.to,
        label: edge.relationship.replace('_', '\n'),
        arrows: 'to',
        color: { color: '#6b7280' },
        font: { size: 10 },
        smooth: { type: 'continuous' }
      }))
    );

    const options = {
      layout: {
        hierarchical: {
          enabled: true,
          levelSeparation: 150,
          nodeSpacing: 200,
          treeSpacing: 200,
          blockShifting: true,
          edgeMinimization: true,
          parentCentralization: true,
          direction: 'UD', // Up-Down
          sortMethod: 'directed'
        }
      },
      physics: {
        enabled: false
      },
      nodes: {
        borderWidth: 2,
        shadow: true,
        font: {
          size: 12,
          face: 'Arial'
        }
      },
      edges: {
        width: 2,
        shadow: true,
        smooth: {
          type: 'continuous'
        }
      },
      interaction: {
        dragNodes: true,
        dragView: true,
        zoomView: true,
        selectConnectedEdges: true
      },
      configure: {
        enabled: false
      }
    };

    networkInstance.current = new Network(networkRef.current, { nodes, edges }, options);

    // Handle node selection
    networkInstance.current.on('click', (params) => {
      if (params.nodes.length > 0) {
        const nodeId = params.nodes[0];
        const node = data.nodes.find(n => n.id === nodeId);
        setSelectedNode(node || null);
      } else {
        setSelectedNode(null);
      }
    });

    return () => {
      if (networkInstance.current) {
        networkInstance.current.destroy();
      }
    };
  }, [data]);

  const handleZoomIn = () => {
    if (networkInstance.current) {
      const scale = networkInstance.current.getScale();
      networkInstance.current.moveTo({ scale: scale * 1.2 });
    }
  };

  const handleZoomOut = () => {
    if (networkInstance.current) {
      const scale = networkInstance.current.getScale();
      networkInstance.current.moveTo({ scale: scale * 0.8 });
    }
  };

  const handleFit = () => {
    if (networkInstance.current) {
      networkInstance.current.fit();
    }
  };

  const toggleExpanded = () => {
    setIsExpanded(!isExpanded);
    // Trigger a re-fit after expansion animation
    setTimeout(() => {
      if (networkInstance.current) {
        networkInstance.current.fit();
      }
    }, 300);
  };

  if (!data.nodes.length) {
    return (
      <Card className={`${className} border-gray-200`}>
        <CardHeader>
          <CardTitle className="text-lg">📊 Dependency Graph</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-600">No dependency relationships found in this SBOM.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={`${className} border-gray-200 ${isExpanded ? 'fixed inset-4 z-50 bg-white' : ''}`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">📊 Dependency Graph ({data.nodes.length} packages)</CardTitle>
          <div className="flex items-center space-x-2">
            <Button variant="outline" size="sm" onClick={handleZoomOut}>
              <ZoomOut className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={handleZoomIn}>
              <ZoomIn className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={handleFit}>
              Fit
            </Button>
            <Button variant="outline" size="sm" onClick={toggleExpanded}>
              <Maximize2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
        
        <div className="flex items-start space-x-4 text-sm text-gray-600">
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-red-500 rounded"></div>
            <span>High vulnerabilities (3+)</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-orange-500 rounded"></div>
            <span>Some vulnerabilities</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-green-500 rounded"></div>
            <span>No vulnerabilities</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-gray-500 rounded"></div>
            <span>Not scanned</span>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="p-0">
        <div className="relative">
          <div
            ref={networkRef}
            className={`bg-gray-50 border-t ${isExpanded ? 'h-[calc(100vh-200px)]' : 'h-96'}`}
            style={{ width: '100%' }}
          />
          
          {selectedNode && (
            <div className="absolute top-4 left-4 bg-white border border-gray-200 rounded-lg p-3 shadow-lg max-w-sm">
              <h4 className="font-semibold text-sm">{selectedNode.label}</h4>
              <p className="text-xs text-gray-600">Version: {selectedNode.version || 'unknown'}</p>
              <p className="text-xs text-gray-600">Ecosystem: {selectedNode.ecosystem}</p>
              <p className="text-xs text-gray-600">
                Vulnerabilities: {selectedNode.vulnerabilityCount}
                {selectedNode.hasVulnerabilities && (
                  <span className="ml-1 text-red-600 font-medium">⚠️</span>
                )}
              </p>
            </div>
          )}
        </div>
        
        <div className="p-4 bg-blue-50 border-t border-blue-200">
          <div className="flex items-start space-x-2">
            <HelpCircle className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-blue-800">
              <p className="font-medium mb-1">Need help understanding this graph?</p>
              <p>Click on nodes to see details, or ask me questions like:</p>
              <ul className="list-disc list-inside text-xs mt-1 space-y-0.5">
                <li><em>"What does package X depend on?"</em></li>
                <li><em>"Which packages depend on Y?"</em></li>
                <li><em>"Explain the dependency relationships"</em></li>
                <li><em>"What would happen if I update package Z?"</em></li>
              </ul>
            </div>
          </div>
        </div>
      </CardContent>
      
      {isExpanded && (
        <div className="absolute top-4 right-4">
          <Button variant="outline" size="sm" onClick={toggleExpanded}>
            ✕ Close
          </Button>
        </div>
      )}
    </Card>
  );
};

export default DependencyGraph; 