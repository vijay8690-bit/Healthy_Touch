import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import providerService from '@/services/provider.service';

/**
 * Hook to check provider approval status
 * Redirects to approval pending page if not approved
 * Returns loading state and provider status
 */
export const useProviderApproval = (checkOnMount = true) => {
  const [loading, setLoading] = useState(true);
  const [providerStatus, setProviderStatus] = useState<'pending' | 'approved' | 'rejected' | null>(null);
  const navigate = useNavigate();

  const checkApprovalStatus = async () => {
    try {
      setLoading(true);
      const response = await providerService.getMyProfile();
      
      if (response.success && response.provider) {
        const status = response.provider.status;
        setProviderStatus(status);
        
        // If not approved, redirect to approval pending page
        if (status !== 'approved') {
          navigate('/provider/approval-pending', { replace: true });
          return false;
        }
        
        return true;
      }
      
      return false;
    } catch (error: any) {
      // Check if error is due to approval status
      if (error.response?.status === 403 && error.response?.data?.providerStatus) {
        navigate('/provider/approval-pending', { replace: true });
        return false;
      }
      
      console.error('Error checking provider approval:', error);
      return false;
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (checkOnMount) {
      checkApprovalStatus();
    }
  }, []);

  return {
    loading,
    providerStatus,
    isApproved: providerStatus === 'approved',
    checkApprovalStatus,
  };
};
