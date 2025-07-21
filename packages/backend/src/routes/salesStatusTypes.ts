import { Router, Request, Response } from 'express';
import { salesStatusTypeService } from '../services/salesStatusTypeService';
import { authenticateToken, requireAdmin } from '../middleware/auth';
import { SalesStatusTypeFilters } from '../types';

export const salesStatusTypesRouter = Router();

/**
 * GET /api/sales-status-types
 * Get all sales status types with filtering and pagination
 */
salesStatusTypesRouter.get(
  '/',
  authenticateToken,
  async (req: Request, res: Response) => {
    try {
      const filters: SalesStatusTypeFilters = {
        search: req.query.search as string,
        is_active: req.query.is_active === 'true' ? true : req.query.is_active === 'false' ? false : undefined,
        page: req.query.page ? parseInt(req.query.page as string) : undefined,
        limit: req.query.limit ? parseInt(req.query.limit as string) : undefined,
        sort_by: req.query.sort_by as string,
        sort_order: req.query.sort_order as 'asc' | 'desc'
      };

      const result = await salesStatusTypeService.getSalesStatusTypes(filters);

      res.json({
        success: true,
        data: result.data,
        pagination: result.pagination,
        message: `Found ${result.data.length} sales status types`
      });
    } catch (error) {
      console.error('Error fetching sales status types:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: 'Failed to fetch sales status types'
      });
    }
  }
);

/**
 * GET /api/sales-status-types/:id
 * Get a specific sales status type by ID
 */
salesStatusTypesRouter.get(
  '/:id',
  authenticateToken,
  async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);

      if (!id || id <= 0) {
        return res.status(400).json({
          success: false,
          error: 'Invalid request',
          message: 'Valid sales status type ID is required'
        });
      }

      const salesStatusType = await salesStatusTypeService.getSalesStatusTypeById(id);

      if (!salesStatusType) {
        return res.status(404).json({
          success: false,
          error: 'Not found',
          message: 'Sales status type not found'
        });
      }

      res.json({
        success: true,
        data: salesStatusType,
        message: 'Sales status type retrieved successfully'
      });
    } catch (error) {
      console.error('Error fetching sales status type:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: 'Failed to fetch sales status type'
      });
    }
  }
);

/**
 * POST /api/sales-status-types
 * Create a new sales status type
 */
salesStatusTypesRouter.post(
  '/',
  authenticateToken,
  requireAdmin,
  async (req: Request, res: Response) => {
    try {
      const createdBy = req.user?.id;
      if (!createdBy) {
        return res.status(401).json({
          success: false,
          error: 'Unauthorized',
          message: 'User not authenticated'
        });
      }

      const salesStatusType = await salesStatusTypeService.createSalesStatusType(req.body, createdBy);

      res.status(201).json({
        success: true,
        data: salesStatusType,
        message: 'Sales status type created successfully'
      });
    } catch (error) {
      console.error('Error creating sales status type:', error);
      
      if (error instanceof Error) {
        if (error.message.includes('already exists') || 
            error.message.includes('required')) {
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
        message: 'Failed to create sales status type'
      });
    }
  }
);

/**
 * PUT /api/sales-status-types/:id
 * Update a sales status type
 */
salesStatusTypesRouter.put(
  '/:id',
  authenticateToken,
  requireAdmin,
  async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);

      if (!id || id <= 0) {
        return res.status(400).json({
          success: false,
          error: 'Invalid request',
          message: 'Valid sales status type ID is required'
        });
      }

      const salesStatusType = await salesStatusTypeService.updateSalesStatusType(id, req.body);

      res.json({
        success: true,
        data: salesStatusType,
        message: 'Sales status type updated successfully'
      });
    } catch (error) {
      console.error('Error updating sales status type:', error);
      
      if (error instanceof Error) {
        if (error.message.includes('not found')) {
          return res.status(404).json({
            success: false,
            error: 'Not found',
            message: error.message
          });
        }
        if (error.message.includes('already exists')) {
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
        message: 'Failed to update sales status type'
      });
    }
  }
);

/**
 * DELETE /api/sales-status-types/:id
 * Delete a sales status type
 */
salesStatusTypesRouter.delete(
  '/:id',
  authenticateToken,
  requireAdmin,
  async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);

      if (!id || id <= 0) {
        return res.status(400).json({
          success: false,
          error: 'Invalid request',
          message: 'Valid sales status type ID is required'
        });
      }

      await salesStatusTypeService.deleteSalesStatusType(id);

      res.json({
        success: true,
        message: 'Sales status type deleted successfully'
      });
    } catch (error) {
      console.error('Error deleting sales status type:', error);
      
      if (error instanceof Error) {
        if (error.message.includes('not found')) {
          return res.status(404).json({
            success: false,
            error: 'Not found',
            message: error.message
          });
        }
        if (error.message.includes('being used')) {
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
        message: 'Failed to delete sales status type'
      });
    }
  }
); 