import { useState, useRef, useEffect } from 'react';
import { useChat } from '@/contexts/ChatContext';
import ChatMessage from '@/components/ChatMessage';
import FileUploadOverlay from '@/components/FileUploadOverlay';
import StatusIndicator from '@/components/StatusIndicator';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Shield, Send, Paperclip, Plus, MessageSquare } from 'lucide-react';

const ChatInterface = () => {
  const { messages, isLoading, addMessage, clearChat } = useChat();
  const [inputText, setInputText] = useState('');
  const [isDragOver, setIsDragOver] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Drag and drop handlers
  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.currentTarget === e.target) {
      setIsDragOver(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFileUpload(files[0]);
    }
  };

  const handleFileUpload = (file: File) => {
    // Add file upload message
    addMessage({
      type: 'user',
      content: `📎 Uploaded: ${file.name}`,
    });

    // Simulate file processing
    setTimeout(() => {
      addMessage({
        type: 'assistant',
        content: `🔍 Scanning ${file.name} with OSV scanner... This may take a moment.`,
      });
    }, 500);

    // Simulate scan results
    setTimeout(() => {
      addMessage({
        type: 'assistant',
        content: `✅ Scan complete for ${file.name}!\n\n**Summary:**\n- Scanned 147 packages\n- Found 3 vulnerabilities\n- 2 High severity, 1 Medium severity\n\n**Top Vulnerabilities:**\n1. **CVE-2023-1234** - High - SQL Injection in mysql-connector\n2. **CVE-2023-5678** - High - RCE in express framework\n3. **CVE-2023-9012** - Medium - XSS in lodash\n\nWould you like me to provide detailed information about any of these vulnerabilities?`,
        vulnerabilities: [
          { id: 'CVE-2023-1234', severity: 'High', package: 'mysql-connector', version: '8.0.21', description: 'SQL injection vulnerability in MySQL connector' },
          { id: 'CVE-2023-5678', severity: 'High', package: 'express', version: '4.17.1', description: 'Remote code execution in Express framework' },
          { id: 'CVE-2023-9012', severity: 'Medium', package: 'lodash', version: '4.17.20', description: 'Cross-site scripting vulnerability in lodash' },
        ],
      });
    }, 3000);
  };

  // Auto-detect packages and CVEs in messages
  const detectAndQuery = (text: string) => {
    // Detect CVE mentions
    const cvePattern = /CVE-\d{4}-\d{4,}/gi;
    const cveMatches = text.match(cvePattern);
    
    // Detect common package names
    const packagePattern = /\b(lodash|express|react|vue|angular|jquery|bootstrap|axios|moment|chalk|debug|request|commander|yargs|fs-extra|glob|rimraf|mkdirp|semver|uuid)\b/gi;
    const packageMatches = text.match(packagePattern);

    if (cveMatches) {
      return { type: 'cve', value: cveMatches[0] };
    } else if (packageMatches) {
      return { type: 'package', value: packageMatches[0] };
    }
    return null;
  };

  const handleSendMessage = () => {
    if (!inputText.trim()) return;

    // Add user message
    addMessage({
      type: 'user',
      content: inputText,
    });

    // Detect if message contains package or CVE mentions
    const detection = detectAndQuery(inputText);
    
    if (detection) {
      if (detection.type === 'cve') {
        setTimeout(() => {
          addMessage({
            type: 'assistant',
            content: `🛡️ Looking up ${detection.value}...\n\n${detection.value} is a HIGH severity vulnerability affecting multiple packages. It was published in 2023 and has a CVSS score of 8.1.\n\n**Affected packages:**\n- express@4.17.1 and earlier\n- Related middleware packages\n\n**Recommendation:** Update to the latest version of Express (4.18.0+) which includes the security patch.`,
          });
        }, 1500);
      } else if (detection.type === 'package') {
        setTimeout(() => {
          addMessage({
            type: 'assistant',
            content: `📦 Querying package: ${detection.value}...\n\nGood news! The latest version of ${detection.value} appears to be secure with no known critical vulnerabilities. However, I recommend always using the latest stable version.\n\n**Latest version:** Check npm registry for current version\n**Security status:** ✅ No critical vulnerabilities found\n\nWould you like me to check a specific version of ${detection.value}?`,
          });
        }, 1500);
      }
    } else {
      // General response
      setTimeout(() => {
        addMessage({
          type: 'assistant',
          content: "I'm here to help with SBOM security analysis! You can:\n\n• Upload an SBOM file for comprehensive scanning\n• Ask about specific packages (e.g., 'Is lodash safe?')\n• Inquire about CVEs (e.g., 'What is CVE-2023-1234?')\n• Get security recommendations\n\nWhat would you like to know?",
        });
      }, 1000);
    }

    setInputText('');
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div 
      className="flex flex-col h-full relative"
      onDragEnter={handleDragEnter}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Header */}
      <div className="border-b p-4 bg-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center">
              <Shield className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-gray-900">BomBot</h1>
              <p className="text-sm text-gray-500">Your SBOM security expert</p>
            </div>
          </div>
          
          {/* New Chat Button */}
          {messages.length > 0 && (
            <Button
              onClick={clearChat}
              variant="outline"
              size="sm"
              className="flex items-center space-x-2 text-gray-600 hover:text-gray-900"
            >
              <Plus className="h-4 w-4" />
              <span>New Chat</span>
            </Button>
          )}
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Shield className="h-8 w-8 text-blue-600" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              Hi! I'm BomBot 👋
            </h3>
            <p className="text-gray-600 max-w-md mx-auto mb-6">
              Your SBOM security expert. Upload an SBOM file, ask about packages, or inquire about CVEs - I'm here to help!
            </p>
            
            {/* Quick suggestion buttons */}
            <div className="flex flex-wrap gap-2 justify-center">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setInputText("Is lodash safe?")}
              >
                Check a package
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => fileInputRef.current?.click()}
              >
                Upload SBOM
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setInputText("What is CVE-2023-1234?")}
              >
                Ask about CVE
              </Button>
            </div>
          </div>
        ) : (
          messages.map((message) => (
            <ChatMessage key={message.id} message={message} />
          ))
        )}

        {/* Status Indicator */}
        {isLoading && <StatusIndicator />}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="border-t p-4 bg-white">
        <div className="flex items-center space-x-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            className="flex-shrink-0"
          >
            <Paperclip className="h-4 w-4" />
          </Button>
          
          <div className="flex-1 relative">
            <Input
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Ask about packages, CVEs, or upload an SBOM file..."
              className="pr-12"
            />
            <Button
              onClick={handleSendMessage}
              disabled={!inputText.trim() || isLoading}
              size="sm"
              className="absolute right-1 top-1 h-8 w-8 p-0"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
        
        <p className="text-xs text-gray-500 mt-2 text-center">
          Try: "Is express.js safe?", "CVE-2023-1234", or drag & drop an SBOM file
        </p>
      </div>

      {/* File Upload Overlay */}
      {isDragOver && <FileUploadOverlay />}
      
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".json,.xml,.spdx,.cyclonedx"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFileUpload(file);
        }}
        className="hidden"
      />
    </div>
  );
};

export default ChatInterface;
