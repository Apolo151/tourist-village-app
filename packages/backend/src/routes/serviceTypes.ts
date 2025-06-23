import { Router, Request, Response } from 'express';
import { ServiceTypeService } from '../services/serviceTypeService';
import { authenticateToken, requireRole } from '../middleware/auth';
import { ValidationMiddleware } from '../middleware/validation';
import { ServiceTypeFilters, CreateServiceTypeRequest, UpdateServiceTypeRequest } from '../types';

const router = Router();
const serviceTypeService = new ServiceTypeService();

/**
 * @route GET /api/service-types
 * @desc Get all service types with filtering and pagination
 * @access Private (Admin, Super Admin)
 */
router.get('/', authenticateToken, requireRole('admin', 'super_admin'), async (req: Request, res: Response) => {
  try {
    const filters: ServiceTypeFilters = {
      search: req.query.search as string,
      currency: req.query.currency as 'EGP' | 'GBP',
      min_cost: req.query.min_cost ? parseFloat(req.query.min_cost as string) : undefined,
      max_cost: req.query.max_cost ? parseFloat(req.query.max_cost as string) : undefined,
      page: req.query.page ? parseInt(req.query.page as string) : undefined,
      limit: req.query.limit ? parseInt(req.query.limit as string) : undefined,
      sort_by: req.query.sort_by as string,
      sort_order: req.query.sort_order as 'asc' | 'desc'
    };

    const result = await serviceTypeService.getServiceTypes(filters);

    res.json({
      success: true,
      data: result.data,
      pagination: result.pagination
    });
  } catch (error: any) {
    console.error('Error fetching service types:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch service types',
      error: error.message
    });
  }
});

/**
 * @route GET /api/service-types/stats
 * @desc Get service type statistics
 * @access Private (Admin, Super Admin)
 */
router.get('/stats', authenticateToken, requireRole('admin', 'super_admin'), async (req: Request, res: Response) => {
  try {
    const stats = await serviceTypeService.getServiceTypeStats();

    res.json({
      success: true,
      data: stats
    });
  } catch (error: any) {
    console.error('Error fetching service type stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch service type statistics',
      error: error.message
    });
  }
});

/**
 * @route GET /api/service-types/:id
 * @desc Get service type by ID
 * @access Private (Admin, Super Admin)
 */
router.get('/:id', authenticateToken, requireRole('admin', 'super_admin'), async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);

    if (!id || id <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid service type ID'
      });
    }

    const serviceType = await serviceTypeService.getServiceTypeById(id);

    if (!serviceType) {
      return res.status(404).json({
        success: false,
        message: 'Service type not found'
      });
    }

    res.json({
      success: true,
      data: serviceType
    });
  } catch (error: any) {
    console.error('Error fetching service type:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch service type',
      error: error.message
    });
  }
});

/**
 * @route POST /api/service-types
 * @desc Create new service type
 * @access Private (Admin, Super Admin)
 */
router.post('/', 
  authenticateToken, 
  requireRole('admin', 'super_admin'),
  ValidationMiddleware.validateCreateServiceType,
  async (req: Request, res: Response) => {
    try {
      const data: CreateServiceTypeRequest = req.body;
      const createdBy = req.user!.id;

      const serviceType = await serviceTypeService.createServiceType(data, createdBy);

      res.status(201).json({
        success: true,
        data: serviceType,
        message: 'Service type created successfully'
      });
    } catch (error: any) {
      console.error('Error creating service type:', error);
      
      // Handle specific error cases
      if (error.message.includes('already exists')) {
        return res.status(409).json({
          success: false,
          message: error.message
        });
      }
      
      if (error.message.includes('not found') || error.message.includes('Invalid')) {
        return res.status(400).json({
          success: false,
          message: error.message
        });
      }

      res.status(500).json({
        success: false,
        message: 'Failed to create service type',
        error: error.message
      });
    }
  }
);

/**
 * @route PUT /api/service-types/:id
 * @desc Update service type
 * @access Private (Admin, Super Admin)
 */
router.put('/:id',
  authenticateToken,
  requireRole('admin', 'super_admin'),
  ValidationMiddleware.validateUpdateServiceType,
  async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const data: UpdateServiceTypeRequest = req.body;

      if (!id || id <= 0) {
        return res.status(400).json({
          success: false,
          message: 'Invalid service type ID'
        });
      }

      const serviceType = await serviceTypeService.updateServiceType(id, data);

      res.json({
        success: true,
        data: serviceType,
        message: 'Service type updated successfully'
      });
    } catch (error: any) {
      console.error('Error updating service type:', error);
      
      // Handle specific error cases
      if (error.message.includes('not found')) {
        return res.status(404).json({
          success: false,
          message: error.message
        });
      }
      
      if (error.message.includes('already exists')) {
        return res.status(409).json({
          success: false,
          message: error.message
        });
      }
      
      if (error.message.includes('Invalid')) {
        return res.status(400).json({
          success: false,
          message: error.message
        });
      }

      res.status(500).json({
        success: false,
        message: 'Failed to update service type',
        error: error.message
      });
    }
  }
);

/**
 * @route DELETE /api/service-types/:id
 * @desc Delete service type
 * @access Private (Admin, Super Admin)
 */
router.delete('/:id', authenticateToken, requireRole('admin', 'super_admin'), async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);

    if (!id || id <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid service type ID'
      });
    }

    await serviceTypeService.deleteServiceType(id);

    res.json({
      success: true,
      message: 'Service type deleted successfully'
    });
  } catch (error: any) {
    console.error('Error deleting service type:', error);
    
    // Handle specific error cases
    if (error.message.includes('not found')) {
      return res.status(404).json({
        success: false,
        message: error.message
      });
    }
    
    if (error.message.includes('existing service requests')) {
      return res.status(409).json({
        success: false,
        message: error.message
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to delete service type',
      error: error.message
    });
  }
});

export default router; 