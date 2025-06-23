import { Router, Request, Response } from 'express';
import { ServiceRequestService } from '../services/serviceRequestService';
import { authenticateToken, requireRole } from '../middleware/auth';
import { ValidationMiddleware } from '../middleware/validation';
import { ServiceRequestFilters, CreateServiceRequestRequest, UpdateServiceRequestRequest } from '../types';

const router = Router();
const serviceRequestService = new ServiceRequestService();

/**
 * @route GET /api/service-requests
 * @desc Get all service requests with filtering and pagination
 * @access Private (All authenticated users)
 */
router.get('/', authenticateToken, async (req: Request, res: Response) => {
  try {
    const filters: ServiceRequestFilters = {
      type_id: req.query.type_id ? parseInt(req.query.type_id as string) : undefined,
      apartment_id: req.query.apartment_id ? parseInt(req.query.apartment_id as string) : undefined,
      booking_id: req.query.booking_id ? parseInt(req.query.booking_id as string) : undefined,
      requester_id: req.query.requester_id ? parseInt(req.query.requester_id as string) : undefined,
      assignee_id: req.query.assignee_id ? parseInt(req.query.assignee_id as string) : undefined,
      status: req.query.status as string,
      who_pays: req.query.who_pays as 'owner' | 'renter' | 'company',
      date_action_start: req.query.date_action_start as string,
      date_action_end: req.query.date_action_end as string,
      date_created_start: req.query.date_created_start as string,
      date_created_end: req.query.date_created_end as string,
      village_id: req.query.village_id ? parseInt(req.query.village_id as string) : undefined,
      search: req.query.search as string,
      page: req.query.page ? parseInt(req.query.page as string) : undefined,
      limit: req.query.limit ? parseInt(req.query.limit as string) : undefined,
      sort_by: req.query.sort_by as string,
      sort_order: req.query.sort_order as 'asc' | 'desc'
    };

    // For non-admin users, filter to only show their own service requests or ones assigned to them
    if (!['admin', 'super_admin'].includes(req.user!.role)) {
      // Owners and renters can only see service requests they created or that are for their apartments
      if (req.user!.role === 'owner') {
        // Owner can see requests for their apartments or that they created
        filters.requester_id = req.user!.id;
      } else if (req.user!.role === 'renter') {
        // Renter can see requests they created
        filters.requester_id = req.user!.id;
      }
    }

    const result = await serviceRequestService.getServiceRequests(filters);

    res.json({
      success: true,
      data: result.data,
      pagination: result.pagination
    });
  } catch (error: any) {
    console.error('Error fetching service requests:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch service requests',
      error: error.message
    });
  }
});

/**
 * @route GET /api/service-requests/stats
 * @desc Get service request statistics
 * @access Private (Admin, Super Admin)
 */
router.get('/stats', authenticateToken, requireRole('admin', 'super_admin'), async (req: Request, res: Response) => {
  try {
    const stats = await serviceRequestService.getServiceRequestStats();

    res.json({
      success: true,
      data: stats
    });
  } catch (error: any) {
    console.error('Error fetching service request stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch service request statistics',
      error: error.message
    });
  }
});

/**
 * @route GET /api/service-requests/:id
 * @desc Get service request by ID
 * @access Private (All authenticated users - with ownership check)
 */
router.get('/:id', authenticateToken, async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);

    if (!id || id <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid service request ID'
      });
    }

    const serviceRequest = await serviceRequestService.getServiceRequestById(id);

    if (!serviceRequest) {
      return res.status(404).json({
        success: false,
        message: 'Service request not found'
      });
    }

    // Check if user has permission to view this service request
    if (!['admin', 'super_admin'].includes(req.user!.role)) {
      const canView = serviceRequest.requester_id === req.user!.id ||
                     serviceRequest.assignee_id === req.user!.id ||
                     (serviceRequest.apartment?.owner?.id === req.user!.id);

      if (!canView) {
        return res.status(403).json({
          success: false,
          message: 'You do not have permission to view this service request'
        });
      }
    }

    res.json({
      success: true,
      data: serviceRequest
    });
  } catch (error: any) {
    console.error('Error fetching service request:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch service request',
      error: error.message
    });
  }
});

/**
 * @route POST /api/service-requests
 * @desc Create new service request
 * @access Private (All authenticated users)
 */
router.post('/', 
  authenticateToken, 
  ValidationMiddleware.validateCreateServiceRequest,
  async (req: Request, res: Response) => {
    try {
      const data: CreateServiceRequestRequest = req.body;
      const createdBy = req.user!.id;

      // For non-admin users, ensure they can only create requests for themselves or their apartments
      if (!['admin', 'super_admin'].includes(req.user!.role)) {
        data.requester_id = req.user!.id; // Force requester to be the current user
      }

      const serviceRequest = await serviceRequestService.createServiceRequest(data, createdBy);

      res.status(201).json({
        success: true,
        data: serviceRequest,
        message: 'Service request created successfully'
      });
    } catch (error: any) {
      console.error('Error creating service request:', error);
      
      // Handle specific error cases
      if (error.message.includes('not found') || error.message.includes('Invalid')) {
        return res.status(400).json({
          success: false,
          message: error.message
        });
      }

      res.status(500).json({
        success: false,
        message: 'Failed to create service request',
        error: error.message
      });
    }
  }
);

/**
 * @route PUT /api/service-requests/:id
 * @desc Update service request
 * @access Private (Admin, Super Admin, or request owner/assignee)
 */
router.put('/:id',
  authenticateToken,
  ValidationMiddleware.validateUpdateServiceRequest,
  async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const data: UpdateServiceRequestRequest = req.body;

      if (!id || id <= 0) {
        return res.status(400).json({
          success: false,
          message: 'Invalid service request ID'
        });
      }

      // Check if service request exists and user has permission to update
      const existingRequest = await serviceRequestService.getServiceRequestById(id);
      if (!existingRequest) {
        return res.status(404).json({
          success: false,
          message: 'Service request not found'
        });
      }

      // Check permissions
      if (!['admin', 'super_admin'].includes(req.user!.role)) {
        const canUpdate = existingRequest.requester_id === req.user!.id ||
                         existingRequest.assignee_id === req.user!.id ||
                         (existingRequest.apartment?.owner?.id === req.user!.id);

        if (!canUpdate) {
          return res.status(403).json({
            success: false,
            message: 'You do not have permission to update this service request'
          });
        }

        // Non-admin users can only update certain fields
        const allowedFields = ['notes', 'status'];
        const providedFields = Object.keys(data);
        const invalidFields = providedFields.filter(field => !allowedFields.includes(field));

        if (invalidFields.length > 0) {
          return res.status(403).json({
            success: false,
            message: `You can only update the following fields: ${allowedFields.join(', ')}`
          });
        }
      }

      const serviceRequest = await serviceRequestService.updateServiceRequest(id, data);

      res.json({
        success: true,
        data: serviceRequest,
        message: 'Service request updated successfully'
      });
    } catch (error: any) {
      console.error('Error updating service request:', error);
      
      // Handle specific error cases
      if (error.message.includes('not found')) {
        return res.status(404).json({
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
        message: 'Failed to update service request',
        error: error.message
      });
    }
  }
);

/**
 * @route DELETE /api/service-requests/:id
 * @desc Delete service request
 * @access Private (Admin, Super Admin, or request owner)
 */
router.delete('/:id', authenticateToken, async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);

    if (!id || id <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid service request ID'
      });
    }

    // Check if service request exists and user has permission to delete
    const existingRequest = await serviceRequestService.getServiceRequestById(id);
    if (!existingRequest) {
      return res.status(404).json({
        success: false,
        message: 'Service request not found'
      });
    }

    // Check permissions
    if (!['admin', 'super_admin'].includes(req.user!.role)) {
      const canDelete = existingRequest.requester_id === req.user!.id;

      if (!canDelete) {
        return res.status(403).json({
          success: false,
          message: 'You can only delete service requests you created'
        });
      }
    }

    await serviceRequestService.deleteServiceRequest(id);

    res.json({
      success: true,
      message: 'Service request deleted successfully'
    });
  } catch (error: any) {
    console.error('Error deleting service request:', error);
    
    // Handle specific error cases
    if (error.message.includes('not found')) {
      return res.status(404).json({
        success: false,
        message: error.message
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to delete service request',
      error: error.message
    });
  }
});

export default router; 