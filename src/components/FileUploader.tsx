
import React, { useCallback, useRef, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { useChat } from '@/contexts/ChatContext';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { toast } from '@/components/ui/use-toast';
import { Upload, FileText, X, Check } from 'lucide-react';

const FileUploader = () => {
  const { addUploadedFile, addMessage } = useChat();
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
    setUploadProgress(0);

    try {
      // Simulate upload progress
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 10;
        });
      }, 100);

      // Simulate file processing
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      clearInterval(progressInterval);
      setUploadProgress(100);

      // Add file to context
      const uploadedFile = {
        id: Math.random().toString(36).substr(2, 9),
        name: file.name,
        size: file.size,
        type: file.type,
        uploadedAt: new Date(),
        status: 'completed' as const,
      };

      addUploadedFile(uploadedFile);

      // Add success message to chat
      addMessage({
        type: 'assistant',
        content: `✅ Successfully uploaded "${file.name}". I'm now analyzing your SBOM file for security vulnerabilities. This may take a moment...`,
      });

      // Simulate analysis
      setTimeout(() => {
        addMessage({
          type: 'assistant',
          content: `🔍 Analysis complete for "${file.name}"!\n\n**Summary:**\n- Scanned 147 packages\n- Found 3 vulnerabilities\n- 2 High severity, 1 Medium severity\n\n**Top Vulnerabilities:**\n1. **CVE-2023-1234** - High - SQL Injection in mysql-connector\n2. **CVE-2023-5678** - High - RCE in express framework\n3. **CVE-2023-9012** - Medium - XSS in lodash\n\nWould you like me to provide detailed information about any of these vulnerabilities?`,
          vulnerabilities: [
            { id: 'CVE-2023-1234', severity: 'High', package: 'mysql-connector' },
            { id: 'CVE-2023-5678', severity: 'High', package: 'express' },
            { id: 'CVE-2023-9012', severity: 'Medium', package: 'lodash' },
          ],
        });
      }, 2000);

      toast({
        title: 'Upload successful',
        description: `${file.name} has been uploaded and is being analyzed.`,
      });

    } catch (error) {
      console.error('Upload error:', error);
      toast({
        title: 'Upload failed',
        description: 'There was an error uploading your file. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsUploading(false);
      setTimeout(() => setUploadProgress(0), 1000);
    }
  }, [addUploadedFile, addMessage]);

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
            <span className="text-gray-600">Uploading...</span>
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
