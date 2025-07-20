import { Router, Request, Response } from 'express';
import { ApartmentService } from '../services/apartmentService';
import { ValidationMiddleware } from '../middleware/validation';
import { authenticateToken, requireAdmin, requireOwnershipOrAdmin, filterByResponsibleVillage } from '../middleware/auth';
import { ApartmentFilters } from '../types';

export const apartmentsRouter = Router();
const apartmentService = new ApartmentService();

/**
 * GET /api/apartments
 * List all apartments with filtering, sorting, and pagination
 */
apartmentsRouter.get(
  '/',
  authenticateToken,
  filterByResponsibleVillage(),
  ValidationMiddleware.validateQueryParams,
  async (req: Request, res: Response) => {
    try {
      const filters: ApartmentFilters = {
        village_id: req.query.village_id ? parseInt(req.query.village_id as string) : undefined,
        phase: req.query.phase ? parseInt(req.query.phase as string) : undefined,
        status: req.query.status as string,
        paying_status: req.query.paying_status as string,
        search: req.query.search as string,
        page: req.query.page ? parseInt(req.query.page as string) : 1,
        limit: req.query.limit ? parseInt(req.query.limit as string) : 10,
        sort_by: req.query.sort_by as string || 'name',
        sort_order: (req.query.sort_order as 'asc' | 'desc') || 'asc'
      };

      // If villageFilter is present from middleware, include it in filter for backward compatibility
      const villageFilter = req.villageFilter;
      
      // If villageFilters is present, override villageFilter with array approach
      const villageFilters = req.villageFilters;
      
      const result = await apartmentService.getApartments(filters, villageFilter, villageFilters);

      res.json({
        success: true,
        data: result.data,
        pagination: result.pagination,
        message: `Found ${result.pagination.total} apartments`
      });
    } catch (error) {
      console.error('Error fetching apartments:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: 'Failed to fetch apartments'
      });
    }
  }
);

/**
 * GET /api/apartments/village/:villageId
 * Get all apartments for a specific village
 */
apartmentsRouter.get(
  '/village/:villageId',
  authenticateToken,
  filterByResponsibleVillage(),
  ValidationMiddleware.validateIdParam,
  async (req: Request, res: Response) => {
    try {
      const villageId = parseInt(req.params.villageId);
      
      // Check village access (for admin users with responsible villages)
      const hasAccess = !req.villageFilters || 
                        req.villageFilters.includes(villageId) || 
                        (req.villageFilter === villageId);
                        
      if (req.user?.role === 'admin' && !hasAccess) {
        return res.status(403).json({
          success: false,
          error: 'Access denied',
          message: 'You can only access apartments in your responsible villages'
        });
      }
      
      const apartments = await apartmentService.getApartmentsByVillage(villageId);

      res.json({
        success: true,
        data: apartments,
        message: `Found ${apartments.length} apartments in village ${villageId}`
      });
    } catch (error) {
      console.error('Error fetching apartments by village:', error);
      
      if (error instanceof Error && error.message.includes('Invalid village ID')) {
        return res.status(400).json({
          success: false,
          error: 'Validation error',
          message: error.message
        });
      }

      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: 'Failed to fetch apartments by village'
      });
    }
  }
);

/**
 * GET /api/apartments/:id
 * Get apartment details by ID
 */
apartmentsRouter.get(
  '/:id',
  authenticateToken,
  filterByResponsibleVillage(),
  ValidationMiddleware.validateIdParam,
  async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const apartment = await apartmentService.getApartmentById(id);

      if (!apartment) {
        return res.status(404).json({
          success: false,
          error: 'Not found',
          message: 'Apartment not found'
        });
      }

      // Check village filter (for admin users with responsible_village)
      if (req.villageFilter && apartment.village_id !== req.villageFilter) {
        return res.status(403).json({
          success: false,
          error: 'Access denied',
          message: 'You can only access apartments in your responsible village'
        });
      }

      res.json({
        success: true,
        data: apartment,
        message: 'Apartment retrieved successfully'
      });
    } catch (error) {
      console.error('Error fetching apartment:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: 'Failed to fetch apartment'
      });
    }
  }
);

/**
 * POST /api/apartments
 * Create a new apartment
 */
apartmentsRouter.post(
  '/',
  authenticateToken,
  requireAdmin,
  ValidationMiddleware.validateCreateApartment,
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

      const apartment = await apartmentService.createApartment(req.body, createdBy);

      res.status(201).json({
        success: true,
        data: apartment,
        message: 'Apartment created successfully'
      });
    } catch (error) {
      console.error('Error creating apartment:', error);
      
      if (error instanceof Error) {
        // Handle specific business logic errors
        if (error.message.includes('not found') || 
            error.message.includes('must be between') ||
            error.message.includes('required') ||
            error.message.includes('already exists')) {
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
        message: 'Failed to create apartment'
      });
    }
  }
);

/**
 * PUT /api/apartments/:id
 * Update apartment by ID
 */
apartmentsRouter.put(
  '/:id',
  authenticateToken,
  requireAdmin,
  ValidationMiddleware.validateIdParam,
  ValidationMiddleware.validateUpdateApartment,
  async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const apartment = await apartmentService.updateApartment(id, req.body);

      res.json({
        success: true,
        data: apartment,
        message: 'Apartment updated successfully'
      });
    } catch (error) {
      console.error('Error updating apartment:', error);
      
      if (error instanceof Error) {
        if (error.message.includes('not found') || 
            error.message.includes('must be between') ||
            error.message.includes('required') ||
            error.message.includes('already exists')) {
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
        message: 'Failed to update apartment'
      });
    }
  }
);

/**
 * DELETE /api/apartments/:id
 * Delete apartment by ID
 */
apartmentsRouter.delete(
  '/:id',
  authenticateToken,
  requireAdmin,
  ValidationMiddleware.validateIdParam,
  async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      await apartmentService.deleteApartment(id);

      res.json({
        success: true,
        message: 'Apartment deleted successfully'
      });
    } catch (error) {
      console.error('Error deleting apartment:', error);
      
      if (error instanceof Error) {
        if (error.message.includes('not found')) {
          return res.status(404).json({
            success: false,
            error: 'Not found',
            message: error.message
          });
        }
        
        if (error.message.includes('Cannot delete')) {
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
        message: 'Failed to delete apartment'
      });
    }
  }
);

/**
 * GET /api/apartments/:id/financial-summary
 * Get apartment financial summary
 */
apartmentsRouter.get(
  '/:id/financial-summary',
  authenticateToken,
  ValidationMiddleware.validateIdParam,
  async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const summary = await apartmentService.getApartmentFinancialSummary(id);

      res.json({
        success: true,
        data: summary,
        message: 'Financial summary retrieved successfully'
      });
    } catch (error) {
      console.error('Error fetching financial summary:', error);
      
      if (error instanceof Error && error.message.includes('not found')) {
        return res.status(404).json({
          success: false,
          error: 'Not found',
          message: error.message
        });
      }

      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: 'Failed to fetch financial summary'
      });
    }
  }
);

/**
 * GET /api/apartments/:id/bookings
 * Get all bookings for an apartment
 */
apartmentsRouter.get(
  '/:id/bookings',
  authenticateToken,
  ValidationMiddleware.validateIdParam,
  async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const bookings = await apartmentService.getApartmentBookings(id);

      res.json({
        success: true,
        data: bookings,
        message: `Found ${bookings.length} bookings for apartment ${id}`
      });
    } catch (error) {
      console.error('Error fetching apartment bookings:', error);
      
      if (error instanceof Error && error.message.includes('not found')) {
        return res.status(404).json({
          success: false,
          error: 'Not found',
          message: error.message
        });
      }

      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: 'Failed to fetch apartment bookings'
      });
    }
  }
);

/**
 * GET /api/apartments/:id/stats
 * Get apartment statistics
 */
apartmentsRouter.get(
  '/:id/stats',
  authenticateToken,
  ValidationMiddleware.validateIdParam,
  async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const stats = await apartmentService.getApartmentStats(id);

      res.json({
        success: true,
        data: stats,
        message: 'Apartment statistics retrieved successfully'
      });
    } catch (error) {
      console.error('Error fetching apartment stats:', error);
      
      if (error instanceof Error && error.message.includes('not found')) {
        return res.status(404).json({
          success: false,
          error: 'Not found',
          message: error.message
        });
      }

      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: 'Failed to fetch apartment statistics'
      });
    }
  }
); 