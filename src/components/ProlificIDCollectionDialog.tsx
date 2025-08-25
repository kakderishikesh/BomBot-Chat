import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { AlertCircle, User, CheckCircle } from 'lucide-react';

interface ProlificIDCollectionDialogProps {
  isOpen: boolean;
  onProlificIDSubmit: (prolificId: string) => void;
}

const ProlificIDCollectionDialog: React.FC<ProlificIDCollectionDialogProps> = ({
  isOpen,
  onProlificIDSubmit,
}) => {
  const [prolificId, setProlificId] = useState('');
  const [confirmProlificId, setConfirmProlificId] = useState('');
  const [isVerified, setIsVerified] = useState(false);
  const [errors, setErrors] = useState({
    prolificId: '',
    confirmProlificId: '',
    verification: ''
  });

  const validateProlificId = (prolificId: string): boolean => {
    // Prolific ID validation: alphanumeric only, 1-30 characters, no special characters
    const prolificIdRegex = /^[a-zA-Z0-9]{1,30}$/;
    return prolificIdRegex.test(prolificId);
  };

  const handleProlificIdChange = (value: string) => {
    setProlificId(value);
    if (errors.prolificId) {
      setErrors(prev => ({ ...prev, prolificId: '' }));
    }
  };

  const handleConfirmProlificIdChange = (value: string) => {
    setConfirmProlificId(value);
    if (errors.confirmProlificId) {
      setErrors(prev => ({ ...prev, confirmProlificId: '' }));
    }
  };

  const handleVerificationChange = (checked: boolean) => {
    setIsVerified(checked);
    if (errors.verification) {
      setErrors(prev => ({ ...prev, verification: '' }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors = {
      prolificId: '',
      confirmProlificId: '',
      verification: ''
    };

    // Validate Prolific ID format
    if (!prolificId) {
      newErrors.prolificId = 'Prolific ID is required';
    } else if (!validateProlificId(prolificId)) {
      newErrors.prolificId = 'Prolific ID should contain only letters and numbers (no special characters)';
    }

    // Validate confirm Prolific ID
    if (!confirmProlificId) {
      newErrors.confirmProlificId = 'Please confirm your Prolific ID';
    } else if (prolificId !== confirmProlificId) {
      newErrors.confirmProlificId = 'Prolific IDs do not match';
    }

    // Validate verification checkbox
    if (!isVerified) {
      newErrors.verification = 'Please verify your information is correct';
    }

    setErrors(newErrors);
    return !newErrors.prolificId && !newErrors.confirmProlificId && !newErrors.verification;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (validateForm()) {
      onProlificIDSubmit(prolificId);
    }
  };

  const isFormValid = prolificId && confirmProlificId && prolificId === confirmProlificId && isVerified && validateProlificId(prolificId);

  return (
    <Dialog open={isOpen} modal>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center space-x-2">
            <User className="h-6 w-6 text-blue-600" />
            <DialogTitle>Survey Access Required</DialogTitle>
          </div>
        </DialogHeader>
        
        <div className="space-y-6">
          <div className="text-sm text-gray-600">
            <p className="mb-2">
              Welcome to the BomBot! To use the service, please provide your Prolific ID as specified in the survey.
            </p>
            <p className="text-xs text-gray-500">
              Please verify your Prolific ID before accessing BomBot.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Prolific ID Input */}
            <div className="space-y-2">
              <Label htmlFor="prolificId">Prolific ID *</Label>
              <Input
                id="prolificId"
                type="text"
                placeholder="Enter your Prolific ID"
                value={prolificId}
                onChange={(e) => handleProlificIdChange(e.target.value)}
                className={errors.prolificId ? 'border-red-500' : ''}
              />
              {errors.prolificId && (
                <div className="flex items-center space-x-1 text-sm text-red-600">
                  <AlertCircle className="h-4 w-4" />
                  <span>{errors.prolificId}</span>
                </div>
              )}
            </div>

            {/* Confirm Prolific ID Input */}
            <div className="space-y-2">
              <Label htmlFor="confirmProlificId">Confirm Prolific ID *</Label>
              <Input
                id="confirmProlificId"
                type="text"
                placeholder="Re-enter your Prolific ID"
                value={confirmProlificId}
                onChange={(e) => handleConfirmProlificIdChange(e.target.value)}
                className={errors.confirmProlificId ? 'border-red-500' : ''}
              />
              {errors.confirmProlificId && (
                <div className="flex items-center space-x-1 text-sm text-red-600">
                  <AlertCircle className="h-4 w-4" />
                  <span>{errors.confirmProlificId}</span>
                </div>
              )}
              {!errors.confirmProlificId && prolificId && confirmProlificId && prolificId === confirmProlificId && (
                <div className="flex items-center space-x-1 text-sm text-green-600">
                  <CheckCircle className="h-4 w-4" />
                  <span>Prolific IDs match</span>
                </div>
              )}
            </div>

            {/* Verification Checkbox */}
            <div className="space-y-2">
              <div className="flex items-start space-x-2">
                <Checkbox
                  id="verification"
                  checked={isVerified}
                  onCheckedChange={handleVerificationChange}
                  className={errors.verification ? 'border-red-500' : ''}
                />
                <div className="space-y-1">
                  <Label 
                    htmlFor="verification" 
                    className="text-sm font-normal cursor-pointer"
                  >
                    I confirm that the Prolific ID entered above is correct and matches the Prolific ID provided in the survey instructions.
                  </Label>
                  {errors.verification && (
                    <div className="flex items-center space-x-1 text-sm text-red-600">
                      <AlertCircle className="h-4 w-4" />
                      <span>{errors.verification}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <div className="pt-4">
              <Button 
                type="submit" 
                className="w-full"
                disabled={!isFormValid}
              >
                Access BomBot
              </Button>
            </div>
          </form>

          <div className="text-xs text-gray-500 border-t pt-4">
            <p>
              BomBot v1.0.0
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ProlificIDCollectionDialog; 