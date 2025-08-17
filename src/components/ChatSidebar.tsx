import { useChat } from '@/contexts/ChatContext';
import PackageQueryForm from '@/components/PackageQueryForm';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Package, FileText, Download, Trash2, Clock } from 'lucide-react';
import { useState, useEffect } from 'react';

const ChatSidebar = () => {
  const { messages, uploadedFiles, clearChat, sessionId } = useChat();
  const [modelStatus, setModelStatus] = useState<'checking' | 'ready' | 'unavailable'>('checking');

  // Check model availability
  const checkModelStatus = async () => {
    try {
      setModelStatus('checking');
      
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: 'Hi',
          conversationHistory: [],
          sessionId: sessionId,
          messageIndex: 0,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.response) {
          setModelStatus('ready');
        } else {
          setModelStatus('unavailable');
        }
      } else {
        setModelStatus('unavailable');
      }
    } catch (error) {
      console.error('Model status check failed:', error);
      setModelStatus('unavailable');
    }
  };

  // Check model status on component mount
  useEffect(() => {
    checkModelStatus();
  }, [sessionId]);

  const handleExportChat = () => {
    const chatContent = messages.map(msg => 
      `[${msg.timestamp.toLocaleTimeString()}] ${msg.type.toUpperCase()}: ${msg.content}`
    ).join('\n\n');
    
    const blob = new Blob([chatContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `bombot-chat-${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="h-full overflow-y-auto p-4 space-y-4">
      {/* Session Info */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Session Info</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-600">Messages:</span>
            <span className="font-medium">{messages.length}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Files uploaded:</span>
            <span className="font-medium">{uploadedFiles.length}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Status:</span>
            <span className={`font-medium ${
              modelStatus === 'checking' ? 'text-yellow-600' :
              modelStatus === 'ready' ? 'text-green-600' :
              'text-red-600'
            }`}>
              {modelStatus === 'checking' ? 'Checking' :
               modelStatus === 'ready' ? 'Ready' :
               'Model Unavailable'}
            </span>
          </div>
          
          <Separator className="my-3" />
          
          <div className="space-y-2">
            <Button 
              onClick={handleExportChat}
              variant="outline" 
              size="sm" 
              className="w-full"
              disabled={messages.length === 0}
            >
              <Download className="h-4 w-4 mr-2" />
              Export Chat
            </Button>
            <Button 
              onClick={clearChat}
              variant="outline" 
              size="sm" 
              className="w-full text-red-600 hover:text-red-700"
              disabled={messages.length === 0}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Clear Chat
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center space-x-2 text-sm">
            <Package className="h-4 w-4 text-green-600" />
            <span>Quick Actions</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <PackageQueryForm />
        </CardContent>
      </Card>

      {/* Upload History */}
      {uploadedFiles.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center space-x-2 text-sm">
              <FileText className="h-4 w-4 text-blue-600" />
              <span>Upload History</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {uploadedFiles.map((file) => (
              <div key={file.id} className="text-sm p-3 bg-gray-50 rounded-lg border">
                <div className="font-medium truncate">{file.name}</div>
                <div className="text-gray-500 text-xs flex items-center space-x-1 mt-1">
                  <span>{(file.size / 1024).toFixed(1)} KB</span>
                  <span>•</span>
                  <Clock className="h-3 w-3" />
                  <span>{file.uploadedAt.toLocaleDateString()}</span>
                </div>
                {file.status && (
                  <div className={`text-xs mt-1 ${
                    file.status === 'completed' ? 'text-green-600' :
                    file.status === 'error' ? 'text-red-600' :
                    'text-blue-600'
                  }`}>
                    {file.status.charAt(0).toUpperCase() + file.status.slice(1)}
                  </div>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Quick Tips */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">💡 Quick Tips</CardTitle>
        </CardHeader>
        <CardContent className="text-xs text-gray-600 space-y-2">
          <p>• Drag & drop SBOM files anywhere in the chat</p>
          <p>• Mention package names to get instant security info</p>
          <p>• Type CVE IDs for OSV database vulnerability lookup</p>
          <p>• Use the paperclip icon to attach files</p>
        </CardContent>
      </Card>
    </div>
  );
};

export default ChatSidebar;
