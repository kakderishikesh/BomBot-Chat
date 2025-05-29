import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { User, Shield, AlertTriangle, Info, CheckCircle, Copy, ExternalLink } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface Message {
  id: string;
  type: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  vulnerabilities?: any[];
}

interface ChatMessageProps {
  message: Message;
}

const ChatMessage = ({ message }: ChatMessageProps) => {
  const isUser = message.type === 'user';
  const isFileUpload = message.content.startsWith('📎');

  const getSeverityColor = (severity: string) => {
    switch (severity?.toUpperCase()) {
      case 'CRITICAL':
        return 'bg-red-600 text-white hover:bg-red-700';
      case 'HIGH':
        return 'bg-red-500 text-white hover:bg-red-600';
      case 'MEDIUM':
        return 'bg-orange-500 text-white hover:bg-orange-600';
      case 'LOW':
        return 'bg-yellow-500 text-black hover:bg-yellow-600';
      default:
        return 'bg-gray-500 text-white hover:bg-gray-600';
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity?.toUpperCase()) {
      case 'CRITICAL':
      case 'HIGH':
        return <AlertTriangle className="h-3 w-3" />;
      case 'MEDIUM':
        return <Info className="h-3 w-3" />;
      case 'LOW':
        return <CheckCircle className="h-3 w-3" />;
      default:
        return <Info className="h-3 w-3" />;
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied to clipboard",
      description: "Message content copied successfully",
    });
  };

  const formatContent = (content: string) => {
    // Simple markdown-like formatting
    return content
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/\n/g, '<br />');
  };

  return (
    <div className={`flex gap-3 ${isUser ? 'justify-end' : 'justify-start'} animate-fade-in`}>
      {!isUser && (
        <div className="flex-shrink-0 pt-1">
          <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
            <Shield className="h-4 w-4 text-white" />
          </div>
        </div>
      )}
      
      <div className={`max-w-2xl ${isUser ? 'order-1' : ''}`}>
        <div className={`rounded-2xl px-4 py-3 ${
          isUser 
            ? 'bg-blue-600 text-white' 
            : isFileUpload 
              ? 'bg-green-50 border border-green-200 text-gray-900'
              : 'bg-gray-100 text-gray-900'
        } shadow-sm`}>
          
          {/* Message content */}
          <div className="space-y-2">
            <div 
              className="leading-relaxed whitespace-pre-wrap"
              dangerouslySetInnerHTML={{ __html: formatContent(message.content) }}
            />

            {/* Vulnerability Cards */}
            {message.vulnerabilities && message.vulnerabilities.length > 0 && (
              <div className="space-y-3 mt-4 pt-3 border-t border-gray-200">
                <h4 className="font-medium text-gray-900 text-sm">
                  🛡️ Vulnerabilities Found ({message.vulnerabilities.length})
                </h4>
                {message.vulnerabilities.map((vuln, index) => (
                  <div key={index} className="bg-white border border-gray-200 rounded-lg p-3 shadow-sm">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        <Badge className={`${getSeverityColor(vuln.severity)} text-xs`}>
                          {getSeverityIcon(vuln.severity)}
                          <span className="ml-1">{vuln.severity}</span>
                        </Badge>
                        <code className="text-xs bg-gray-100 px-2 py-1 rounded">{vuln.id}</code>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0"
                        onClick={() => window.open(`https://osv.dev/vulnerability/${vuln.id}`, '_blank')}
                      >
                        <ExternalLink className="h-3 w-3" />
                      </Button>
                    </div>
                    
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2 text-sm">
                        <span className="font-medium text-gray-700">Package:</span>
                        <code className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded text-xs">
                          {vuln.package}@{vuln.version}
                        </code>
                      </div>
                      
                      {vuln.description && (
                        <p className="text-sm text-gray-600 mt-2 leading-relaxed">
                          {vuln.description}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Message footer */}
        <div className={`flex items-center justify-between mt-1 px-1 ${isUser ? 'flex-row-reverse' : ''}`}>
          <span className="text-xs text-gray-500">
            {message.timestamp.toLocaleTimeString()}
          </span>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={() => copyToClipboard(message.content)}
          >
            <Copy className="h-3 w-3" />
          </Button>
        </div>
      </div>

      {isUser && (
        <div className="flex-shrink-0 pt-1">
          <div className="w-8 h-8 bg-gray-600 rounded-full flex items-center justify-center">
            <User className="h-4 w-4 text-white" />
          </div>
        </div>
      )}
    </div>
  );
};

export default ChatMessage;
