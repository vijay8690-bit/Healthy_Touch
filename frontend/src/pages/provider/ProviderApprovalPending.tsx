import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Clock, CheckCircle, XCircle, AlertCircle, LogOut, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import providerService from '@/services/provider.service';

export default function ProviderApprovalPending() {
  const [providerStatus, setProviderStatus] = useState<'pending' | 'rejected' | 'approved' | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);
  const { logout, user } = useAuth();
  const navigate = useNavigate();
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    checkProviderStatus();
    
    // Auto-refresh every 15 seconds if status is pending
    if (providerStatus === 'pending') {
      intervalRef.current = setInterval(() => {
        checkProviderStatus(true);
      }, 15000);
    }
    
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [providerStatus]);

  const checkProviderStatus = async (isAutoRefresh = false) => {
    try {
      if (!isAutoRefresh) {
        setRefreshing(true);
      }
      
      const response = await providerService.getMyProfile();
      
      // Handle different response structures
      const providerData = response.provider || response.data?.provider || response.data;
      
      if (!providerData || !providerData.status) {
        console.error('Invalid provider data structure:', response);
        setLoading(false);
        setRefreshing(false);
        return;
      }
      
      const status = providerData.status;
      setProviderStatus(status);
      setLastChecked(new Date());
      
      if (status === 'rejected') {
        setRejectionReason(providerData.rejectionReason || 'Not specified');
        // Clear interval if rejected
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
        }
      } else if (status === 'approved') {
        // Clear interval and redirect to dashboard
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
        }
        navigate('/provider/dashboard', { replace: true });
      }
    } catch (error: any) {
      console.error('Error checking provider status:', error);
      // If unauthorized or provider not found, logout
      if (error.response?.status === 401 || error.response?.status === 404) {
        logout();
        navigate('/login');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  if (loading || !providerStatus) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-secondary/5">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          <p className="text-muted-foreground">Checking your status...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-secondary/5 p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        <Card className="p-8 shadow-xl">
          <div className="text-center">
            {/* Icon */}
            <div className="mx-auto mb-6">
              {providerStatus === 'pending' && (
                <div className="w-20 h-20 rounded-full bg-amber-500/10 flex items-center justify-center mx-auto">
                  <Clock className="w-10 h-10 text-amber-500" />
                </div>
              )}
              {providerStatus === 'rejected' && (
                <div className="w-20 h-20 rounded-full bg-destructive/10 flex items-center justify-center mx-auto">
                  <XCircle className="w-10 h-10 text-destructive" />
                </div>
              )}
              {providerStatus === 'approved' && (
                <div className="w-20 h-20 rounded-full bg-green-500/10 flex items-center justify-center mx-auto">
                  <CheckCircle className="w-10 h-10 text-green-500" />
                </div>
              )}
            </div>

            {/* Title */}
            <h1 className="font-display font-bold text-2xl mb-3 text-foreground">
              {providerStatus === 'pending' && 'Approval Pending'}
              {providerStatus === 'rejected' && 'Application Rejected'}
              {providerStatus === 'approved' && 'Approved!'}
            </h1>

            {/* Message */}
            <div className="mb-6 text-muted-foreground">
              {providerStatus === 'pending' && (
                <>
                  <p className="mb-3">
                    Your provider registration is under review by our admin team.
                  </p>
                  <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-4 text-sm">
                    <div className="flex items-start gap-2">
                      <AlertCircle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                      <div className="text-left">
                        <p className="font-medium text-amber-700 dark:text-amber-400 mb-1">
                          What happens next?
                        </p>
                        <ul className="text-amber-600 dark:text-amber-300 space-y-1">
                          <li>• Admin will verify your documents</li>
                          <li>• You'll receive an email notification</li>
                          <li>• Approval typically takes 24-48 hours</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </>
              )}
              {providerStatus === 'rejected' && (
                <>
                  <p className="mb-3">
                    Unfortunately, your provider application has been rejected.
                  </p>
                  <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4 text-sm text-left">
                    <p className="font-medium text-destructive mb-2">Reason:</p>
                    <p className="text-muted-foreground">{rejectionReason}</p>
                  </div>
                  <p className="mt-4 text-sm">
                    Please contact support if you believe this is an error or need more information.
                  </p>
                </>
              )}
            </div>

            {/* Actions */}
            <div className="space-y-3">
              <Button
                onClick={() => checkProviderStatus()}
                variant="outline"
                className="w-full"
                disabled={refreshing}
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
                {refreshing ? 'Checking...' : 'Refresh Status'}
              </Button>
              {providerStatus === 'pending' && lastChecked && (
                <p className="text-xs text-muted-foreground">
                  Last checked: {lastChecked.toLocaleTimeString()} • Auto-refreshing every 15s
                </p>
              )}
              <Button
                onClick={handleLogout}
                variant="ghost"
                className="w-full"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Logout
              </Button>
            </div>

            {/* User Info */}
            <div className="mt-6 pt-6 border-t border-border text-sm text-muted-foreground">
              Logged in as: <span className="font-medium">{user?.name}</span>
            </div>
          </div>
        </Card>
      </motion.div>
    </div>
  );
}
