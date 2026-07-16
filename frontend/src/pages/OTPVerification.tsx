import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Heart, ArrowRight, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { authService } from '@/services';

export default function OTPVerification() {
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [timer, setTimer] = useState(60);
  const [canResend, setCanResend] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const { login } = useAuth();

  // Get userId, email, and role from navigation state
  const userId = location.state?.userId || '';
  const email = location.state?.email || '';
  const role = location.state?.role || 'patient';
  const providerType = location.state?.providerType || '';
  const name = location.state?.name || '';
  const providerRoles = new Set(['doctor', 'nurse', 'Lab', 'physiotherapy', 'ambulance', 'caretaker', 'provider']);
  const isProviderVerification = providerRoles.has(role) || Boolean(providerType);

  // Redirect if no userId or email in state
  useEffect(() => {
    if (!userId || !email) {
      toast({
        title: 'Error',
        description: 'Please complete registration first',
        variant: 'destructive',
      });
      navigate('/auth');
    }
  }, [userId, email, navigate, toast]);

  // Timer countdown
  useEffect(() => {
    if (timer > 0) {
      const interval = setInterval(() => {
        setTimer((prev) => prev - 1);
      }, 1000);
      return () => clearInterval(interval);
    } else {
      setCanResend(true);
    }
  }, [timer]);

  // Auto-focus first input on mount
  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

  const handleOtpChange = (index: number, value: string) => {
    // Only allow single digit
    if (value.length > 1) return;
    
    // Only allow numbers
    if (!/^\d*$/.test(value)) return;

    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    // Auto-focus next input
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace') {
      e.preventDefault();
      const newOtp = [...otp];

      if (newOtp[index]) {
        newOtp[index] = '';
        setOtp(newOtp);
        return;
      }

      if (index > 0) {
        newOtp[index - 1] = '';
        setOtp(newOtp);
        inputRefs.current[index - 1]?.focus();
      }
    }

    if (e.key === 'Delete' && otp[index]) {
      e.preventDefault();
      const newOtp = [...otp];
      newOtp[index] = '';
      setOtp(newOtp);
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text/plain').slice(0, 6);
    
    if (!/^\d+$/.test(pastedData)) return;

    const newOtp = [...otp];
    pastedData.split('').forEach((char, index) => {
      if (index < 6) {
        newOtp[index] = char;
      }
    });
    setOtp(newOtp);

    // Focus last filled input or last input
    const lastIndex = Math.min(pastedData.length, 5);
    inputRefs.current[lastIndex]?.focus();
  };

  const handleResendOTP = async () => {
    try {
      setTimer(60);
      setCanResend(false);
      setOtp(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
      
      // Call resend OTP API
      await authService.resendOTP(userId);
      
      toast({
        title: 'OTP Resent!',
        description: `A new verification code has been sent to ${email}`,
      });
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || error.message || 'Failed to resend OTP';
      toast({
        title: 'Resend Failed',
        description: errorMessage,
        variant: 'destructive',
      });
      // Reset timer state even on error
      setCanResend(true);
      setTimer(0);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const otpValue = otp.join('');
    
    // Validate OTP length
    if (otpValue.length !== 6) {
      toast({
        title: 'Invalid OTP',
        description: 'Please enter all 6 digits',
        variant: 'destructive',
      });
      return;
    }

    setIsVerifying(true);

    try {
      // Call verify OTP API
      const response = await authService.verifyOTP(userId, otpValue);
      
      // OTP verified successfully, the response contains the token and user data
      // The auth service automatically stores the token and user data in localStorage
      
      toast({
        title: 'Success!',
        description: 'Email verified successfully. Please login to continue.',
      });

      // Redirect to login page after successful verification
      setTimeout(() => {
        navigate(isProviderVerification ? '/provider/login' : '/auth', {
          state: {
            verified: true,
            email: email,
            role: isProviderVerification ? 'provider' : role,
            providerType: providerType || (isProviderVerification ? role : undefined),
          },
        });
      }, 1500);
      
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || error.message || 'OTP verification failed';
      toast({
        title: 'Invalid OTP',
        description: errorMessage,
        variant: 'destructive',
      });
      setOtp(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
    } finally {
      setIsVerifying(false);
    }
  };

  const isOtpComplete = otp.every((digit) => digit !== '');

  return (
    <div className="min-h-screen bg-background flex">
      {/* Left Panel - OTP Form */}
      <div className="flex-1 flex items-center justify-center p-4 md:p-8">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="w-full max-w-md"
        >
          {/* Logo */}
          <Link to="/" className="flex items-center justify-center mb-8">
            <img src="/healthy-touch-logo.png" className="h-20" alt="Healthy Touch" />
          </Link>

          <div className="text-center mb-8">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <Heart className="w-8 h-8 text-primary" />
            </div>
            <h1 className="font-display text-2xl font-bold mb-2">Verify Your Email</h1>
            <p className="text-muted-foreground">
              We've sent a 6-digit code to
              <br />
              <span className="font-medium text-foreground">{email}</span>
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* OTP Input */}
            <div className="space-y-3">
              <label className="text-sm font-medium text-foreground">Enter OTP</label>
              <div className="flex gap-2 justify-between" onPaste={handlePaste}>
                {otp.map((digit, index) => (
                  <Input
                    key={index}
                    ref={(el) => (inputRefs.current[index] = el)}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleOtpChange(index, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(index, e)}
                    className="w-12 h-12 text-center text-lg font-bold"
                    disabled={isVerifying}
                  />
                ))}
              </div>
            </div>

            {/* Timer */}
            <div className="text-center">
              {!canResend ? (
                <p className="text-sm text-muted-foreground">
                  Resend OTP in{' '}
                  <span className="font-medium text-primary">
                    {Math.floor(timer / 60)}:{(timer % 60).toString().padStart(2, '0')}
                  </span>
                </p>
              ) : (
                <button
                  type="button"
                  onClick={handleResendOTP}
                  className="text-sm text-primary hover:underline font-medium"
                >
                  Resend OTP
                </button>
              )}
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              size="lg"
              className="w-full"
              disabled={!isOtpComplete || isVerifying}
            >
              {isVerifying ? 'Verifying...' : 'Verify Email'}
              {!isVerifying && <ArrowRight className="w-5 h-5" />}
            </Button>

          </form>

          <div className="mt-6 text-center">
            <Link to="/auth" className="text-sm text-muted-foreground hover:text-foreground">
              ← Back to login
            </Link>
          </div>
        </motion.div>
      </div>

      {/* Right Panel - Hero */}
      <div className="hidden lg:flex flex-1 bg-gradient-to-br from-primary to-secondary p-12 items-center justify-center relative overflow-hidden">
        <div className="absolute inset-0 bg-cover bg-center opacity-20" style={{ backgroundImage: "url('/nursing-care.jpg')" }} />
        
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="text-center text-primary-foreground relative z-10 max-w-lg"
        >
          <div className="w-20 h-20 rounded-3xl bg-primary-foreground/20 backdrop-blur-sm flex items-center justify-center mx-auto mb-8">
            <CheckCircle2 className="w-10 h-10" />
          </div>
          <h2 className="font-display text-3xl font-bold mb-4">
            Almost There!
          </h2>
          <p className="text-primary-foreground/80 mb-8">
            Just one more step to verify your email and get started with Healthy Touch.
          </p>
          
          <div className="space-y-4 text-left bg-primary-foreground/10 rounded-2xl p-6 backdrop-blur-sm">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium">Secure Account</p>
                <p className="text-sm text-primary-foreground/70">Your account is protected with email verification</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium">Quick Access</p>
                <p className="text-sm text-primary-foreground/70">Access your dashboard right after verification</p>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
    
  );
}
