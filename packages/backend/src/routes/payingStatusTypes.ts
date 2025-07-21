import { Router, Request, Response } from 'express';
import { payingStatusTypeService } from '../services/payingStatusTypeService';
import { authenticateToken, requireAdmin } from '../middleware/auth';
import { PayingStatusTypeFilters } from '../types';

export const payingStatusTypesRouter = Router();

/**
 * GET /api/paying-status-types
 * Get all paying status types with filtering and pagination
 */
payingStatusTypesRouter.get(
  '/',
  authenticateToken,
  async (req: Request, res: Response) => {
    try {
      const filters: PayingStatusTypeFilters = {
        search: req.query.search as string,
        is_active: req.query.is_active === 'true' ? true : req.query.is_active === 'false' ? false : undefined,
        page: req.query.page ? parseInt(req.query.page as string) : undefined,
        limit: req.query.limit ? parseInt(req.query.limit as string) : undefined,
        sort_by: req.query.sort_by as string,
        sort_order: req.query.sort_order as 'asc' | 'desc'
      };

      const result = await payingStatusTypeService.getPayingStatusTypes(filters);

      res.json({
        success: true,
        data: result.data,
        pagination: result.pagination,
        message: `Found ${result.data.length} paying status types`
      });
    } catch (error) {
      console.error('Error fetching paying status types:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: 'Failed to fetch paying status types'
      });
    }
  }
);

/**
 * GET /api/paying-status-types/:id
 * Get a specific paying status type by ID
 */
payingStatusTypesRouter.get(
  '/:id',
  authenticateToken,
  async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);

      if (!id || id <= 0) {
        return res.status(400).json({
          success: false,
          error: 'Invalid request',
          message: 'Valid paying status type ID is required'
        });
      }

      const payingStatusType = await payingStatusTypeService.getPayingStatusTypeById(id);

      if (!payingStatusType) {
        return res.status(404).json({
          success: false,
          error: 'Not found',
          message: 'Paying status type not found'
        });
      }

      res.json({
        success: true,
        data: payingStatusType,
        message: 'Paying status type retrieved successfully'
      });
    } catch (error) {
      console.error('Error fetching paying status type:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: 'Failed to fetch paying status type'
      });
    }
  }
);

/**
 * POST /api/paying-status-types
 * Create a new paying status type
 */
payingStatusTypesRouter.post(
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

      const payingStatusType = await payingStatusTypeService.createPayingStatusType(req.body, createdBy);

      res.status(201).json({
        success: true,
        data: payingStatusType,
        message: 'Paying status type created successfully'
      });
    } catch (error) {
      console.error('Error creating paying status type:', error);
      
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
        message: 'Failed to create paying status type'
      });
    }
  }
);

/**
 * PUT /api/paying-status-types/:id
 * Update a paying status type
 */
payingStatusTypesRouter.put(
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
          message: 'Valid paying status type ID is required'
        });
      }

      const payingStatusType = await payingStatusTypeService.updatePayingStatusType(id, req.body);

      res.json({
        success: true,
        data: payingStatusType,
        message: 'Paying status type updated successfully'
      });
    } catch (error) {
      console.error('Error updating paying status type:', error);
      
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
        message: 'Failed to update paying status type'
      });
    }
  }
);

/**
 * DELETE /api/paying-status-types/:id
 * Delete a paying status type
 */
payingStatusTypesRouter.delete(
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
          message: 'Valid paying status type ID is required'
        });
      }

      await payingStatusTypeService.deletePayingStatusType(id);

      res.json({
        success: true,
        message: 'Paying status type deleted successfully'
      });
    } catch (error) {
      console.error('Error deleting paying status type:', error);
      
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
        message: 'Failed to delete paying status type'
      });
    }
  }
); 