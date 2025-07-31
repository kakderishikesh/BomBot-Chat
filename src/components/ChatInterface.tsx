import { useState, useRef, useEffect } from 'react';
import { useChat } from '@/contexts/ChatContext';
import ChatMessage from '@/components/ChatMessage';
import FileUploadOverlay from '@/components/FileUploadOverlay';
import StatusIndicator from '@/components/StatusIndicator';
import EmailCollectionDialog from '@/components/EmailCollectionDialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Shield, Send, Paperclip, Plus, MessageSquare } from 'lucide-react';

const ChatInterface = () => {
  const { messages, isLoading, addMessage, clearChat, currentThreadId, sessionId, messageIndex, setLoading, setCurrentThreadId, addUploadedFile, logChatMessage, userEmail, setUserEmail, conversationHistory } = useChat();
  const [inputText, setInputText] = useState('');
  const [isDragOver, setIsDragOver] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Check if email dialog should be shown
  const shouldShowEmailDialog = !userEmail;

  // Handle email submission
  const handleEmailSubmit = (email: string) => {
    setUserEmail(email);
    console.log('User email collected for survey:', email);
  };

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

  const handleFileUpload = async (file: File) => {
    // Validate file type
    const validTypes = ['.json', '.xml', '.spdx', '.cyclonedx'];
    const fileExtension = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));
    
    if (!validTypes.some(type => fileExtension.includes(type.replace('.', '')))) {
      addMessage({
        type: 'assistant',
        content: '❌ Invalid file type. Please upload a valid SBOM file (.json, .xml, .spdx, .cyclonedx)',
      });
      return;
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      addMessage({
        type: 'assistant',
        content: '❌ File too large. Please upload a file smaller than 10MB',
      });
      return;
    }

    // Add file upload message
    addMessage({
      type: 'user',
      content: `📎 Uploaded: ${file.name}`,
    });

    setLoading(true);

    try {
      // Create FormData for file upload
      const formData = new FormData();
      formData.append('file', file);
      formData.append('sessionId', sessionId);
      formData.append('messageIndex', messageIndex.toString());
      if (userEmail) {
        formData.append('userEmail', userEmail);
      }
      // Include existing threadId if available to maintain conversation continuity
      if (currentThreadId) {
        formData.append('threadId', currentThreadId);
      }

      // Upload file to API
      const uploadResponse = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (!uploadResponse.ok) {
        const errorData = await uploadResponse.json();
        throw new Error(errorData.error || 'Upload failed');
      }

      const uploadResult = await uploadResponse.json();

      // Add file to context
      const uploadedFile = {
        id: uploadResult.conversationId || Math.random().toString(36).substr(2, 9),
        name: file.name,
        size: file.size,
        type: file.type,
        uploadedAt: new Date(),
        status: 'completed' as const,
      };

      addUploadedFile(uploadedFile);

      // Set the conversation ID for this conversation
      if (uploadResult.conversationId) {
        setCurrentThreadId(uploadResult.conversationId);
      }

      // Use AI response from upload API
      const { quickSummary, vulnerabilitiesFound, aiResponse } = uploadResult;
      let vulnerabilities = [];

      // Create vulnerability cards for display if we have vulnerabilities
      if (vulnerabilitiesFound > 0 && quickSummary.topVulnerabilities.length > 0) {
        vulnerabilities = quickSummary.topVulnerabilities.flatMap(pkg => 
          pkg.vulns.map(vuln => ({
            id: vuln.id,
            severity: vuln.severity,
            package: pkg.package,
            version: pkg.version,
            description: vuln.summary
          }))
        );
      }

      // Add AI response
      addMessage({
        type: 'assistant',
        content: aiResponse || `✅ **SBOM Analysis Complete**

Successfully analyzed "${file.name}" and found:
- **${uploadResult.packagesScanned} packages scanned**
- **${quickSummary?.packagesWithVulns || 0} packages with vulnerabilities**
- **${vulnerabilitiesFound} total vulnerabilities found**

Ask me questions about specific packages or request a "detailed analysis" for more insights.`,
        vulnerabilities: vulnerabilities.length > 0 ? vulnerabilities : undefined,
        totalVulnerabilities: vulnerabilitiesFound > 0 ? quickSummary.totalVulns : undefined,
        dependencyGraph: uploadResult.dependencyGraph || undefined,
        useMarkdown: true,
      });

      // Handle context limit error for uploads too
      if (uploadResult.isContextLimitError) {
        setTimeout(() => {
          const newChatButton = document.querySelector('[data-clear-chat]');
          if (newChatButton) {
            newChatButton.scrollIntoView({ behavior: 'smooth', block: 'center' });
            newChatButton.classList.add('animate-pulse');
            setTimeout(() => newChatButton.classList.remove('animate-pulse'), 3000);
          }
        }, 1000);
      }

      // Thread is already set up for follow-up questions via setCurrentThreadId above

    } catch (error) {
      console.error('Upload error:', error);
      addMessage({
        type: 'assistant',
        content: `❌ Upload failed: ${error instanceof Error ? error.message : 'There was an error uploading your file. Please try again.'}`,
      });
    } finally {
      setLoading(false);
    }
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

  // Function to send message to AI
  const sendToAssistant = async (message: string) => {
    try {
      setLoading(true);
      
      // Send message with conversation history
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: message,
          conversationHistory: conversationHistory,
          sessionId,
          messageIndex,
          userEmail,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to send message to AI');
      }

      const result = await response.json();

      if (result.success && result.response) {
        // Add AI response immediately
        addMessage({
          type: 'assistant',
          content: result.response,
          useMarkdown: true,
        });
        
        // Set current thread ID if it was created
        if (result.conversationId && !currentThreadId) {
          setCurrentThreadId(result.conversationId);
        }
        
        // If this is a context limit error, show additional UI hints
        if (result.isContextLimitError) {
          // Add visual indicator and auto-scroll to "New Chat" button
          setTimeout(() => {
            const newChatButton = document.querySelector('[data-clear-chat]');
            if (newChatButton) {
              newChatButton.scrollIntoView({ behavior: 'smooth', block: 'center' });
              // Add a gentle highlight effect
              newChatButton.classList.add('animate-pulse');
              setTimeout(() => newChatButton.classList.remove('animate-pulse'), 3000);
            }
          }, 1000);
        }
        
        setLoading(false);
        return true;
      }
    } catch (error) {
      console.error('Error sending to AI:', error);
      addMessage({
        type: 'assistant',
        content: '⚠️ Sorry, I encountered an issue processing your message. Please try again.',
        useMarkdown: true,
      });
      setLoading(false);
    }
    
    return false;
  };



  const handleSendMessage = async () => {
    if (!inputText.trim()) return;

    // Add user message
    addMessage({
      type: 'user',
      content: inputText,
    });

    const userMessage = inputText;
    setInputText('');

    // Always send to the AI assistant
    const sent = await sendToAssistant(userMessage);
    if (!sent) {
      // Fallback response if AI fails
      addMessage({
        type: 'assistant',
        content: "I apologize, but I'm having trouble processing your message right now. Please try again in a moment.",
        useMarkdown: true,
      });
    }
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
              data-clear-chat
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
      
      {/* Email Collection Dialog */}
      <EmailCollectionDialog 
        isOpen={shouldShowEmailDialog}
        onEmailSubmit={handleEmailSubmit}
      />
      
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
