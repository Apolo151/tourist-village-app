import { Router, Request, Response } from 'express';
import { PaymentMethodService } from '../services/paymentMethodService';
import { authenticateToken, requireRole } from '../middleware/auth';
import { ValidationMiddleware } from '../middleware/validation';
import { PaymentMethodFilters } from '../types';

const router = Router();
const paymentMethodService = new PaymentMethodService();

/**
 * GET /api/payment-methods
 * Get all payment methods with filtering and pagination
 */
router.get(
  '/',
  authenticateToken,
  requireRole('admin', 'super_admin'),
  async (req: Request, res: Response) => {
    try {
      const filters: PaymentMethodFilters = req.query as any;

      const result = await paymentMethodService.getPaymentMethods(filters);

      res.json({
        success: true,
        data: result.data,
        pagination: result.pagination
      });
    } catch (error: any) {
      console.error('Error fetching payment methods:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: 'Failed to fetch payment methods'
      });
    }
  }
);

/**
 * GET /api/payment-methods/stats
 * Get payment method statistics
 */
router.get(
  '/stats',
  authenticateToken,
  requireRole('admin', 'super_admin'),
  async (req: Request, res: Response) => {
    try {
      const stats = await paymentMethodService.getPaymentMethodStats();

      res.json({
        success: true,
        data: stats
      });
    } catch (error: any) {
      console.error('Error fetching payment method statistics:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: 'Failed to fetch payment method statistics'
      });
    }
  }
);

/**
 * GET /api/payment-methods/:id
 * Get payment method by ID
 */
router.get(
  '/:id',
  authenticateToken,
  requireRole('admin', 'super_admin'),
  async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);

      if (isNaN(id) || id <= 0) {
        return res.status(400).json({
          success: false,
          error: 'Invalid ID',
          message: 'Payment method ID must be a positive number'
        });
      }

      const paymentMethod = await paymentMethodService.getPaymentMethodById(id);

      if (!paymentMethod) {
        return res.status(404).json({
          success: false,
          error: 'Not found',
          message: 'Payment method not found'
        });
      }

      res.json({
        success: true,
        data: paymentMethod
      });
    } catch (error: any) {
      console.error('Error fetching payment method:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: 'Failed to fetch payment method'
      });
    }
  }
);

/**
 * POST /api/payment-methods
 * Create new payment method
 */
router.post(
  '/',
  authenticateToken,
  requireRole('admin', 'super_admin'),
  ValidationMiddleware.validateCreatePaymentMethod,
  async (req: Request, res: Response) => {
    try {
      const user = (req as any).user;
      const paymentMethodData = req.body;

      const paymentMethod = await paymentMethodService.createPaymentMethod(paymentMethodData, user.id);

      res.status(201).json({
        success: true,
        data: paymentMethod,
        message: 'Payment method created successfully'
      });
    } catch (error: any) {
      console.error('Error creating payment method:', error);
      
      if (error.message.includes('already exists') ||
          error.message.includes('Invalid') ||
          error.message.includes('must be') ||
          error.message.includes('must not exceed')) {
        return res.status(400).json({
          success: false,
          error: 'Validation error',
          message: error.message
        });
      }

      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: 'Failed to create payment method'
      });
    }
  }
);

/**
 * PUT /api/payment-methods/:id
 * Update payment method
 */
router.put(
  '/:id',
  authenticateToken,
  requireRole('admin', 'super_admin'),
  ValidationMiddleware.validateUpdatePaymentMethod,
  async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const updateData = req.body;

      if (isNaN(id) || id <= 0) {
        return res.status(400).json({
          success: false,
          error: 'Invalid ID',
          message: 'Payment method ID must be a positive number'
        });
      }

      const updatedPaymentMethod = await paymentMethodService.updatePaymentMethod(id, updateData);

      res.json({
        success: true,
        data: updatedPaymentMethod,
        message: 'Payment method updated successfully'
      });
    } catch (error: any) {
      console.error('Error updating payment method:', error);
      
      if (error.message.includes('not found')) {
        return res.status(404).json({
          success: false,
          error: 'Not found',
          message: error.message
        });
      }

      if (error.message.includes('already exists') ||
          error.message.includes('Invalid') ||
          error.message.includes('must be') ||
          error.message.includes('must not exceed')) {
        return res.status(400).json({
          success: false,
          error: 'Validation error',
          message: error.message
        });
      }

      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: 'Failed to update payment method'
      });
    }
  }
);

/**
 * DELETE /api/payment-methods/:id
 * Delete payment method
 */
router.delete(
  '/:id',
  authenticateToken,
  requireRole('admin', 'super_admin'),
  async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);

      if (isNaN(id) || id <= 0) {
        return res.status(400).json({
          success: false,
          error: 'Invalid ID',
          message: 'Payment method ID must be a positive number'
        });
      }

      await paymentMethodService.deletePaymentMethod(id);

      res.json({
        success: true,
        message: 'Payment method deleted successfully'
      });
    } catch (error: any) {
      console.error('Error deleting payment method:', error);
      
      if (error.message.includes('not found')) {
        return res.status(404).json({
          success: false,
          error: 'Not found',
          message: error.message
        });
      }

      if (error.message.includes('being used')) {
        return res.status(409).json({
          success: false,
          error: 'Conflict',
          message: error.message
        });
      }

      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: 'Failed to delete payment method'
      });
    }
  }
);

export default router; 