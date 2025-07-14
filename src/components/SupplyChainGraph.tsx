import React, { useState, useEffect, useRef } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  ZoomIn, 
  ZoomOut, 
  RotateCcw, 
  Download,
  Package,
  AlertTriangle,
  Shield,
  ExternalLink
} from 'lucide-react';

interface GraphNode {
  id: string;
  label: string;
  type: 'package' | 'vulnerability' | 'sbom' | 'attestation';
  version?: string;
  ecosystem?: string;
  vulnerabilityCount?: number;
  riskLevel?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  x?: number;
  y?: number;
  fx?: number;
  fy?: number;
}

interface GraphEdge {
  source: string;
  target: string;
  relationship: string;
  strength?: number;
}

interface SupplyChainGraphProps {
  data?: {
    nodes: GraphNode[];
    edges: GraphEdge[];
  };
  onNodeClick?: (node: GraphNode) => void;
  width?: number;
  height?: number;
}

const SupplyChainGraph: React.FC<SupplyChainGraphProps> = ({
  data,
  onNodeClick,
  width = 800,
  height = 600
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [zoom, setZoom] = useState(1);
  const [panX, setPanX] = useState(0);
  const [panY, setPanY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  // Simple force-directed layout simulation
  useEffect(() => {
    if (!data || !data.nodes.length) return;

    const nodes = [...data.nodes];
    const edges = data.edges;

    // Initialize positions if not set
    nodes.forEach((node, i) => {
      if (node.x === undefined || node.y === undefined) {
        node.x = Math.random() * (width - 100) + 50;
        node.y = Math.random() * (height - 100) + 50;
      }
    });

    // Simple force simulation
    const simulation = () => {
      const iterations = 100;
      const centerForce = 0.01;
      const repelForce = 800;
      const linkForce = 30;
      const damping = 0.9;

      for (let iter = 0; iter < iterations; iter++) {
        // Apply center force
        nodes.forEach(node => {
          const dx = (width / 2) - (node.x || 0);
          const dy = (height / 2) - (node.y || 0);
          node.x = (node.x || 0) + dx * centerForce;
          node.y = (node.y || 0) + dy * centerForce;
        });

        // Apply repulsion between nodes
        for (let i = 0; i < nodes.length; i++) {
          for (let j = i + 1; j < nodes.length; j++) {
            const nodeA = nodes[i];
            const nodeB = nodes[j];
            const dx = (nodeB.x || 0) - (nodeA.x || 0);
            const dy = (nodeB.y || 0) - (nodeA.y || 0);
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance > 0) {
              const force = repelForce / (distance * distance);
              const fx = (dx / distance) * force;
              const fy = (dy / distance) * force;
              
              nodeA.x = (nodeA.x || 0) - fx;
              nodeA.y = (nodeA.y || 0) - fy;
              nodeB.x = (nodeB.x || 0) + fx;
              nodeB.y = (nodeB.y || 0) + fy;
            }
          }
        }

        // Apply link forces
        edges.forEach(edge => {
          const source = nodes.find(n => n.id === edge.source);
          const target = nodes.find(n => n.id === edge.target);
          
          if (source && target) {
            const dx = (target.x || 0) - (source.x || 0);
            const dy = (target.y || 0) - (source.y || 0);
            const distance = Math.sqrt(dx * dx + dy * dy);
            const targetDistance = linkForce;
            
            if (distance > 0) {
              const force = (distance - targetDistance) * 0.1;
              const fx = (dx / distance) * force;
              const fy = (dy / distance) * force;
              
              source.x = (source.x || 0) + fx;
              source.y = (source.y || 0) + fy;
              target.x = (target.x || 0) - fx;
              target.y = (target.y || 0) - fy;
            }
          }
        });

        // Apply damping
        nodes.forEach(node => {
          node.x = (node.x || 0) * damping;
          node.y = (node.y || 0) * damping;
        });
      }
    };

    simulation();
  }, [data, width, height]);

  const getNodeColor = (node: GraphNode): string => {
    switch (node.type) {
      case 'package':
        if (node.vulnerabilityCount && node.vulnerabilityCount > 0) {
          return node.riskLevel === 'CRITICAL' ? '#dc2626' : '#ea580c';
        }
        return '#16a34a';
      case 'vulnerability':
        return '#dc2626';
      case 'sbom':
        return '#3b82f6';
      case 'attestation':
        return '#7c3aed';
      default:
        return '#6b7280';
    }
  };

  const getNodeIcon = (node: GraphNode): React.ReactNode => {
    switch (node.type) {
      case 'package':
        return <Package className="h-4 w-4" />;
      case 'vulnerability':
        return <AlertTriangle className="h-4 w-4" />;
      case 'attestation':
        return <Shield className="h-4 w-4" />;
      default:
        return <Package className="h-4 w-4" />;
    }
  };

  const handleNodeClick = (node: GraphNode) => {
    setSelectedNode(node);
    onNodeClick?.(node);
  };

  const handleZoom = (delta: number) => {
    const newZoom = Math.max(0.1, Math.min(3, zoom + delta));
    setZoom(newZoom);
  };

  const handleReset = () => {
    setZoom(1);
    setPanX(0);
    setPanY(0);
    setSelectedNode(null);
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - panX, y: e.clientY - panY });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging) {
      setPanX(e.clientX - dragStart.x);
      setPanY(e.clientY - dragStart.y);
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const exportSVG = () => {
    if (svgRef.current) {
      const svgData = new XMLSerializer().serializeToString(svgRef.current);
      const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
      const svgUrl = URL.createObjectURL(svgBlob);
      const downloadLink = document.createElement('a');
      downloadLink.href = svgUrl;
      downloadLink.download = 'supply-chain-graph.svg';
      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);
      URL.revokeObjectURL(svgUrl);
    }
  };

  if (!data || !data.nodes.length) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Supply Chain Graph</CardTitle>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertDescription>
              No supply chain data available. Upload an SBOM or query specific packages to visualize relationships.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Supply Chain Graph</span>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => handleZoom(0.1)}>
                <ZoomIn className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={() => handleZoom(-0.1)}>
                <ZoomOut className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={handleReset}>
                <RotateCcw className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={exportSVG}>
                <Download className="h-4 w-4" />
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="relative border rounded-lg overflow-hidden" style={{ width, height }}>
            <svg
              ref={svgRef}
              width={width}
              height={height}
              className="cursor-move"
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
            >
              <g transform={`translate(${panX}, ${panY}) scale(${zoom})`}>
                {/* Render edges */}
                {data.edges.map((edge, index) => {
                  const source = data.nodes.find(n => n.id === edge.source);
                  const target = data.nodes.find(n => n.id === edge.target);
                  
                  if (!source || !target) return null;
                  
                  return (
                    <g key={index}>
                      <line
                        x1={source.x}
                        y1={source.y}
                        x2={target.x}
                        y2={target.y}
                        stroke="#6b7280"
                        strokeWidth={1}
                        strokeDasharray={edge.relationship === 'DEPENDS_ON' ? 'none' : '3,3'}
                      />
                      {/* Edge label */}
                      <text
                        x={(source.x! + target.x!) / 2}
                        y={(source.y! + target.y!) / 2}
                        textAnchor="middle"
                        fontSize="10"
                        fill="#6b7280"
                        className="pointer-events-none"
                      >
                        {edge.relationship}
                      </text>
                    </g>
                  );
                })}

                {/* Render nodes */}
                {data.nodes.map((node) => (
                  <g key={node.id}>
                    <circle
                      cx={node.x}
                      cy={node.y}
                      r={node.type === 'package' ? 20 : 15}
                      fill={getNodeColor(node)}
                      stroke={selectedNode?.id === node.id ? '#000' : 'none'}
                      strokeWidth={selectedNode?.id === node.id ? 2 : 0}
                      className="cursor-pointer"
                      onClick={() => handleNodeClick(node)}
                    />
                    
                    {/* Node icon */}
                    <foreignObject
                      x={node.x! - 8}
                      y={node.y! - 8}
                      width={16}
                      height={16}
                      className="pointer-events-none"
                    >
                      <div className="flex items-center justify-center text-white">
                        {getNodeIcon(node)}
                      </div>
                    </foreignObject>

                    {/* Node label */}
                    <text
                      x={node.x}
                      y={node.y! + (node.type === 'package' ? 30 : 25)}
                      textAnchor="middle"
                      fontSize="12"
                      fill="#374151"
                      className="pointer-events-none font-medium"
                    >
                      {node.label}
                    </text>

                    {/* Version label for packages */}
                    {node.version && (
                      <text
                        x={node.x}
                        y={node.y! + (node.type === 'package' ? 42 : 37)}
                        textAnchor="middle"
                        fontSize="10"
                        fill="#6b7280"
                        className="pointer-events-none"
                      >
                        v{node.version}
                      </text>
                    )}

                    {/* Vulnerability indicator */}
                    {node.vulnerabilityCount && node.vulnerabilityCount > 0 && (
                      <circle
                        cx={node.x! + 15}
                        cy={node.y! - 15}
                        r="8"
                        fill="#dc2626"
                        className="pointer-events-none"
                      />
                    )}
                    {node.vulnerabilityCount && node.vulnerabilityCount > 0 && (
                      <text
                        x={node.x! + 15}
                        y={node.y! - 11}
                        textAnchor="middle"
                        fontSize="8"
                        fill="white"
                        className="pointer-events-none font-bold"
                      >
                        {node.vulnerabilityCount}
                      </text>
                    )}
                  </g>
                ))}
              </g>
            </svg>

            {/* Legend */}
            <div className="absolute top-4 right-4 bg-white p-3 rounded-lg shadow-lg border space-y-2">
              <h4 className="font-medium text-sm">Legend</h4>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-green-600 rounded-full"></div>
                  <span className="text-xs">Secure Package</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-orange-600 rounded-full"></div>
                  <span className="text-xs">Vulnerable Package</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-red-600 rounded-full"></div>
                  <span className="text-xs">Critical Risk</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-blue-600 rounded-full"></div>
                  <span className="text-xs">SBOM</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-purple-600 rounded-full"></div>
                  <span className="text-xs">Attestation</span>
                </div>
              </div>
            </div>

            {/* Zoom indicator */}
            <div className="absolute bottom-4 left-4 bg-white px-2 py-1 rounded border text-sm">
              Zoom: {Math.round(zoom * 100)}%
            </div>
          </div>

          {/* Node details */}
          {selectedNode && (
            <div className="mt-4 p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-medium">{selectedNode.label}</h4>
                <Badge variant="outline">{selectedNode.type}</Badge>
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                {selectedNode.version && (
                  <div>
                    <span className="font-medium">Version:</span> {selectedNode.version}
                  </div>
                )}
                {selectedNode.ecosystem && (
                  <div>
                    <span className="font-medium">Ecosystem:</span> {selectedNode.ecosystem}
                  </div>
                )}
                {selectedNode.vulnerabilityCount !== undefined && (
                  <div>
                    <span className="font-medium">Vulnerabilities:</span> {selectedNode.vulnerabilityCount}
                  </div>
                )}
                {selectedNode.riskLevel && (
                  <div>
                    <span className="font-medium">Risk Level:</span> 
                    <Badge 
                      variant={selectedNode.riskLevel === 'CRITICAL' ? 'destructive' : 'default'}
                      className="ml-2"
                    >
                      {selectedNode.riskLevel}
                    </Badge>
                  </div>
                )}
              </div>
              <div className="mt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onNodeClick?.(selectedNode)}
                >
                  <ExternalLink className="h-3 w-3 mr-1" />
                  Analyze in Detail
                </Button>
              </div>
            </div>
          )}

          {/* Graph statistics */}
          <div className="mt-4 grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-lg font-semibold">{data.nodes.length}</p>
              <p className="text-sm text-muted-foreground">Nodes</p>
            </div>
            <div>
              <p className="text-lg font-semibold">{data.edges.length}</p>
              <p className="text-sm text-muted-foreground">Relationships</p>
            </div>
            <div>
              <p className="text-lg font-semibold">
                {data.nodes.filter(n => n.vulnerabilityCount && n.vulnerabilityCount > 0).length}
              </p>
              <p className="text-sm text-muted-foreground">Vulnerable</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SupplyChainGraph; 