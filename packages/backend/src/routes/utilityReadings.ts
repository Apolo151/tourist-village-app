import { Router, Request, Response } from 'express';
import { UtilityReadingService } from '../services/utilityReadingService';
import { authenticateToken, requireRole, filterByResponsibleVillage } from '../middleware/auth';
import { ValidationMiddleware } from '../middleware/validation';
import { UtilityReadingFilters, CreateUtilityReadingRequest, UpdateUtilityReadingRequest } from '../types';

const router = Router();
const utilityReadingService = new UtilityReadingService();

/**
 * GET /api/utility-readings
 * Get all utility readings with filtering and pagination
 */
router.get(
  '/',
  authenticateToken,
  async (req: Request, res: Response) => {
    try {
      const user = (req as any).user;
      const filters: UtilityReadingFilters = req.query as any;

      // Role-based filtering
      if (user.role === 'owner') {
        // Owners can only see readings for their apartments
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
            message: 'You can only access utility readings for your own apartments'
          });
        }

        // If no specific apartment filter, add all owner's apartments
        if (!filters.apartment_id && apartmentIds.length > 0) {
          // For multiple apartments, we need to modify the service to handle apartment_ids array
          // For now, we'll get the first apartment or let the service handle the filtering
          filters.created_by = user.id; // Alternative approach
        }
      } else if (user.role === 'renter') {
        // Renters can only see readings they created
        filters.created_by = user.id;
      }
      // Admins and super_admins can see all readings (no additional filtering)

      const result = await utilityReadingService.getUtilityReadings(filters);

      res.json({
        success: true,
        data: result.data,
        pagination: result.pagination
      });
    } catch (error: any) {
      console.error('Error fetching utility readings:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: 'Failed to fetch utility readings'
      });
    }
  }
);

/**
 * GET /api/utility-readings/stats
 * Get utility reading statistics
 */
router.get(
  '/stats',
  authenticateToken,
  requireRole('admin', 'super_admin'),
  async (req: Request, res: Response) => {
    try {
      const stats = await utilityReadingService.getUtilityReadingStats();

      res.json({
        success: true,
        data: stats
      });
    } catch (error: any) {
      console.error('Error fetching utility reading statistics:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: 'Failed to fetch utility reading statistics'
      });
    }
  }
);

/**
 * GET /api/utility-readings/:id
 * Get utility reading by ID
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
          message: 'Utility reading ID must be a positive number'
        });
      }

      const utilityReading = await utilityReadingService.getUtilityReadingById(id);

      if (!utilityReading) {
        return res.status(404).json({
          success: false,
          error: 'Not found',
          message: 'Utility reading not found'
        });
      }

      // Check permissions
      if (user.role === 'owner') {
        // Check if user owns the apartment
        if (utilityReading.apartment?.owner_id !== user.id) {
          return res.status(403).json({
            success: false,
            error: 'Access denied',
            message: 'You can only access utility readings for your own apartments'
          });
        }
      } else if (user.role === 'renter') {
        // Check if user created the reading
        if (utilityReading.created_by !== user.id) {
          return res.status(403).json({
            success: false,
            error: 'Access denied',
            message: 'You can only access utility readings you created'
          });
        }
      }
      // Admins and super_admins can access all readings

      res.json({
        success: true,
        data: utilityReading
      });
    } catch (error: any) {
      console.error('Error fetching utility reading:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: 'Failed to fetch utility reading'
      });
    }
  }
);

/**
 * POST /api/utility-readings
 * Create new utility reading
 */
router.post(
  '/',
  authenticateToken,
  ValidationMiddleware.validateCreateUtilityReading,
  async (req: Request, res: Response) => {
    try {
      const user = (req as any).user;
      const utilityReadingData = req.body;

      // For non-admins, check apartment ownership
      if (user.role === 'owner') {
        // Check if user owns the apartment
        const apartment = await require('../services/apartmentService').ApartmentService.prototype.getApartmentById(utilityReadingData.apartment_id);
        if (!apartment || apartment.owner_id !== user.id) {
          return res.status(403).json({
            success: false,
            error: 'Access denied',
            message: 'You can only create utility readings for your own apartments'
          });
        }
      } else if (user.role === 'renter') {
        // Renters can create readings but need to have proper access to the apartment
        // This could be through active bookings or other business rules
        const booking = await require('../services/bookingService').BookingService.prototype.getBookings({
          apartment_id: utilityReadingData.apartment_id,
          user_id: user.id,
          status: 'confirmed'
        });
        
        if (!booking.data || booking.data.length === 0) {
          return res.status(403).json({
            success: false,
            error: 'Access denied',
            message: 'You can only create utility readings for apartments you have bookings for'
          });
        }
      }

      const utilityReading = await utilityReadingService.createUtilityReading(utilityReadingData, user.id);

      res.status(201).json({
        success: true,
        data: utilityReading,
        message: 'Utility reading created successfully'
      });
    } catch (error: any) {
      console.error('Error creating utility reading:', error);
      
      if (error.message.includes('not found') ||
          error.message.includes('Invalid') ||
          error.message.includes('must be')) {
        return res.status(400).json({
          success: false,
          error: 'Validation error',
          message: error.message
        });
      }

      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: 'Failed to create utility reading'
      });
    }
  }
);

/**
 * PUT /api/utility-readings/:id
 * Update utility reading
 */
router.put(
  '/:id',
  authenticateToken,
  ValidationMiddleware.validateUpdateUtilityReading,
  async (req: Request, res: Response) => {
    try {
      const user = (req as any).user;
      const id = parseInt(req.params.id);
      const updateData = req.body;

      if (isNaN(id) || id <= 0) {
        return res.status(400).json({
          success: false,
          error: 'Invalid ID',
          message: 'Utility reading ID must be a positive number'
        });
      }

      // Check if utility reading exists and get current data
      const existingReading = await utilityReadingService.getUtilityReadingById(id);
      if (!existingReading) {
        return res.status(404).json({
          success: false,
          error: 'Not found',
          message: 'Utility reading not found'
        });
      }

      // Check permissions
      if (user.role === 'owner') {
        // Check if user owns the apartment
        if (existingReading.apartment?.owner_id !== user.id) {
          return res.status(403).json({
            success: false,
            error: 'Access denied',
            message: 'You can only update utility readings for your own apartments'
          });
        }
      } else if (user.role === 'renter') {
        // Check if user created the reading
        if (existingReading.created_by !== user.id) {
          return res.status(403).json({
            success: false,
            error: 'Access denied',
            message: 'You can only update utility readings you created'
          });
        }
      }
      // Admins and super_admins can update all readings

      // For apartment_id changes, check ownership of the new apartment too
      if (updateData.apartment_id && updateData.apartment_id !== existingReading.apartment_id) {
        if (user.role === 'owner') {
          const newApartment = await require('../services/apartmentService').ApartmentService.prototype.getApartmentById(updateData.apartment_id);
          if (!newApartment || newApartment.owner_id !== user.id) {
            return res.status(403).json({
              success: false,
              error: 'Access denied',
              message: 'You can only assign utility readings to your own apartments'
            });
          }
        }
      }

      const updatedUtilityReading = await utilityReadingService.updateUtilityReading(id, updateData);

      res.json({
        success: true,
        data: updatedUtilityReading,
        message: 'Utility reading updated successfully'
      });
    } catch (error: any) {
      console.error('Error updating utility reading:', error);
      
      if (error.message.includes('not found') ||
          error.message.includes('Invalid') ||
          error.message.includes('must be')) {
        return res.status(400).json({
          success: false,
          error: 'Validation error',
          message: error.message
        });
      }

      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: 'Failed to update utility reading'
      });
    }
  }
);

/**
 * DELETE /api/utility-readings/:id
 * Delete utility reading
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
          message: 'Utility reading ID must be a positive number'
        });
      }

      // Check if utility reading exists
      const existingReading = await utilityReadingService.getUtilityReadingById(id);
      if (!existingReading) {
        return res.status(404).json({
          success: false,
          error: 'Not found',
          message: 'Utility reading not found'
        });
      }

      // Check permissions
      if (user.role === 'owner') {
        // Check if user owns the apartment
        if (existingReading.apartment?.owner_id !== user.id) {
          return res.status(403).json({
            success: false,
            error: 'Access denied',
            message: 'You can only delete utility readings for your own apartments'
          });
        }
      } else if (user.role === 'renter') {
        // Check if user created the reading
        if (existingReading.created_by !== user.id) {
          return res.status(403).json({
            success: false,
            error: 'Access denied',
            message: 'You can only delete utility readings you created'
          });
        }
      }
      // Admins and super_admins can delete all readings

      await utilityReadingService.deleteUtilityReading(id);

      res.json({
        success: true,
        message: 'Utility reading deleted successfully'
      });
    } catch (error: any) {
      console.error('Error deleting utility reading:', error);
      
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
        message: 'Failed to delete utility reading'
      });
    }
  }
);

export default router; 