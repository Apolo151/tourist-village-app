import { Router, Request, Response } from 'express';
import { AuthService } from '../services/authService';
import { ValidationMiddleware } from '../middleware/validation';
import { authenticateToken, createAuthRateLimit } from '../middleware/auth';
import { LoginRequest, RegisterRequest, RefreshTokenRequest } from '../types';

export const authRouter = Router();
const authService = new AuthService();

// Apply rate limiting to auth endpoints
// const authRateLimit = createAuthRateLimit();

/**
 * POST /api/auth/register
 * Register a new user
 */
authRouter.post(
  '/register',
  // authRateLimit,
  ValidationMiddleware.validateRegister,
  async (req: Request, res: Response) => {
    try {
      const authResponse = await authService.register(req.body as RegisterRequest);

      res.status(201).json({
        success: true,
        data: authResponse,
        message: 'User registered successfully'
      });
    } catch (error) {
      console.error('Registration error:', error);
      
      if (error instanceof Error) {
        // Handle specific business logic errors
        if (error.message.includes('already exists')) {
          return res.status(409).json({
            success: false,
            error: 'Conflict',
            message: error.message
          });
        }
        
        if (error.message.includes('Invalid email') || 
            error.message.includes('Password must')) {
          return res.status(400).json({
            success: false,
            error: 'Validation error',
            message: error.message
          });
        }
      }

      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: 'Failed to register user'
      });
    }
  }
);

/**
 * POST /api/auth/login
 * Login user with email and password
 */
authRouter.post(
  '/login',
  // authRateLimit,
  ValidationMiddleware.validateLogin,
  async (req: Request, res: Response) => {
    try {
      const authResponse = await authService.login(req.body as LoginRequest);

      res.json({
        success: true,
        data: authResponse,
        message: 'Login successful'
      });
    } catch (error) {
      console.error('Login error:', error);
      
      if (error instanceof Error) {
        if (error.message.includes('Invalid email or password')) {
          return res.status(401).json({
            success: false,
            error: 'Authentication failed',
            message: 'Invalid email or password'
          });
        }
        
        if (error.message.includes('deactivated')) {
          return res.status(403).json({
            success: false,
            error: 'Account deactivated',
            message: error.message
          });
        }
      }

      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: 'Failed to login'
      });
    }
  }
);

/**
 * POST /api/auth/refresh
 * Refresh access token using refresh token
 */
authRouter.post(
  '/refresh',
  ValidationMiddleware.validateRefreshToken,
  async (req: Request, res: Response) => {
    try {
      const authResponse = await authService.refreshToken(req.body as RefreshTokenRequest);

      res.json({
        success: true,
        data: authResponse,
        message: 'Token refreshed successfully'
      });
    } catch (error) {
      console.error('Token refresh error:', error);
      
      if (error instanceof Error) {
        if (error.message.includes('expired') || 
            error.message.includes('invalid') ||
            error.message.includes('not found')) {
          return res.status(401).json({
            success: false,
            error: 'Invalid refresh token',
            message: error.message
          });
        }
        
        if (error.message.includes('deactivated')) {
          return res.status(403).json({
            success: false,
            error: 'Account deactivated',
            message: error.message
          });
        }
      }

      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: 'Failed to refresh token'
      });
    }
  }
);

/**
 * POST /api/auth/logout
 * Logout user by invalidating refresh token
 */
authRouter.post(
  '/logout',
  authenticateToken,
  async (req: Request, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          error: 'Unauthorized',
          message: 'Authentication required'
        });
      }

      await authService.logout(req.user.id);

      res.json({
        success: true,
        message: 'Logout successful'
      });
    } catch (error) {
      console.error('Logout error:', error);
      
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: 'Failed to logout'
      });
    }
  }
);

/**
 * GET /api/auth/me
 * Get current user information
 */
authRouter.get(
  '/me',
  authenticateToken,
  async (req: Request, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          error: 'Unauthorized',
          message: 'Authentication required'
        });
      }

      res.json({
        success: true,
        data: req.user,
        message: 'User information retrieved successfully'
      });
    } catch (error) {
      console.error('Get user info error:', error);
      
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: 'Failed to get user information'
      });
    }
  }
);

/**
 * POST /api/auth/change-password
 * Change user password
 */
authRouter.post(
  '/change-password',
  authenticateToken,
  ValidationMiddleware.validateChangePassword,
  async (req: Request, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          error: 'Unauthorized',
          message: 'Authentication required'
        });
      }

      const { current_password, new_password } = req.body;
      
      await authService.changePassword(req.user.id, current_password, new_password);

      res.json({
        success: true,
        message: 'Password changed successfully. Please login with your new password.'
      });
    } catch (error) {
      console.error('Change password error:', error);
      
      if (error instanceof Error) {
        if (error.message.includes('incorrect') || 
            error.message.includes('not found')) {
          return res.status(400).json({
            success: false,
            error: 'Validation error',
            message: error.message
          });
        }
        
        if (error.message.includes('Password must')) {
          return res.status(400).json({
            success: false,
            error: 'Validation error',
            message: error.message
          });
        }
      }

      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: 'Failed to change password'
      });
    }
  }
);

/**
 * POST /api/auth/verify-token
 * Verify if access token is valid (useful for frontend)
 */
authRouter.post(
  '/verify-token',
  async (req: Request, res: Response) => {
    try {
      const { token } = req.body;
      
      if (!token || typeof token !== 'string') {
        return res.status(400).json({
          success: false,
          error: 'Invalid request',
          message: 'Token is required'
        });
      }

      const user = await authService.verifyAccessToken(token);

      res.json({
        success: true,
        data: { user, valid: true },
        message: 'Token is valid'
      });
    } catch (error) {
      console.error('Token verification error:', error);
      
      if (error instanceof Error) {
        if (error.message.includes('expired') || 
            error.message.includes('invalid') ||
            error.message.includes('malformed')) {
          return res.status(401).json({
            success: false,
            data: { valid: false },
            error: 'Invalid token',
            message: error.message
          });
        }
        
        if (error.message.includes('deactivated')) {
          return res.status(403).json({
            success: false,
            data: { valid: false },
            error: 'Account deactivated',
            message: error.message
          });
        }
      }

      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: 'Failed to verify token'
      });
    }
  }
);

/**
 * GET /api/auth/health
 * Health check for auth service
 */
authRouter.get('/health', (req: Request, res: Response) => {
  res.json({
    success: true,
    data: {
      service: 'authentication',
      status: 'healthy',
      timestamp: new Date().toISOString()
    },
    message: 'Authentication service is healthy'
  });
}); 