import { Request, Response, NextFunction } from 'express';
import { AuthService } from '../services/authService';
import { PublicUser } from '../types';

const authService = new AuthService();

/**
 * Middleware to authenticate user with JWT token
 * Adds user to request object if valid token is provided
 */
export const authenticateToken = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.startsWith('Bearer ') 
      ? authHeader.substring(7) 
      : null;

    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized',
        message: 'Access token is required'
      });
    }

    // Verify token and get user
    const user = await authService.verifyAccessToken(token);
    req.user = user;
    
    next();
  } catch (error) {
    console.error('Authentication error:', error);
    
    if (error instanceof Error) {
      if (error.message.includes('expired')) {
        return res.status(401).json({
          success: false,
          error: 'Token expired',
          message: 'Access token has expired. Please refresh your token.'
        });
      }
      
      if (error.message.includes('invalid') || error.message.includes('malformed')) {
        return res.status(401).json({
          success: false,
          error: 'Invalid token',
          message: 'Invalid access token'
        });
      }
      
      if (error.message.includes('deactivated')) {
        return res.status(403).json({
          success: false,
          error: 'Account deactivated',
          message: 'Your account has been deactivated'
        });
      }
    }

    return res.status(401).json({
      success: false,
      error: 'Unauthorized',
      message: 'Authentication failed'
    });
  }
};

/**
 * Middleware to check if user has required role(s)
 * Must be used after authenticateToken middleware
 */
export const requireRole = (...allowedRoles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized',
        message: 'Authentication required'
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: 'Forbidden',
        message: `Access denied. Required role: ${allowedRoles.join(' or ')}`
      });
    }

    next();
  };
};

/**
 * Middleware to check if user is admin or super_admin
 */
export const requireAdmin = requireRole('admin', 'super_admin');

/**
 * Middleware to check if user is super_admin
 */
export const requireSuperAdmin = requireRole('super_admin');

/**
 * Middleware to check if user owns the resource or is admin
 * Expects userId to be in route params or request body
 */
export const requireOwnershipOrAdmin = (userIdField: string = 'id') => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized',
        message: 'Authentication required'
      });
    }

    // Super admins and admins have access to everything
    if (['super_admin', 'admin'].includes(req.user.role)) {
      return next();
    }

    // Get user ID from params or body
    const resourceUserId = req.params[userIdField] || req.body[userIdField];
    const currentUserId = req.user.id;

    if (!resourceUserId) {
      return res.status(400).json({
        success: false,
        error: 'Bad Request',
        message: `${userIdField} is required`
      });
    }

    // Check if user owns the resource
    if (parseInt(resourceUserId) !== currentUserId) {
      return res.status(403).json({
        success: false,
        error: 'Forbidden',
        message: 'You can only access your own resources'
      });
    }

    next();
  };
};

/**
 * Optional authentication middleware
 * Adds user to request if valid token is provided, but doesn't require it
 */
export const optionalAuth = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.startsWith('Bearer ') 
      ? authHeader.substring(7) 
      : null;

    if (token) {
      try {
        const user = await authService.verifyAccessToken(token);
        req.user = user;
      } catch (error) {
        // Token is invalid, but we don't fail the request
        console.warn('Optional auth failed:', error instanceof Error ? error.message : 'Unknown error');
      }
    }

    next();
  } catch (error) {
    // Even if there's an unexpected error, we continue without auth
    console.error('Optional auth middleware error:', error);
    next();
  }
};

/**
 * Middleware to filter data based on user's responsible village
 * If user is admin with responsible_village set, only show data from that village
 * If user is not admin or has no responsible_village, no filtering is applied
 */
export const filterByResponsibleVillage = () => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return next();
    }

    // Only apply filtering for admin users with responsible_village set
    if (req.user.role === 'admin' && req.user.responsible_village) {
      // Add village filter to request for services to use
      req.villageFilter = req.user.responsible_village;
    }

    next();
  };
};

/**
 * Rate limiting helper for auth endpoints
 */
export const createAuthRateLimit = () => {
  const attempts = new Map<string, { count: number; resetTime: number }>();
  const MAX_ATTEMPTS = 5;
  const WINDOW_MS = 15 * 60 * 1000; // 15 minutes

  return (req: Request, res: Response, next: NextFunction) => {
    const ip = req.ip || req.connection.remoteAddress || 'unknown';
    const now = Date.now();
    
    // Clean up expired entries
    for (const [key, value] of attempts.entries()) {
      if (now > value.resetTime) {
        attempts.delete(key);
      }
    }

    const current = attempts.get(ip);
    
    if (!current) {
      attempts.set(ip, { count: 1, resetTime: now + WINDOW_MS });
      return next();
    }

    if (now > current.resetTime) {
      attempts.set(ip, { count: 1, resetTime: now + WINDOW_MS });
      return next();
    }

    if (current.count >= MAX_ATTEMPTS) {
      return res.status(429).json({
        success: false,
        error: 'Too Many Requests',
        message: 'Too many authentication attempts. Please try again later.',
        retry_after: Math.ceil((current.resetTime - now) / 1000)
      });
    }

    current.count++;
    next();
  };
};

/**
 * Middleware to validate API key for service-to-service communication
 */
export const requireApiKey = (req: Request, res: Response, next: NextFunction) => {
  const apiKey = req.headers['x-api-key'] as string;
  const validApiKey = process.env.API_KEY;

  if (!validApiKey) {
    console.error('API_KEY environment variable not set');
    return res.status(500).json({
      success: false,
      error: 'Server Configuration Error',
      message: 'API key validation not configured'
    });
  }

  if (!apiKey || apiKey !== validApiKey) {
    return res.status(401).json({
      success: false,
      error: 'Unauthorized',
      message: 'Valid API key required'
    });
  }

  next();
}; 