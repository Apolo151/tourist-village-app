import { Router, Request, Response } from 'express';
import { VillageService } from '../services/villageService';
import { ValidationMiddleware } from '../middleware/validation';
import { authenticateToken, requireAdmin, requireRole } from '../middleware/auth';
import { VillageFilters } from '../types';

export const villagesRouter = Router();
const villageService = new VillageService();

/**
 * GET /api/villages/with-stats
 * Get all villages with apartment counts
 */
villagesRouter.get(
  '/with-stats',
  authenticateToken,
  requireAdmin,
  async (req: Request, res: Response) => {
    try {
      const villages = await villageService.getVillagesWithStats();

      res.json({
        success: true,
        data: villages,
        message: `Found ${villages.length} villages with statistics`
      });
    } catch (error) {
      console.error('Error fetching villages with stats:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: 'Failed to fetch villages with statistics'
      });
    }
  }
);

/**
 * GET /api/villages
 * List all villages with filtering, sorting, and pagination
 */
villagesRouter.get(
  '/',
  authenticateToken,
  requireRole('admin', 'super_admin', 'owner', 'renter'),
  ValidationMiddleware.validateQueryParams,
  async (req: Request, res: Response) => {
    try {
      const filters: VillageFilters = {
        search: req.query.search as string,
        page: req.query.page ? parseInt(req.query.page as string) : 1,
        limit: req.query.limit ? parseInt(req.query.limit as string) : 10,
        sort_by: req.query.sort_by as string || 'name',
        sort_order: (req.query.sort_order as 'asc' | 'desc') || 'asc'
      };

      const result = await villageService.getVillages(filters);

      res.json({
        success: true,
        data: result.data,
        pagination: result.pagination,
        message: `Found ${result.pagination.total} villages`
      });
    } catch (error) {
      console.error('Error fetching villages:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: 'Failed to fetch villages'
      });
    }
  }
);

/**
 * GET /api/villages/:id
 * Get village details by ID
 */
villagesRouter.get(
  '/:id',
  authenticateToken,
  requireAdmin,
  ValidationMiddleware.validateIdParam,
  async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const village = await villageService.getVillageById(id);

      if (!village) {
        return res.status(404).json({
          success: false,
          error: 'Not found',
          message: 'Village not found'
        });
      }

      res.json({
        success: true,
        data: village,
        message: 'Village retrieved successfully'
      });
    } catch (error) {
      console.error('Error fetching village:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: 'Failed to fetch village'
      });
    }
  }
);

/**
 * POST /api/villages
 * Create a new village
 */
villagesRouter.post(
  '/',
  authenticateToken,
  requireAdmin,
  ValidationMiddleware.validateCreateVillage,
  async (req: Request, res: Response) => {
    try {
      const createdBy = req.user?.id;
      const village = await villageService.createVillage(req.body, createdBy);

      res.status(201).json({
        success: true,
        data: village,
        message: 'Village created successfully'
      });
    } catch (error) {
      console.error('Error creating village:', error);
      
      if (error instanceof Error) {
        // Handle specific business logic errors
        if (error.message.includes('already exists') || 
            error.message.includes('must be') ||
            error.message.includes('price')) {
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
        message: 'Failed to create village'
      });
    }
  }
);

/**
 * PUT /api/villages/:id
 * Update village by ID
 */
villagesRouter.put(
  '/:id',
  authenticateToken,
  requireAdmin,
  ValidationMiddleware.validateIdParam,
  ValidationMiddleware.validateUpdateVillage,
  async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const village = await villageService.updateVillage(id, req.body);

      res.json({
        success: true,
        data: village,
        message: 'Village updated successfully'
      });
    } catch (error) {
      console.error('Error updating village:', error);
      
      if (error instanceof Error) {
        if (error.message === 'Village not found') {
          return res.status(404).json({
            success: false,
            error: 'Not found',
            message: error.message
          });
        }
        
        if (error.message.includes('already exists') || 
            error.message.includes('must be') ||
            error.message.includes('Cannot reduce phases') ||
            error.message.includes('price')) {
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
        message: 'Failed to update village'
      });
    }
  }
);

/**
 * DELETE /api/villages/:id
 * Delete village by ID
 */
villagesRouter.delete(
  '/:id',
  authenticateToken,
  requireAdmin,
  ValidationMiddleware.validateIdParam,
  async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      await villageService.deleteVillage(id);

      res.json({
        success: true,
        message: 'Village deleted successfully'
      });
    } catch (error) {
      console.error('Error deleting village:', error);
      
      if (error instanceof Error) {
        if (error.message === 'Village not found') {
          return res.status(404).json({
            success: false,
            error: 'Not found',
            message: error.message
          });
        }
        
        if (error.message.includes('Cannot delete village')) {
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
        message: 'Failed to delete village'
      });
    }
  }
);

/**
 * GET /api/villages/:id/stats
 * Get village statistics
 */
villagesRouter.get(
  '/:id/stats',
  authenticateToken,
  requireAdmin,
  ValidationMiddleware.validateIdParam,
  async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const stats = await villageService.getVillageStats(id);

      res.json({
        success: true,
        data: stats,
        message: 'Village statistics retrieved successfully'
      });
    } catch (error) {
      console.error('Error fetching village statistics:', error);
      
      if (error instanceof Error) {
        if (error.message === 'Village not found') {
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
        message: 'Failed to fetch village statistics'
      });
    }
  }
); 