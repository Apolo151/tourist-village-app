import { Router, Request, Response } from 'express';
import { bookingService } from '../services/bookingService';
import { ValidationMiddleware } from '../middleware/validation';
import { authenticateToken, requireAdmin, requireOwnershipOrAdmin, filterByResponsibleVillage } from '../middleware/auth';
import { CreateBookingRequest, UpdateBookingRequest } from '../types';
import { BookingFilters, BookingQueryOptions } from '../services/bookingService';
import { createLogger } from '../utils/logger';

const bookingsRouter = Router();
const logger = createLogger('BookingsRouter');

/**
 * GET /api/bookings
 * Get all bookings with filtering and pagination
 */
bookingsRouter.get(
  '/',
  authenticateToken,
  filterByResponsibleVillage(),
  ValidationMiddleware.validateBookingQueryParams,
  async (req: Request, res: Response) => {
    try {
      const filters: BookingFilters = {
        apartment_id: req.query.apartment_id ? parseInt(req.query.apartment_id as string) : undefined,
        user_id: req.query.user_id ? parseInt(req.query.user_id as string) : undefined,
        user_type: req.query.user_type as 'owner' | 'renter',
        village_id: req.query.village_id ? parseInt(req.query.village_id as string) : undefined,
        status: req.query.status as 'Booked' | 'Checked In' | 'Checked Out' | 'Cancelled',
        arrival_date_start: req.query.arrival_date_start as string,
        arrival_date_end: req.query.arrival_date_end as string,
        leaving_date_start: req.query.leaving_date_start as string,
        leaving_date_end: req.query.leaving_date_end as string,
        search: req.query.search as string
      };

      // Add access control for user_id filter
      if (filters.user_id && req.user) {
        // Only admin and super_admin can filter bookings by other users
        if (!['admin', 'super_admin'].includes(req.user.role)) {
          // Non-admin users can only filter their own bookings
          if (filters.user_id !== req.user.id) {
            return res.status(403).json({
              success: false,
              error: 'Access denied',
              message: 'You can only access your own bookings'
            });
          }
        }
      }

      const options: BookingQueryOptions = {
        page: req.query.page ? parseInt(req.query.page as string) : 1,
        limit: req.query.limit ? parseInt(req.query.limit as string) : 10,
        sort_by: req.query.sort_by as string || 'arrival_date',
        sort_order: (req.query.sort_order as 'asc' | 'desc') || 'desc'
      };

      const result = await bookingService.getBookings(filters, { ...options, villageFilter: req.villageFilter });

      res.json({
        success: true,
        data: result,
        message: `Found ${result.total} bookings`
      });
    } catch (error) {
      console.error('Error getting bookings:', error);
      
      if (error instanceof Error) {
        if (error.message.includes('Page must be greater than 0') || 
            error.message.includes('Limit must be between 1 and 100')) {
          return res.status(400).json({
            success: false,
            error: 'Bad request',
            message: error.message
          });
        }
      }

      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: 'Failed to get bookings'
      });
    }
  }
);

/**
 * GET /api/bookings/export
 * Export bookings (all filtered, no pagination)
 */
bookingsRouter.get(
  '/export',
  authenticateToken,
  requireAdmin,
  filterByResponsibleVillage(),
  ValidationMiddleware.validateBookingQueryParams,
  async (req: Request, res: Response) => {
    try {
      const filters: BookingFilters = {
        apartment_id: req.query.apartment_id ? parseInt(req.query.apartment_id as string) : undefined,
        user_id: req.query.user_id ? parseInt(req.query.user_id as string) : undefined,
        user_type: req.query.user_type as 'owner' | 'renter',
        village_id: req.query.village_id ? parseInt(req.query.village_id as string) : undefined,
        phase: req.query.phase ? parseInt(req.query.phase as string) : undefined,
        status: req.query.status as 'Booked' | 'Checked In' | 'Checked Out' | 'Cancelled',
        arrival_date_start: req.query.arrival_date_start as string,
        arrival_date_end: req.query.arrival_date_end as string,
        leaving_date_start: req.query.leaving_date_start as string,
        leaving_date_end: req.query.leaving_date_end as string,
        search: req.query.search as string
      };

      const options: BookingQueryOptions = {
        sort_by: (req.query.sort_by as string) || 'arrival_date',
        sort_order: (req.query.sort_order as 'asc' | 'desc') || 'desc'
      };

      const villageFilter = req.villageFilter;

      const format = (req.query.format as string) || 'csv';

      if (format === 'json') {
        const data = await bookingService.exportBookings(filters, { ...options, villageFilter });
        return res.json({
          success: true,
          data,
          message: `Exported ${data.length} bookings`
        });
      }

      const rows = await bookingService.exportBookings(filters, { ...options, villageFilter });

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="bookings.csv"');

      res.write('ID,Apartment,Village,Phase,User,User Type,People,Arrival Date,Leaving Date,Reservation Date,Status,Notes\n');

      const escape = (value: any) => {
        if (value === null || value === undefined) return '';
        const str = String(value);
        return /[",\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
      };

      rows.forEach((row: any) => {
        const line = [
          escape(row.id),
          escape(row.apartment),
          escape(row.village),
          escape(row.phase),
          escape(row.user),
          escape(row.user_type),
          escape(row.number_of_people),
          escape(row.arrival_date),
          escape(row.leaving_date),
          escape(row.reservation_date),
          escape(row.status),
          escape(row.notes || '')
        ].join(',') + '\n';
        res.write(line);
      });

      res.end();
    } catch (error: any) {
      logger.error('Error exporting bookings', { error });

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
        message: 'Failed to export bookings'
      });
    }
  }
);

/**
 * GET /api/bookings/stats
 * Get booking statistics
 */
bookingsRouter.get(
  '/stats',
  authenticateToken,
  requireAdmin,
  async (req: Request, res: Response) => {
    try {
      const stats = await bookingService.getBookingStats();
      
      res.json({
        success: true,
        data: stats
      });
    } catch (error) {
      console.error('Error getting booking stats:', error);
      
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: 'Failed to get booking statistics'
      });
    }
  }
);

/**
 * GET /api/bookings/occupancy
 * Get occupancy rate for a given date range
 */
bookingsRouter.get(
  '/occupancy',
  authenticateToken,
  requireAdmin,
  async (req: Request, res: Response) => {
    try {
      const startDate = req.query.start_date ? new Date(req.query.start_date as string) : new Date();
      const endDate = req.query.end_date ? new Date(req.query.end_date as string) : new Date();
      const villageId = req.query.village_id ? parseInt(req.query.village_id as string) : undefined;

      // Validate dates
      if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
        return res.status(400).json({
          success: false,
          error: 'Bad request',
          message: 'Invalid date format'
        });
      }

      if (startDate > endDate) {
        return res.status(400).json({
          success: false,
          error: 'Bad request',
          message: 'Start date must be before or equal to end date'
        });
      }

      const occupancyData = await bookingService.getOccupancyRate(startDate, endDate, villageId);
      
      res.json({
        success: true,
        data: occupancyData
      });
    } catch (error) {
      console.error('Error getting occupancy rate:', error);
      
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: 'Failed to get occupancy rate'
      });
    }
  }
);

/**
 * GET /api/bookings/currently-occupied
 * Get count of currently occupied apartments
 */
bookingsRouter.get(
  '/currently-occupied',
  authenticateToken,
  requireAdmin,
  async (req: Request, res: Response) => {
    try {
      const villageId = req.query.village_id ? parseInt(req.query.village_id as string) : undefined;

      const occupiedCount = await bookingService.getCurrentlyOccupiedApartmentsCount(villageId);
      
      res.json({
        success: true,
        data: { occupied_count: occupiedCount }
      });
    } catch (error) {
      console.error('Error getting currently occupied apartments count:', error);
      
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: 'Failed to get currently occupied apartments count'
      });
    }
  }
);

/**
 * GET /api/bookings/apartment/:apartmentId
 * Get bookings for a specific apartment
 */
bookingsRouter.get(
  '/apartment/:apartmentId',
  authenticateToken,
  ValidationMiddleware.validateIdParam,
  async (req: Request, res: Response) => {
    try {
      const apartmentId = parseInt(req.params.apartmentId);
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const sort_by = req.query.sort_by as string || 'arrival_date';
      const sort_order = req.query.sort_order as 'asc' | 'desc' || 'desc';

      const options = { page, limit, sort_by, sort_order };
      const bookings = await bookingService.getBookingsByApartment(apartmentId, options);

      res.json({
        success: true,
        data: bookings
      });
    } catch (error) {
      console.error('Error getting apartment bookings:', error);
      
      if (error instanceof Error) {
        if (error.message === 'Apartment not found') {
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
        message: 'Failed to get apartment bookings'
      });
    }
  }
);

/**
 * GET /api/bookings/user/:userId
 * Get bookings for a specific user
 */
bookingsRouter.get(
  '/user/:userId',
  authenticateToken,
  ValidationMiddleware.validateIdParam,
  async (req: Request, res: Response) => {
    try {
      const userId = parseInt(req.params.userId);
      
      // Add access control - only admin/super_admin can access other users' bookings
      if (req.user && !['admin', 'super_admin'].includes(req.user.role)) {
        if (userId !== req.user.id) {
          return res.status(403).json({
            success: false,
            error: 'Access denied',
            message: 'You can only access your own bookings'
          });
        }
      }
      
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const sort_by = req.query.sort_by as string || 'arrival_date';
      const sort_order = req.query.sort_order as 'asc' | 'desc' || 'desc';

      const options = { page, limit, sort_by, sort_order };
      const bookings = await bookingService.getBookingsByUser(userId, options);

      res.json({
        success: true,
        data: bookings
      });
    } catch (error) {
      console.error('Error getting user bookings:', error);
      
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
        message: 'Failed to get user bookings'
      });
    }
  }
);

/**
 * GET /api/bookings/:id
 * Get booking by ID
 */
bookingsRouter.get(
  '/:id',
  authenticateToken,
  ValidationMiddleware.validateIdParam,
  async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const booking = await bookingService.getBookingById(id);

      if (!booking) {
        return res.status(404).json({
          success: false,
          error: 'Not found',
          message: 'Booking not found'
        });
      }

      res.json({
        success: true,
        data: booking
      });
    } catch (error) {
      console.error('Error getting booking:', error);
      
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: 'Failed to get booking'
      });
    }
  }
);

/**
 * GET /api/bookings/:id/related
 * Get booking with all related data (payments, service requests, emails, utility readings)
 */
bookingsRouter.get(
  '/:id/related',
  authenticateToken,
  ValidationMiddleware.validateIdParam,
  async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const booking = await bookingService.getBookingById(id);

      if (!booking) {
        return res.status(404).json({
          success: false,
          error: 'Not found',
          message: 'Booking not found'
        });
      }

      const relatedData = await bookingService.getBookingRelatedData(id);

      res.json({
        success: true,
        data: {
          booking,
          ...relatedData
        }
      });
    } catch (error) {
      console.error('Error getting booking with related data:', error);
      
      if (error instanceof Error) {
        if (error.message === 'Booking not found') {
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
        message: 'Failed to get booking with related data'
      });
    }
  }
);

/**
 * POST /api/bookings
 * Create a new booking
 */
bookingsRouter.post(
  '/',
  authenticateToken,
  requireAdmin,
  ValidationMiddleware.validateCreateBooking,
  async (req: Request, res: Response) => {
    try {
      const bookingData: CreateBookingRequest = req.body;
      const createdBy = (req as any).user.id;
      
      const booking = await bookingService.createBooking(bookingData, createdBy);

      res.status(201).json({
        success: true,
        data: booking,
        message: 'Booking created successfully'
      });
    } catch (error) {
      console.error('Error creating booking:', error);
      
      if (error instanceof Error) {
        if (error.message === 'Apartment not found' || 
            error.message === 'User not found') {
          return res.status(404).json({
            success: false,
            error: 'Not found',
            message: error.message
          });
        }
        
        if (error.message.includes('Missing required fields') ||
            error.message.includes('Invalid date format') ||
            error.message.includes('Leaving date must be after arrival date') ||
            error.message.includes('Selected user is not an owner') ||
            error.message.includes('Selected user cannot make renter bookings')) {
          return res.status(400).json({
            success: false,
            error: 'Bad request',
            message: error.message
          });
        }
        
        if (error.message.includes('Booking conflict detected')) {
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
        message: 'Failed to create booking'
      });
    }
  }
);

/**
 * PUT /api/bookings/:id
 * Update a booking
 */
bookingsRouter.put(
  '/:id',
  authenticateToken,
  requireAdmin,
  ValidationMiddleware.validateIdParam,
  ValidationMiddleware.validateUpdateBooking,
  async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const updateData: UpdateBookingRequest = req.body;
      const updatedBy = (req as any).user.id;

      const booking = await bookingService.updateBooking(id, updateData, updatedBy);

      res.json({
        success: true,
        data: booking,
        message: 'Booking updated successfully'
      });
    } catch (error) {
      console.error('Error updating booking:', error);
      
      if (error instanceof Error) {
        if (error.message === 'Booking not found' ||
            error.message === 'Apartment not found' ||
            error.message === 'User not found') {
          return res.status(404).json({
            success: false,
            error: 'Not found',
            message: error.message
          });
        }
        
        if (error.message.includes('Invalid') ||
            error.message.includes('No fields to update') ||
            error.message.includes('Leaving date must be after arrival date') ||
            error.message.includes('Selected user is not an owner') ||
            error.message.includes('Selected user cannot make renter bookings')) {
          return res.status(400).json({
            success: false,
            error: 'Bad request',
            message: error.message
          });
        }
        
        if (error.message.includes('Booking conflict detected')) {
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
        message: 'Failed to update booking'
      });
    }
  }
);

/**
 * DELETE /api/bookings/:id
 * Delete a booking
 */
bookingsRouter.delete(
  '/:id',
  authenticateToken,
  requireAdmin,
  ValidationMiddleware.validateIdParam,
  async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      
      await bookingService.deleteBooking(id);

      res.json({
        success: true,
        message: 'Booking deleted successfully'
      });
    } catch (error) {
      console.error('Error deleting booking:', error);
      
      if (error instanceof Error) {
        if (error.message === 'Booking not found') {
          return res.status(404).json({
            success: false,
            error: 'Not found',
            message: error.message
          });
        }
        
        if (error.message.includes('Cannot delete booking')) {
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
        message: 'Failed to delete booking'
      });
    }
  }
);

export default bookingsRouter; 