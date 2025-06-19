import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { AlertCircle, Mail, CheckCircle } from 'lucide-react';

interface EmailCollectionDialogProps {
  isOpen: boolean;
  onEmailSubmit: (email: string) => void;
}

const EmailCollectionDialog: React.FC<EmailCollectionDialogProps> = ({
  isOpen,
  onEmailSubmit,
}) => {
  const [email, setEmail] = useState('');
  const [confirmEmail, setConfirmEmail] = useState('');
  const [isVerified, setIsVerified] = useState(false);
  const [errors, setErrors] = useState({
    email: '',
    confirmEmail: '',
    verification: ''
  });

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleEmailChange = (value: string) => {
    setEmail(value);
    if (errors.email) {
      setErrors(prev => ({ ...prev, email: '' }));
    }
  };

  const handleConfirmEmailChange = (value: string) => {
    setConfirmEmail(value);
    if (errors.confirmEmail) {
      setErrors(prev => ({ ...prev, confirmEmail: '' }));
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
      email: '',
      confirmEmail: '',
      verification: ''
    };

    // Validate email format
    if (!email) {
      newErrors.email = 'Email address is required';
    } else if (!validateEmail(email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    // Validate confirm email
    if (!confirmEmail) {
      newErrors.confirmEmail = 'Please confirm your email address';
    } else if (email !== confirmEmail) {
      newErrors.confirmEmail = 'Email addresses do not match';
    }

    // Validate verification checkbox
    if (!isVerified) {
      newErrors.verification = 'Please verify your information is correct';
    }

    setErrors(newErrors);
    return !newErrors.email && !newErrors.confirmEmail && !newErrors.verification;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (validateForm()) {
      onEmailSubmit(email);
    }
  };

  const isFormValid = email && confirmEmail && email === confirmEmail && isVerified && validateEmail(email);

  return (
    <Dialog open={isOpen} modal>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center space-x-2">
            <Mail className="h-6 w-6 text-blue-600" />
            <DialogTitle>Survey Access Required</DialogTitle>
          </div>
        </DialogHeader>
        
        <div className="space-y-6">
          <div className="text-sm text-gray-600">
            <p className="mb-2">
              Welcome to the BomBot security analysis survey! To participate, please provide your email address as specified in the survey instructions.
            </p>
            <p className="text-xs text-gray-500">
              Your email will be used solely for tracking survey responses and will not be shared with third parties.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email Input */}
            <div className="space-y-2">
              <Label htmlFor="email">Email Address *</Label>
              <Input
                id="email"
                type="email"
                placeholder="Enter your email address"
                value={email}
                onChange={(e) => handleEmailChange(e.target.value)}
                className={errors.email ? 'border-red-500' : ''}
              />
              {errors.email && (
                <div className="flex items-center space-x-1 text-sm text-red-600">
                  <AlertCircle className="h-4 w-4" />
                  <span>{errors.email}</span>
                </div>
              )}
            </div>

            {/* Confirm Email Input */}
            <div className="space-y-2">
              <Label htmlFor="confirmEmail">Confirm Email Address *</Label>
              <Input
                id="confirmEmail"
                type="email"
                placeholder="Re-enter your email address"
                value={confirmEmail}
                onChange={(e) => handleConfirmEmailChange(e.target.value)}
                className={errors.confirmEmail ? 'border-red-500' : ''}
              />
              {errors.confirmEmail && (
                <div className="flex items-center space-x-1 text-sm text-red-600">
                  <AlertCircle className="h-4 w-4" />
                  <span>{errors.confirmEmail}</span>
                </div>
              )}
              {!errors.confirmEmail && email && confirmEmail && email === confirmEmail && (
                <div className="flex items-center space-x-1 text-sm text-green-600">
                  <CheckCircle className="h-4 w-4" />
                  <span>Email addresses match</span>
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
                    I confirm that the email address entered above is correct and matches the email provided in the survey instructions.
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
              By proceeding, you agree to participate in the BomBot security analysis survey. 
              Your interactions will be recorded for research purposes.
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default EmailCollectionDialog; 