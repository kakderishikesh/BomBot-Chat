import React, { useCallback, useRef, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { useChat } from '@/contexts/ChatContext';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { toast } from '@/components/ui/use-toast';
import { Upload, FileText, X, Check } from 'lucide-react';

const FileUploader = () => {
  const { addUploadedFile, addMessage, setCurrentThreadId } = useChat();
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;

    // Validate file type
    const validTypes = ['.json', '.xml', '.spdx', '.cyclonedx'];
    const fileExtension = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));
    
    if (!validTypes.some(type => fileExtension.includes(type.replace('.', '')))) {
      toast({
        title: 'Invalid file type',
        description: 'Please upload a valid SBOM file (.json, .xml, .spdx, .cyclonedx)',
        variant: 'destructive',
      });
      return;
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: 'File too large',
        description: 'Please upload a file smaller than 10MB',
        variant: 'destructive',
      });
      return;
    }

    setIsUploading(true);
    setUploadProgress(10);

    try {
      // Create FormData for file upload
      const formData = new FormData();
      formData.append('file', file);

      // Upload file to API
      const uploadResponse = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      setUploadProgress(50);

      if (!uploadResponse.ok) {
        const errorData = await uploadResponse.json();
        throw new Error(errorData.error || 'Upload failed');
      }

      const uploadResult = await uploadResponse.json();
      setUploadProgress(80);

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

      setUploadProgress(90);

      // Add initial message to chat
      addMessage({
        type: 'assistant',
        content: `✅ Successfully uploaded "${file.name}". I'm now analyzing your SBOM file for security vulnerabilities. This may take a moment...`,
      });

      // Poll for the assistant's response
      if (uploadResult.runId && uploadResult.threadId) {
        pollForResponse(uploadResult.threadId, uploadResult.runId, file.name);
      }

      setUploadProgress(100);

      toast({
        title: 'Upload successful',
        description: `${file.name} has been uploaded and is being analyzed.`,
      });

    } catch (error) {
      console.error('Upload error:', error);
      toast({
        title: 'Upload failed',
        description: error instanceof Error ? error.message : 'There was an error uploading your file. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsUploading(false);
      setTimeout(() => setUploadProgress(0), 1000);
    }
  }, [addUploadedFile, addMessage, setCurrentThreadId]);

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
        console.error('Polling error:', error);
        addMessage({
          type: 'assistant',
          content: `⚠️ There was an issue checking the analysis status for "${fileName}". You can try asking me questions about the file or re-upload it.`,
        });
      }
    };

    // Start polling after a short delay
    setTimeout(poll, 2000);
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/json': ['.json'],
      'application/xml': ['.xml'],
      'text/xml': ['.xml'],
      'application/spdx+json': ['.spdx'],
      'application/vnd.cyclonedx+json': ['.cyclonedx'],
    },
    maxFiles: 1,
  });

  const handleBrowseClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  return (
    <div className="space-y-4">
      <div
        {...getRootProps()}
        className={`
          border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-all duration-200
          ${isDragActive 
            ? 'border-blue-500 bg-blue-50 scale-105' 
            : 'border-gray-300 hover:border-blue-400 hover:bg-gray-50'
          }
          ${isUploading ? 'pointer-events-none opacity-75' : ''}
        `}
      >
        <input {...getInputProps()} ref={fileInputRef} />
        
        <div className="space-y-4">
          <div className={`mx-auto w-12 h-12 rounded-full flex items-center justify-center transition-colors ${
            isDragActive ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-600'
          }`}>
            {isUploading ? (
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
            ) : (
              <Upload className="h-6 w-6" />
            )}
          </div>
          
          <div>
            <p className="text-lg font-medium text-gray-900">
              {isDragActive ? 'Drop your SBOM file here' : 'Upload SBOM File'}
            </p>
            <p className="text-sm text-gray-600 mt-1">
              Drag and drop or{' '}
              <Button variant="link" className="p-0 h-auto text-blue-600" onClick={handleBrowseClick}>
                browse files
              </Button>
            </p>
            <p className="text-xs text-gray-500 mt-2">
              Supports: JSON, XML, SPDX, CycloneDX (max 10MB)
            </p>
          </div>
        </div>
      </div>

      {/* Upload Progress */}
      {isUploading && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">
              {uploadProgress < 50 ? 'Uploading...' : 
               uploadProgress < 90 ? 'Processing...' : 
               'Analyzing...'}
            </span>
            <span className="text-gray-900 font-medium">{uploadProgress}%</span>
          </div>
          <Progress value={uploadProgress} className="h-2" />
        </div>
      )}

      {/* File Format Help */}
      <div className="text-xs text-gray-500 space-y-1">
        <p className="font-medium">Supported SBOM formats:</p>
        <ul className="list-disc list-inside space-y-1 ml-2">
          <li>SPDX (JSON/XML)</li>
          <li>CycloneDX (JSON/XML)</li>
          <li>Custom JSON formats</li>
        </ul>
      </div>
    </div>
  );
};

export default FileUploader;
