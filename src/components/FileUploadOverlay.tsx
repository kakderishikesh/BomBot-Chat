
import { Upload, FileText } from 'lucide-react';

const FileUploadOverlay = () => {
  return (
    <div className="absolute inset-0 bg-blue-500/20 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-8 shadow-xl border-2 border-dashed border-blue-500 text-center">
        <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <Upload className="h-8 w-8 text-blue-600" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          Drop your SBOM file here
        </h3>
        <p className="text-gray-600">
          Supports JSON, XML, SPDX, and CycloneDX formats
        </p>
        
        <div className="flex items-center justify-center space-x-4 mt-4 text-sm text-gray-500">
          <div className="flex items-center space-x-1">
            <FileText className="h-4 w-4" />
            <span>JSON</span>
          </div>
          <div className="flex items-center space-x-1">
            <FileText className="h-4 w-4" />
            <span>XML</span>
          </div>
          <div className="flex items-center space-x-1">
            <FileText className="h-4 w-4" />
            <span>SPDX</span>
          </div>
          <div className="flex items-center space-x-1">
            <FileText className="h-4 w-4" />
            <span>CycloneDX</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FileUploadOverlay;
