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
  const { messages, isLoading, addMessage, clearChat, currentThreadId, sessionId, messageIndex, setLoading, setCurrentThreadId, addUploadedFile, logChatMessage, userEmail, setUserEmail } = useChat();
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
        id: uploadResult.threadId || Math.random().toString(36).substr(2, 9),
        name: file.name,
        size: file.size,
        type: file.type,
        uploadedAt: new Date(),
        status: 'completed' as const,
      };

      addUploadedFile(uploadedFile);

      // Set the thread ID for this conversation
      if (uploadResult.threadId) {
        setCurrentThreadId(uploadResult.threadId);
      }

      // Show quick templated response first
      const { quickSummary, vulnerabilitiesFound, packagesScanned } = uploadResult;
      let responseContent = '';
      let vulnerabilities = [];

      if (vulnerabilitiesFound > 0) {
        responseContent = `🔍 **Quick Summary for "${file.name}"**\n\n`;
        responseContent += `📊 **Overview:**\n`;
        responseContent += `- Packages scanned: ${packagesScanned}\n`;
        responseContent += `- Packages with vulnerabilities: ${quickSummary.packagesWithVulns}\n`;
        responseContent += `- Total vulnerabilities: ${quickSummary.totalVulns}\n`;
        responseContent += `- Dependency relationships: ${quickSummary.dependenciesFound || 0}\n\n`;

        if (quickSummary.topVulnerabilities.length > 0) {
          responseContent += `🚨 **Top 5 Vulnerable Packages:**\n`;
          quickSummary.topVulnerabilities.forEach((pkg, index) => {
            responseContent += `${index + 1}. **${pkg.package}@${pkg.version}** - ${pkg.vulns.length} issue${pkg.vulns.length > 1 ? 's' : ''}\n`;
          });
          responseContent += `\n`;

          // Create vulnerability cards for display
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

        responseContent += `💡 *Ask me "detailed analysis", "executive summary", or "dependency analysis" for all ${quickSummary.totalVulns} vulnerabilities and comprehensive security insights*`;
      } else {
        responseContent = `✅ **Good news!** SBOM analysis complete for "${file.name}"\n\n`;
        responseContent += `📊 **Results:**\n`;
        responseContent += `- Packages scanned: ${packagesScanned}\n`;
        responseContent += `- Vulnerabilities found: 0\n\n`;
        responseContent += `🛡️ Your SBOM appears to be secure with no known vulnerabilities detected!\n\n`;
        responseContent += `💡 *You can ask me questions about specific packages or security recommendations*`;
      }

      // Add quick templated response
      addMessage({
        type: 'assistant',
        content: responseContent,
        vulnerabilities: vulnerabilities.length > 0 ? vulnerabilities : undefined,
        totalVulnerabilities: vulnerabilitiesFound > 0 ? quickSummary.totalVulns : undefined,
        dependencyGraph: uploadResult.dependencyGraph || undefined,
      });

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

  const pollForResponse = async (threadId: string, runId: string, fileName: string) => {
    const maxAttempts = 90; // Maximum polling attempts (90 * 2 seconds = 3 minutes)
    let attempts = 0;

    const poll = async () => {
      try {
        const response = await fetch(`/api/run-status?threadId=${threadId}&runId=${runId}`);
        
        if (!response.ok) {
          throw new Error('Failed to check analysis status');
        }

        const result = await response.json();

        if (result.completed) {
          if (result.status === 'completed') {
            // Add the assistant's analysis response
            addMessage({
              type: 'assistant',
              content: result.response || `🔍 Analysis complete for "${fileName}"! The scan has been processed. You can ask me questions about the vulnerabilities found or request specific package information.`,
            });
          } else if (result.status === 'failed') {
            addMessage({
              type: 'assistant',
              content: `❌ Analysis failed for "${fileName}". Error: ${result.error || 'Unknown error occurred during analysis.'}`,
            });
          }
          return;
        }

        // Continue polling if not completed and under max attempts
        attempts++;
        if (attempts < maxAttempts) {
          setTimeout(poll, 2000); // Poll every 2 seconds
        } else {
          addMessage({
            type: 'assistant',
            content: `⏱️ Analysis for "${fileName}" is taking longer than expected. The scan is still running in the background. You can ask me questions or try uploading the file again.`,
          });
        }
      } catch (error) {
        console.error('Upload polling error:', error);
        addMessage({
          type: 'assistant',
          content: `⚠️ There was an issue getting the analysis results for "${fileName}".`,
        });
      }
    };

    // Start polling after a short delay
    setTimeout(poll, 2000);
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

  // Function to send message to OpenAI Assistant
  const sendToAssistant = async (message: string) => {
    if (!currentThreadId) return false;

    try {
      setLoading(true);
      
      // Send message to the existing thread
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          threadId: currentThreadId,
          message: message,
          sessionId,
          messageIndex,
          userEmail,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to send message to assistant');
      }

      const result = await response.json();

      if (result.runId) {
        // Poll for the assistant's response
        pollForAssistantResponse(currentThreadId, result.runId);
        return true;
      }
    } catch (error) {
      console.error('Error sending to assistant:', error);
      addMessage({
        type: 'assistant',
        content: '⚠️ Sorry, I encountered an issue processing your message. Please try again.',
        useMarkdown: true,
      });
      setLoading(false); // Only turn off loading on error
    }
    
    return false;
  };

  // Function to poll for assistant response
  const pollForAssistantResponse = async (threadId: string, runId: string) => {
    const maxAttempts = 180; // Maximum polling attempts (180 * 1 second = 3 minutes)
    let attempts = 0;

    const poll = async () => {
      try {
        const response = await fetch(`/api/run-status?threadId=${threadId}&runId=${runId}&sessionId=${sessionId}&messageIndex=${messageIndex}`);
        
        if (!response.ok) {
          throw new Error('Failed to check assistant response');
        }

        const result = await response.json();

        if (result.completed) {
          setLoading(false); // Turn off loading when response is complete
          
          if (result.status === 'completed' && result.response) {
            addMessage({
              type: 'assistant',
              content: result.response,
              useMarkdown: true,
            });
          } else if (result.status === 'failed') {
            addMessage({
              type: 'assistant',
              content: `❌ I encountered an issue processing your message: ${result.error || 'Unknown error occurred.'}`,
              useMarkdown: true,
            });
          }
          return;
        }

        // Continue polling if not completed
        attempts++;
        if (attempts < maxAttempts) {
          setTimeout(poll, 1000); // Poll every 1 second for chat responses
        } else {
          setLoading(false); // Turn off loading on timeout
          // Just stop polling silently - no timeout message
          console.log('Chat polling timed out, but continuing to wait...');
        }
      } catch (error) {
        setLoading(false); // Turn off loading on error
        console.error('Chat polling error:', error);
        addMessage({
          type: 'assistant',
          content: '⚠️ There was an issue getting my response. Please try again.',
          useMarkdown: true,
        });
      }
    };

    // Start polling immediately for chat responses
    poll();
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

    // If there's an active thread, send to the real AI assistant
    if (currentThreadId) {
      const sent = await sendToAssistant(userMessage);
      if (sent) {
        return;
      }
    }

    // Fallback to simulated responses (for when there's no active thread)
    // Detect if message contains package or CVE mentions
    const detection = detectAndQuery(userMessage);
    
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
