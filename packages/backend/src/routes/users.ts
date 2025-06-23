import { Router, Request, Response } from 'express';
import { UserService } from '../services/userService';
import { ValidationMiddleware } from '../middleware/validation';
import { authenticateToken, requireAdmin, requireOwnershipOrAdmin } from '../middleware/auth';
import { UserFilters } from '../types';

export const usersRouter = Router();
const userService = new UserService();

/**
 * GET /api/users
 * List all users with filtering, sorting, and pagination
 */
usersRouter.get(
  '/',
  authenticateToken,
  requireAdmin,
  ValidationMiddleware.validateUserQueryParams,
  async (req: Request, res: Response) => {
    try {
      const filters: UserFilters = {
        search: req.query.search as string,
        role: req.query.role as 'super_admin' | 'admin' | 'owner' | 'renter',
        page: req.query.page ? parseInt(req.query.page as string) : 1,
        limit: req.query.limit ? parseInt(req.query.limit as string) : 10,
        sort_by: req.query.sort_by as string || 'name',
        sort_order: (req.query.sort_order as 'asc' | 'desc') || 'asc'
      };

      const result = await userService.getUsers(filters);

      res.json({
        success: true,
        data: result.data,
        pagination: result.pagination,
        message: `Found ${result.pagination.total} users`
      });
    } catch (error) {
      console.error('Error fetching users:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: 'Failed to fetch users'
      });
    }
  }
);



/**
 * GET /api/users/:id
 * Get user details by ID
 */
usersRouter.get(
  '/:id',
  authenticateToken,
  requireOwnershipOrAdmin('id'),
  ValidationMiddleware.validateIdParam,
  async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const user = await userService.getUserById(id);

      if (!user) {
        return res.status(404).json({
          success: false,
          error: 'Not found',
          message: 'User not found'
        });
      }

      res.json({
        success: true,
        data: user,
        message: 'User retrieved successfully'
      });
    } catch (error) {
      console.error('Error fetching user:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: 'Failed to fetch user'
      });
    }
  }
);

/**
 * POST /api/users
 * Create a new user
 */
usersRouter.post(
  '/',
  authenticateToken,
  requireAdmin,
  ValidationMiddleware.validateCreateUser,
  async (req: Request, res: Response) => {
    try {
      const user = await userService.createUser(req.body);

      res.status(201).json({
        success: true,
        data: user,
        message: 'User created successfully'
      });
    } catch (error) {
      console.error('Error creating user:', error);
      
      if (error instanceof Error) {
        // Handle specific business logic errors
        if (error.message.includes('already exists') || 
            error.message.includes('Invalid email') ||
            error.message.includes('Invalid phone')) {
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
        message: 'Failed to create user'
      });
    }
  }
);

/**
 * PUT /api/users/:id
 * Update user by ID
 */
usersRouter.put(
  '/:id',
  authenticateToken,
  requireOwnershipOrAdmin('id'),
  ValidationMiddleware.validateIdParam,
  ValidationMiddleware.validateUpdateUser,
  async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const user = await userService.updateUser(id, req.body);

      res.json({
        success: true,
        data: user,
        message: 'User updated successfully'
      });
    } catch (error) {
      console.error('Error updating user:', error);
      
      if (error instanceof Error) {
        if (error.message === 'User not found') {
          return res.status(404).json({
            success: false,
            error: 'Not found',
            message: error.message
          });
        }
        
        if (error.message.includes('already exists') || 
            error.message.includes('Invalid email') ||
            error.message.includes('Invalid phone')) {
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
        message: 'Failed to update user'
      });
    }
  }
);

/**
 * DELETE /api/users/:id
 * Delete user by ID
 */
usersRouter.delete(
  '/:id',
  authenticateToken,
  requireAdmin,
  ValidationMiddleware.validateIdParam,
  async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      await userService.deleteUser(id);

      res.json({
        success: true,
        message: 'User deleted successfully'
      });
    } catch (error) {
      console.error('Error deleting user:', error);
      
      if (error instanceof Error) {
        if (error.message === 'User not found') {
          return res.status(404).json({
            success: false,
            error: 'Not found',
            message: error.message
          });
        }
        
        if (error.message.includes('Cannot delete user')) {
          return res.status(409).json({
            success: false,
            error: 'Conflict',
            message: error.message
          });
        }
      }

      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: 'Failed to delete user'
      });
    }
  }
);

/**
 * GET /api/users/:id/stats
 * Get user statistics
 */
usersRouter.get(
  '/:id/stats',
  authenticateToken,
  requireOwnershipOrAdmin('id'),
  ValidationMiddleware.validateIdParam,
  async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const stats = await userService.getUserStats(id);

      res.json({
        success: true,
        data: stats,
        message: 'User statistics retrieved successfully'
      });
    } catch (error) {
      console.error('Error fetching user statistics:', error);
      
      if (error instanceof Error) {
        if (error.message === 'User not found') {
          return res.status(404).json({
            success: false,
            error: 'Not found',
            message: error.message
          });
        }
      }

      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: 'Failed to fetch user statistics'
      });
    }
  }
);

/**
 * GET /api/users/by-role/:role
 * Get users by role
 */
usersRouter.get(
  '/by-role/:role',
  authenticateToken,
  requireAdmin,
  async (req: Request, res: Response) => {
    try {
      const role = req.params.role as 'super_admin' | 'admin' | 'owner' | 'renter';

      // Validate role
      if (!['super_admin', 'admin', 'owner', 'renter'].includes(role)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid role',
          message: 'Role must be one of: super_admin, admin, owner, renter'
        });
      }

      const users = await userService.getUsersByRole(role);

      res.json({
        success: true,
        data: users,
        message: `Found ${users.length} users with role: ${role}`
      });
    } catch (error) {
      console.error('Error fetching users by role:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: 'Failed to fetch users by role'
      });
    }
  }
);

/**
 * GET /api/users/search/by-email/:email
 * Get user by email
 */
usersRouter.get(
  '/search/by-email/:email',
  authenticateToken,
  requireAdmin,
  async (req: Request, res: Response) => {
    try {
      const email = req.params.email;

      if (!email || typeof email !== 'string') {
        return res.status(400).json({
          success: false,
          error: 'Invalid email',
          message: 'Email parameter is required'
        });
      }

      const user = await userService.getUserByEmail(email);

      if (!user) {
        return res.status(404).json({
          success: false,
          error: 'Not found',
          message: 'User not found'
        });
      }

      res.json({
        success: true,
        data: user,
        message: 'User retrieved successfully'
      });
    } catch (error) {
      console.error('Error fetching user by email:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: 'Failed to fetch user by email'
      });
    }
  }
);

/**
 * PATCH /api/users/:id/status
 * Activate/Deactivate user
 */
usersRouter.patch(
  '/:id/status',
  authenticateToken,
  requireAdmin,
  ValidationMiddleware.validateIdParam,
  async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const { is_active } = req.body;

      if (typeof is_active !== 'boolean') {
        return res.status(400).json({
          success: false,
          error: 'Validation error',
          message: 'is_active must be a boolean value'
        });
      }

      const user = await userService.setUserActiveStatus(id, is_active);

      res.json({
        success: true,
        data: user,
        message: `User ${is_active ? 'activated' : 'deactivated'} successfully`
      });
    } catch (error) {
      console.error('Error updating user status:', error);
      
      if (error instanceof Error) {
        if (error.message === 'User not found') {
          return res.status(404).json({
            success: false,
            error: 'Not found',
            message: error.message
          });
        }
      }

      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: 'Failed to update user status'
      });
    }
  }
);