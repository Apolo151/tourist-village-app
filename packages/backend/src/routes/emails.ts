import { Router, Request, Response } from 'express';
import { EmailService } from '../services/emailService';
import { authenticateToken, requireRole } from '../middleware/auth';
import { ValidationMiddleware } from '../middleware/validation';
import { EmailFilters } from '../types';

const router = Router();
const emailService = new EmailService();

/**
 * GET /api/emails
 * Get all emails with filtering and pagination
 */
router.get(
  '/',
  authenticateToken,
  async (req: Request, res: Response) => {
    try {
      const user = (req as any).user;
      const filters: EmailFilters = req.query as any;

      // Role-based filtering
      if (user.role === 'owner') {
        // Owners can only see emails for their apartments
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
            message: 'You can only access emails for your own apartments'
          });
        }

        // If no specific apartment filter, add constraint
        if (!filters.apartment_id && apartmentIds.length > 0) {
          filters.created_by = user.id; // Alternative approach for filtering
        }
      } else if (user.role === 'renter') {
        // Renters can only see emails they created
        filters.created_by = user.id;
      }
      // Admins and super_admins can see all emails (no additional filtering)

      const result = await emailService.getEmails(filters);

      res.json({
        success: true,
        data: result.data,
        pagination: result.pagination
      });
    } catch (error: any) {
      console.error('Error fetching emails:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: 'Failed to fetch emails'
      });
    }
  }
);

/**
 * GET /api/emails/stats
 * Get email statistics
 */
router.get(
  '/stats',
  authenticateToken,
  requireRole('admin', 'super_admin'),
  async (req: Request, res: Response) => {
    try {
      const stats = await emailService.getEmailStats();

      res.json({
        success: true,
        data: stats
      });
    } catch (error: any) {
      console.error('Error fetching email statistics:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: 'Failed to fetch email statistics'
      });
    }
  }
);

/**
 * GET /api/emails/:id
 * Get email by ID
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
          message: 'Email ID must be a positive number'
        });
      }

      const email = await emailService.getEmailById(id);

      if (!email) {
        return res.status(404).json({
          success: false,
          error: 'Not found',
          message: 'Email not found'
        });
      }

      // Check permissions
      if (user.role === 'owner') {
        // Check if user owns the apartment
        if (email.apartment?.owner_id !== user.id) {
          return res.status(403).json({
            success: false,
            error: 'Access denied',
            message: 'You can only access emails for your own apartments'
          });
        }
      } else if (user.role === 'renter') {
        // Check if user created the email
        if (email.created_by !== user.id) {
          return res.status(403).json({
            success: false,
            error: 'Access denied',
            message: 'You can only access emails you created'
          });
        }
      }
      // Admins and super_admins can access all emails

      res.json({
        success: true,
        data: email
      });
    } catch (error: any) {
      console.error('Error fetching email:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: 'Failed to fetch email'
      });
    }
  }
);

/**
 * POST /api/emails
 * Create new email
 */
router.post(
  '/',
  authenticateToken,
  ValidationMiddleware.validateCreateEmail,
  async (req: Request, res: Response) => {
    try {
      const user = (req as any).user;
      const emailData = req.body;

      // For non-admins, check apartment access
      if (user.role === 'owner') {
        // Check if user owns the apartment
        const apartment = await require('../services/apartmentService').ApartmentService.prototype.getApartmentById(emailData.apartment_id);
        if (!apartment || apartment.owner_id !== user.id) {
          return res.status(403).json({
            success: false,
            error: 'Access denied',
            message: 'You can only create emails for your own apartments'
          });
        }
      } else if (user.role === 'renter') {
        // Renters can create emails but need to have proper access to the apartment
        // This could be through active bookings or other business rules
        const booking = await require('../services/bookingService').BookingService.prototype.getBookings({
          apartment_id: emailData.apartment_id,
          user_id: user.id,
          status: 'confirmed'
        });
        
        if (!booking.data || booking.data.length === 0) {
          return res.status(403).json({
            success: false,
            error: 'Access denied',
            message: 'You can only create emails for apartments you have bookings for'
          });
        }
      }

      const email = await emailService.createEmail(emailData, user.id);

      res.status(201).json({
        success: true,
        data: email,
        message: 'Email created successfully'
      });
    } catch (error: any) {
      console.error('Error creating email:', error);
      
      if (error.message.includes('not found') ||
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
        message: 'Failed to create email'
      });
    }
  }
);

/**
 * PUT /api/emails/:id
 * Update email
 */
router.put(
  '/:id',
  authenticateToken,
  ValidationMiddleware.validateUpdateEmail,
  async (req: Request, res: Response) => {
    try {
      const user = (req as any).user;
      const id = parseInt(req.params.id);
      const updateData = req.body;

      if (isNaN(id) || id <= 0) {
        return res.status(400).json({
          success: false,
          error: 'Invalid ID',
          message: 'Email ID must be a positive number'
        });
      }

      // Check if email exists and get current data
      const existingEmail = await emailService.getEmailById(id);
      if (!existingEmail) {
        return res.status(404).json({
          success: false,
          error: 'Not found',
          message: 'Email not found'
        });
      }

      // Check permissions
      if (user.role === 'owner') {
        // Check if user owns the apartment
        if (existingEmail.apartment?.owner_id !== user.id) {
          return res.status(403).json({
            success: false,
            error: 'Access denied',
            message: 'You can only update emails for your own apartments'
          });
        }
      } else if (user.role === 'renter') {
        // Check if user created the email
        if (existingEmail.created_by !== user.id) {
          return res.status(403).json({
            success: false,
            error: 'Access denied',
            message: 'You can only update emails you created'
          });
        }
      }
      // Admins and super_admins can update all emails

      // For apartment_id changes, check ownership of the new apartment too
      if (updateData.apartment_id && updateData.apartment_id !== existingEmail.apartment_id) {
        if (user.role === 'owner') {
          const newApartment = await require('../services/apartmentService').ApartmentService.prototype.getApartmentById(updateData.apartment_id);
          if (!newApartment || newApartment.owner_id !== user.id) {
            return res.status(403).json({
              success: false,
              error: 'Access denied',
              message: 'You can only assign emails to your own apartments'
            });
          }
        }
      }

      const updatedEmail = await emailService.updateEmail(id, updateData);

      res.json({
        success: true,
        data: updatedEmail,
        message: 'Email updated successfully'
      });
    } catch (error: any) {
      console.error('Error updating email:', error);
      
      if (error.message.includes('not found') ||
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
        message: 'Failed to update email'
      });
    }
  }
);

/**
 * DELETE /api/emails/:id
 * Delete email
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
          message: 'Email ID must be a positive number'
        });
      }

      // Check if email exists
      const existingEmail = await emailService.getEmailById(id);
      if (!existingEmail) {
        return res.status(404).json({
          success: false,
          error: 'Not found',
          message: 'Email not found'
        });
      }

      // Check permissions
      if (user.role === 'owner') {
        // Check if user owns the apartment
        if (existingEmail.apartment?.owner_id !== user.id) {
          return res.status(403).json({
            success: false,
            error: 'Access denied',
            message: 'You can only delete emails for your own apartments'
          });
        }
      } else if (user.role === 'renter') {
        // Check if user created the email
        if (existingEmail.created_by !== user.id) {
          return res.status(403).json({
            success: false,
            error: 'Access denied',
            message: 'You can only delete emails you created'
          });
        }
      }
      // Admins and super_admins can delete all emails

      await emailService.deleteEmail(id);

      res.json({
        success: true,
        message: 'Email deleted successfully'
      });
    } catch (error: any) {
      console.error('Error deleting email:', error);
      
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
        message: 'Failed to delete email'
      });
    }
  }
);

export default router; 