import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { CreditCard, Save, AlertCircle, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import axios from 'axios';
import { API_BASE_URL } from '@/config/api.config';

interface BankDetails {
  accountHolderName: string;
  bankAccount: string;
  ifscCode: string;
  updatedAt?: string;
}

const BankDetailsForm = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [bankDetails, setBankDetails] = useState<BankDetails>({
    accountHolderName: '',
    bankAccount: '',
    ifscCode: '',
  });

  useEffect(() => {
    fetchBankDetails();
  }, []);

  const fetchBankDetails = async () => {
    try {
      setFetching(true);
      const token = localStorage.getItem('healthytouch_token');
      const response = await axios.get(
        `${API_BASE_URL}/provider/bank-details`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (response.data.success && response.data.bankDetails) {
        setBankDetails(response.data.bankDetails);
      }
    } catch (error: any) {
      console.error('Fetch bank details error:', error);
    } finally {
      setFetching(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!bankDetails.accountHolderName.trim()) {
      toast({
        title: 'Validation Error',
        description: 'Account holder name is required',
        variant: 'destructive',
      });
      return;
    }

    if (!bankDetails.bankAccount.trim()) {
      toast({
        title: 'Validation Error',
        description: 'Bank account number is required',
        variant: 'destructive',
      });
      return;
    }

    if (!bankDetails.ifscCode.trim()) {
      toast({
        title: 'Validation Error',
        description: 'IFSC code is required',
        variant: 'destructive',
      });
      return;
    }

    // IFSC code format validation (11 characters, alphanumeric)
    const ifscRegex = /^[A-Z]{4}0[A-Z0-9]{6}$/;
    if (!ifscRegex.test(bankDetails.ifscCode.toUpperCase())) {
      toast({
        title: 'Invalid IFSC Code',
        description: 'Please enter a valid 11-character IFSC code',
        variant: 'destructive',
      });
      return;
    }

    try {
      setLoading(true);
      const token = localStorage.getItem('healthytouch_token');
      const response = await axios.put(
        `${API_BASE_URL}/provider/bank-details`,
        bankDetails,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (response.data.success) {
        toast({
          title: 'Success',
          description: 'Bank details updated successfully',
        });
        setBankDetails(response.data.bankDetails);
      }
    } catch (error: any) {
      console.error('Update bank details error:', error);
      toast({
        title: 'Error',
        description:
          error.response?.data?.message || 'Failed to update bank details',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: keyof BankDetails, value: string) => {
    setBankDetails((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  if (fetching) {
    return (
      <div className="card-healthcare p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-gray-200 rounded w-1/4"></div>
          <div className="h-10 bg-gray-200 rounded"></div>
          <div className="h-10 bg-gray-200 rounded"></div>
          <div className="h-10 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="card-healthcare"
    >
      <div className="p-4 border-b">
        <div className="flex items-center gap-3">
          <CreditCard className="w-5 h-5 text-primary" />
          <div>
            <h3 className="font-semibold">Bank Details</h3>
            <p className="text-sm text-gray-500">
              Update your bank account for receiving payments
            </p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="p-6 space-y-4">
        {/* Info Banner */}
        <div className="flex gap-3 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <AlertCircle className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
          <div className="text-sm text-blue-800">
            <p className="font-medium">Important Information</p>
            <p className="mt-1">
              Your bank details will be securely stored and used for payout
              transfers. Ensure all information is accurate to avoid payment
              delays.
            </p>
          </div>
        </div>

        {/* Account Holder Name */}
        <div>
          <label className="block text-sm font-medium mb-2">
            Account Holder Name <span className="text-red-500">*</span>
          </label>
          <Input
            type="text"
            value={bankDetails.accountHolderName}
            onChange={(e) =>
              handleInputChange('accountHolderName', e.target.value)
            }
            placeholder="Enter account holder name"
            required
          />
        </div>

        {/* Bank Account Number */}
        <div>
          <label className="block text-sm font-medium mb-2">
            Bank Account Number <span className="text-red-500">*</span>
          </label>
          <Input
            type="text"
            value={bankDetails.bankAccount}
            onChange={(e) => handleInputChange('bankAccount', e.target.value)}
            placeholder="Enter bank account number"
            required
          />
        </div>

        {/* IFSC Code */}
        <div>
          <label className="block text-sm font-medium mb-2">
            IFSC Code <span className="text-red-500">*</span>
          </label>
          <Input
            type="text"
            value={bankDetails.ifscCode}
            onChange={(e) =>
              handleInputChange('ifscCode', e.target.value.toUpperCase())
            }
            placeholder="Enter IFSC code (e.g., SBIN0001234)"
            maxLength={11}
            required
          />
          <p className="text-xs text-gray-500 mt-1">
            11-character code (e.g., SBIN0001234)
          </p>
        </div>

        {/* Last Updated */}
        {bankDetails.updatedAt && (
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <CheckCircle className="w-4 h-4 text-green-600" />
            <span>
              Last updated on{' '}
              {new Date(bankDetails.updatedAt).toLocaleDateString('en-IN', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </span>
          </div>
        )}

        {/* Submit Button */}
        <Button type="submit" disabled={loading} className="w-full">
          <Save className="w-4 h-4 mr-2" />
          {loading ? 'Saving...' : 'Save Bank Details'}
        </Button>
      </form>
    </motion.div>
  );
};

export default BankDetailsForm;
