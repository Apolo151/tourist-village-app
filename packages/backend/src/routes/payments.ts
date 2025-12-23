import { Router, Request, Response } from 'express';
import { PaymentService } from '../services/paymentService';
import { authenticateToken, requireRole, filterByResponsibleVillage } from '../middleware/auth';
import { ValidationMiddleware } from '../middleware/validation';
import { PaymentFilters } from '../types';
import { createLogger } from '../utils/logger';

const router = Router();
const paymentService = new PaymentService();
const logger = createLogger('PaymentsRouter');

/**
 * GET /api/payments
 * Get all payments with filtering and pagination
 */
router.get(
  '/',
  authenticateToken,
  filterByResponsibleVillage(),
  async (req: Request, res: Response) => {
    try {
      const user = (req as any).user;
      const filters: PaymentFilters = req.query as any;

      // Role-based filtering
      if (user.role === 'owner') {
        // Owners can only see payments for their apartments
        const apartmentsResult = await require('../services/apartmentService').ApartmentService.prototype.getApartments({ owner_id: user.id });
        const apartmentIds = apartmentsResult.data.map((apt: any) => apt.id);
        
        if (apartmentIds.length === 0) {
          return res.json({
            success: true,
            data: [],
            pagination: { page: 1, limit: 10, total: 0, total_pages: 0 }
          });
        }

        // Filter by owner's apartments
        if (filters.apartment_id && !apartmentIds.includes(Number(filters.apartment_id))) {
          return res.status(403).json({
            success: false,
            error: 'Access denied',
            message: 'You can only access payments for your own apartments'
          });
        }

        // If no specific apartment filter, add constraint
        if (!filters.apartment_id && apartmentIds.length > 0) {
          filters.created_by = user.id; // Alternative approach for filtering
        }
      } else if (user.role === 'renter') {
        // Renters can only see payments they created
        filters.created_by = user.id;
      }
      // Admins and super_admins can see all payments (no additional filtering)

      const result = await paymentService.getPayments(filters, req.villageFilter);

      res.json({
        success: true,
        data: result.data,
        pagination: result.pagination
      });
    } catch (error: any) {
      console.error('Error fetching payments:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: 'Failed to fetch payments'
      });
    }
  }
);

/**
 * GET /api/payments/export
 * Export payments (all filtered, no pagination)
 */
router.get(
  '/export',
  authenticateToken,
  requireRole('admin', 'super_admin'),
  filterByResponsibleVillage(),
  async (req: Request, res: Response) => {
    try {
      const filters: PaymentFilters = req.query as any;
      const villageFilter = req.villageFilter;
      const format = (req.query.format as string) || 'csv';

      if (format === 'json') {
        const data = await paymentService.exportPayments(filters, villageFilter);
        return res.json({
          success: true,
          data,
          message: `Exported ${data.length} payments`
        });
      }

      const rows = await paymentService.exportPayments(filters, villageFilter);

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="payments.csv"');

      res.write('ID,Date,Description,Amount,Currency,Method,User Type,Apartment,Village,Booking,Created By\n');

      const escape = (value: any) => {
        if (value === null || value === undefined) return '';
        const str = String(value);
        return /[",\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
      };

      rows.forEach((row: any) => {
        const line = [
          escape(row.id),
          escape(row.date),
          escape(row.description),
          escape(row.amount),
          escape(row.currency),
          escape(row.method),
          escape(row.user_type),
          escape(row.apartment),
          escape(row.village),
          escape(row.booking),
          escape(row.created_by)
        ].join(',') + '\n';
        res.write(line);
      });

      res.end();
    } catch (error: any) {
      logger.error('Error exporting payments', { error });

      if (error.code === 'EXPORT_LIMIT_EXCEEDED') {
        return res.status(413).json({
          success: false,
          error: 'Export limit exceeded',
          message: error.message
        });
      }

      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: 'Failed to export payments'
      });
    }
  }
);

/**
 * GET /api/payments/stats
 * Get payment statistics
 */
router.get(
  '/stats',
  authenticateToken,
  requireRole('admin', 'super_admin'),
  async (req: Request, res: Response) => {
    try {
      const stats = await paymentService.getPaymentStats();

      res.json({
        success: true,
        data: stats
      });
    } catch (error: any) {
      console.error('Error fetching payment statistics:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: 'Failed to fetch payment statistics'
      });
    }
  }
);

/**
 * GET /api/payments/:id
 * Get payment by ID
 */
router.get(
  '/:id',
  authenticateToken,
  async (req: Request, res: Response) => {
    try {
      const user = (req as any).user;
      const id = parseInt(req.params.id);

      if (isNaN(id) || id <= 0) {
        return res.status(400).json({
          success: false,
          error: 'Invalid ID',
          message: 'Payment ID must be a positive number'
        });
      }

      const payment = await paymentService.getPaymentById(id);

      if (!payment) {
        return res.status(404).json({
          success: false,
          error: 'Not found',
          message: 'Payment not found'
        });
      }

      // Check permissions
      if (user.role === 'owner') {
        // Check if user owns the apartment
        if (payment.apartment?.owner_id !== user.id) {
          return res.status(403).json({
            success: false,
            error: 'Access denied',
            message: 'You can only access payments for your own apartments'
          });
        }
      } else if (user.role === 'renter') {
        // Check if user created the payment
        if (payment.created_by !== user.id) {
          return res.status(403).json({
            success: false,
            error: 'Access denied',
            message: 'You can only access payments you created'
          });
        }
      }
      // Admins and super_admins can access all payments

      res.json({
        success: true,
        data: payment
      });
    } catch (error: any) {
      console.error('Error fetching payment:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: 'Failed to fetch payment'
      });
    }
  }
);

/**
 * POST /api/payments
 * Create new payment
 */
router.post(
  '/',
  authenticateToken,
  ValidationMiddleware.validateCreatePayment,
  async (req: Request, res: Response) => {
    try {
      const user = (req as any).user;
      const paymentData = req.body;

      // For non-admins, check apartment access
      if (user.role === 'owner') {
        // Check if user owns the apartment
        const apartment = await require('../services/apartmentService').ApartmentService.prototype.getApartmentById(paymentData.apartment_id);
        if (!apartment || apartment.owner_id !== user.id) {
          return res.status(403).json({
            success: false,
            error: 'Access denied',
            message: 'You can only create payments for your own apartments'
          });
        }
      } else if (user.role === 'renter') {
        // Renters can create payments but need to have proper access to the apartment
        // This could be through active bookings or other business rules
        const booking = await require('../services/bookingService').BookingService.prototype.getBookings({
          apartment_id: paymentData.apartment_id,
          user_id: user.id,
          status: 'confirmed'
        });
        
        if (!booking.data || booking.data.length === 0) {
          return res.status(403).json({
            success: false,
            error: 'Access denied',
            message: 'You can only create payments for apartments you have bookings for'
          });
        }
      }

      const payment = await paymentService.createPayment(paymentData, user.id);

      res.status(201).json({
        success: true,
        data: payment,
        message: 'Payment created successfully'
      });
    } catch (error: any) {
      console.error('Error creating payment:', error);
      
      if (error.message.includes('not found') ||
          error.message.includes('Invalid') ||
          error.message.includes('must be') ||
          error.message.includes('must not exceed') ||
          error.message.includes('too large')) {
        return res.status(400).json({
          success: false,
          error: 'Validation error',
          message: error.message
        });
      }

      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: 'Failed to create payment'
      });
    }
  }
);

/**
 * PUT /api/payments/:id
 * Update payment
 */
router.put(
  '/:id',
  authenticateToken,
  ValidationMiddleware.validateUpdatePayment,
  async (req: Request, res: Response) => {
    try {
      const user = (req as any).user;
      const id = parseInt(req.params.id);
      const updateData = req.body;

      if (isNaN(id) || id <= 0) {
        return res.status(400).json({
          success: false,
          error: 'Invalid ID',
          message: 'Payment ID must be a positive number'
        });
      }

      // Check if payment exists and get current data
      const existingPayment = await paymentService.getPaymentById(id);
      if (!existingPayment) {
        return res.status(404).json({
          success: false,
          error: 'Not found',
          message: 'Payment not found'
        });
      }

      // Check permissions
      if (user.role === 'owner') {
        // Check if user owns the apartment
        if (existingPayment.apartment?.owner_id !== user.id) {
          return res.status(403).json({
            success: false,
            error: 'Access denied',
            message: 'You can only update payments for your own apartments'
          });
        }
      } else if (user.role === 'renter') {
        // Check if user created the payment
        if (existingPayment.created_by !== user.id) {
          return res.status(403).json({
            success: false,
            error: 'Access denied',
            message: 'You can only update payments you created'
          });
        }
      }
      // Admins and super_admins can update all payments

      // For apartment_id changes, check ownership of the new apartment too
      if (updateData.apartment_id && updateData.apartment_id !== existingPayment.apartment_id) {
        if (user.role === 'owner') {
          const newApartment = await require('../services/apartmentService').ApartmentService.prototype.getApartmentById(updateData.apartment_id);
          if (!newApartment || newApartment.owner_id !== user.id) {
            return res.status(403).json({
              success: false,
              error: 'Access denied',
              message: 'You can only assign payments to your own apartments'
            });
          }
        }
      }

      const updatedPayment = await paymentService.updatePayment(id, updateData);

      res.json({
        success: true,
        data: updatedPayment,
        message: 'Payment updated successfully'
      });
    } catch (error: any) {
      console.error('Error updating payment:', error);
      
      if (error.message.includes('not found') ||
          error.message.includes('Invalid') ||
          error.message.includes('must be') ||
          error.message.includes('must not exceed') ||
          error.message.includes('too large')) {
        return res.status(400).json({
          success: false,
          error: 'Validation error',
          message: error.message
        });
      }

      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: 'Failed to update payment'
      });
    }
  }
);

/**
 * DELETE /api/payments/:id
 * Delete payment
 */
router.delete(
  '/:id',
  authenticateToken,
  async (req: Request, res: Response) => {
    try {
      const user = (req as any).user;
      const id = parseInt(req.params.id);

      if (isNaN(id) || id <= 0) {
        return res.status(400).json({
          success: false,
          error: 'Invalid ID',
          message: 'Payment ID must be a positive number'
        });
      }

      // Check if payment exists
      const existingPayment = await paymentService.getPaymentById(id);
      if (!existingPayment) {
        return res.status(404).json({
          success: false,
          error: 'Not found',
          message: 'Payment not found'
        });
      }

      // Check permissions
      if (user.role === 'owner') {
        // Check if user owns the apartment
        if (existingPayment.apartment?.owner_id !== user.id) {
          return res.status(403).json({
            success: false,
            error: 'Access denied',
            message: 'You can only delete payments for your own apartments'
          });
        }
      } else if (user.role === 'renter') {
        // Check if user created the payment
        if (existingPayment.created_by !== user.id) {
          return res.status(403).json({
            success: false,
            error: 'Access denied',
            message: 'You can only delete payments you created'
          });
        }
      }
      // Admins and super_admins can delete all payments

      await paymentService.deletePayment(id);

      res.json({
        success: true,
        message: 'Payment deleted successfully'
      });
    } catch (error: any) {
      console.error('Error deleting payment:', error);
      
      if (error.message.includes('not found')) {
        return res.status(404).json({
          success: false,
          error: 'Not found',
          message: error.message
        });
      }

      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: 'Failed to delete payment'
      });
    }
  }
);

export default router; 