import express from 'express';
import { Register, Login, VerifyOTP, ResendOTP, Logout, ForgotPassword, ResetPassword, RequestUnsuspend, updateLocation, getMyReferralCode, PatientPasswordlessStart, PatientPasswordlessVerify, PatientPasswordlessCompleteProfile } from '../controllers/AuthController.js';
import { auth } from '../middlewares/Auth.js';
import { uploadProviderDocs, enforceUploadSizeLimits } from '../middlewares/upload.js';
import { attachSettings } from '../middlewares/SettingsCache.js';

const router = express.Router();

// Attach settings to all auth routes
router.use(attachSettings);

// Public routes
router.post('/register', uploadProviderDocs, enforceUploadSizeLimits, Register);
router.post('/verify-otp', VerifyOTP);
router.post('/resend-otp', ResendOTP);
router.post('/forgot-password', ForgotPassword);
router.post('/reset-password', ResetPassword);
router.post('/login', Login);
router.post('/patient/passwordless/start', PatientPasswordlessStart);
router.post('/patient/passwordless/verify', PatientPasswordlessVerify);
router.post('/patient/passwordless/complete-profile', PatientPasswordlessCompleteProfile);
router.post('/request-unsuspend', RequestUnsuspend);

// Protected routes
router.post('/logout', auth, Logout);
router.put('/update-location', auth, updateLocation);
router.get('/my-referral-code', auth, getMyReferralCode);

export default router;
