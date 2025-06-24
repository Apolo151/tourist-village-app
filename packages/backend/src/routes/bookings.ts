import { Router, Request, Response } from 'express';
import { bookingService } from '../services/bookingService';
import { ValidationMiddleware } from '../middleware/validation';
import { authenticateToken, requireAdmin, filterByResponsibleVillage } from '../middleware/auth';
import { CreateBookingRequest, UpdateBookingRequest } from '../types';

const bookingsRouter = Router();

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
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const sort_by = req.query.sort_by as string || 'arrival_date';
      const sort_order = req.query.sort_order as 'asc' | 'desc' || 'desc';

      const filters = {
        apartment_id: req.query.apartment_id ? parseInt(req.query.apartment_id as string) : undefined,
        user_id: req.query.user_id ? parseInt(req.query.user_id as string) : undefined,
        user_type: req.query.user_type as 'owner' | 'renter' | undefined,
        village_id: req.query.village_id ? parseInt(req.query.village_id as string) : undefined,
        status: req.query.status as 'not_arrived' | 'in_village' | 'left' | undefined,
        arrival_date_start: req.query.arrival_date_start as string | undefined,
        arrival_date_end: req.query.arrival_date_end as string | undefined,
        leaving_date_start: req.query.leaving_date_start as string | undefined,
        leaving_date_end: req.query.leaving_date_end as string | undefined,
        search: req.query.search as string | undefined
      };

      const options = {
        page,
        limit,
        sort_by,
        sort_order
      };

      const result = await bookingService.getBookings(filters, { ...options, villageFilter: req.villageFilter });

      res.json({
        success: true,
        data: result
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