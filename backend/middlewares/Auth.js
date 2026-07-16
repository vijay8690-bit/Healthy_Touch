import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import Provider from '../models/Provider.js';


const auth = async (req, res, next) => {
  try {
    let token;

    // Check if authorization header exists and has Bearer token
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      // Extract token
      token = req.headers.authorization.split(' ')[1];
      
      // Verify token
      const decoded = jwt.verify(token, process.env.SECRET_KEY);
      
      // Get user from token
      req.user = await User.findById(decoded.id).select('-password');
      
      if (!req.user) {
        return res.status(401).json({ message: 'Not authorized, user not found' });
      }
      
      // Check if user is suspended
      if (req.user.isSuspended) {
        return res.status(403).json({
          success: false,
          message: 'Your account has been suspended',
          isSuspended: true,
          suspension: {
            reason: req.user.suspension?.reason,
            suspendedAt: req.user.suspension?.suspendedAt
          }
        });
      }
      
      next();
    } else {
      // No token provided
      return res.status(401).json({ message: 'Not authorized, no token' });
    }
  } catch (error) {
    console.error('Auth middleware error:', error);
    return res.status(401).json({ message: 'Not authorized, token failed' });
  }
};

const authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ 
        success: false,
        message: `Access denied. User role '${req.user.role}' is not authorized. Required roles: ${roles.join(', ')}` 
      });
    }
    next();
  };
};

// Provider category-based authorization middleware
// Usage: authorizeProviderCategory('Doctor', 'Nurse')
const authorizeProviderCategory = (...categories) => {
  return async (req, res, next) => {
    try {
      // First check if user is authenticated
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Not authenticated'
        });
      }

      // Check if user is a provider
      if (req.user.role !== 'provider') {
        return res.status(403).json({
          success: false,
          message: 'Access denied. This resource is only available to providers.'
        });
      }

      // Get user's category from database (more secure than relying on token)
      const user = await User.findById(req.user._id).select('category');
      
      if (!user || !user.category) {
        return res.status(403).json({
          success: false,
          message: 'Provider category not found. Please complete your profile.'
        });
      }

      // Check if user's category is in the allowed categories
      if (!categories.includes(user.category)) {
        return res.status(403).json({
          success: false,
          message: `Access denied. This resource is only available to: ${categories.join(', ')}. Your category: ${user.category}`
        });
      }

      // Attach category to request for downstream use
      req.providerCategory = user.category;
      next();
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: 'Error verifying provider category',
        error: error.message
      });
    }
  };
};

// Admin-only middleware
const adminOnly = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Not authenticated'
    });
  }

  if (req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'Access denied. Admin privileges required.'
    });
  }

  next();
};

// Provider approval check middleware
const checkProviderApproval = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Not authenticated'
      });
    }

    // Only check for provider role
    if (req.user.role !== 'provider') {
      return next(); // Not a provider, skip check
    }

    // Find provider profile
    const provider = await Provider.findOne({ userId: req.user._id });

    if (!provider) {
      return res.status(404).json({
        success: false,
        message: 'Provider profile not found. Please complete your registration.',
        needsRegistration: true
      });
    }

    // Check approval status
    if (provider.status === 'pending') {
      return res.status(403).json({
        success: false,
        message: 'Your provider account is pending admin approval. Please wait for verification.',
        status: 'pending',
        providerStatus: provider.status
      });
    }

    if (provider.status === 'rejected') {
      return res.status(403).json({
        success: false,
        message: 'Your provider account has been rejected.',
        status: 'rejected',
        rejectionReason: provider.rejectionReason || 'Not specified',
        providerStatus: provider.status
      });
    }

    // Provider is approved, attach to request
    req.provider = provider;
    next();
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Error checking provider approval status',
      error: error.message
    });
  }
};

export { auth, authorize, authorizeProviderCategory, adminOnly, checkProviderApproval };