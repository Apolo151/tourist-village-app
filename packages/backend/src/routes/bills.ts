import { Router, Request, Response } from 'express';
import { authenticateToken, requireRole, filterByResponsibleVillage } from '../middleware/auth';
import { db } from '../database/connection';

const router = Router();

/**
 * GET /api/bills/summary
 * Get financial summary for bills page with apartment-level aggregations
 */
router.get(
  '/summary',
  authenticateToken,
  filterByResponsibleVillage(),
  async (req: Request, res: Response) => {
    try {
      const user = (req as any).user;
      const { village_id, user_type, year, date_from, date_to } = req.query;

      // Build base query for financial summary
      let query = db('apartments as a')
        .leftJoin('villages as v', 'a.village_id', 'v.id')
        .leftJoin('users as owner', 'a.owner_id', 'owner.id')
        .leftJoin('payments as p', 'a.id', 'p.apartment_id')
        .leftJoin('service_requests as sr', 'a.id', 'sr.apartment_id')
        .leftJoin('service_types as st', 'sr.type_id', 'st.id')
        .select(
          'a.id as apartment_id',
          'a.name as apartment_name',
          'v.name as village_name',
          'owner.name as owner_name',
          'owner.id as owner_id',
          db.raw("COALESCE(SUM(CASE WHEN p.currency = 'EGP' THEN p.amount ELSE 0 END), 0) as total_payments_egp"),
          db.raw("COALESCE(SUM(CASE WHEN p.currency = 'GBP' THEN p.amount ELSE 0 END), 0) as total_payments_gbp"),
          db.raw("COALESCE(SUM(CASE WHEN st.currency = 'EGP' THEN st.cost ELSE 0 END), 0) as total_service_requests_egp"),
          db.raw("COALESCE(SUM(CASE WHEN st.currency = 'GBP' THEN st.cost ELSE 0 END), 0) as total_service_requests_gbp")
        )
        .groupBy('a.id', 'a.name', 'v.name', 'owner.name', 'owner.id');

      // Apply role-based filtering
      if (user.role === 'owner') {
        query = query.where('a.owner_id', user.id);
      } else if (user.role === 'renter') {
        // Renters can only see apartments they have bookings for
        query = query.whereExists(function() {
          this.select('*')
              .from('bookings as b')
              .whereRaw('b.apartment_id = a.id')
              .where('b.user_id', user.id);
        });
      }

      // Apply filters
      if (village_id) {
        query = query.where('a.village_id', village_id);
      }

      // Apply village filter from middleware (for admin users with responsible_village)
      if (req.villageFilter) {
        query = query.where('a.village_id', req.villageFilter);
      }

      if (user_type) {
        if (user_type === 'owner') {
          query = query.whereExists(function() {
            this.select('*')
                .from('bookings as b')
                .whereRaw('b.apartment_id = a.id')
                .where('b.user_type', 'owner');
          });
        } else if (user_type === 'renter') {
          query = query.whereExists(function() {
            this.select('*')
                .from('bookings as b')
                .whereRaw('b.apartment_id = a.id')
                .where('b.user_type', 'renter');
          });
        }
      }

      // Apply date filters to payments and service requests
      if (year) {
        query = query.where(function() {
          this.whereRaw("EXTRACT(YEAR FROM p.date) = ?", [year])
              .orWhereRaw("EXTRACT(YEAR FROM sr.date_created) = ?", [year]);
        });
      } else if (date_from || date_to) {
        if (date_from) {
          query = query.where(function() {
            this.where('p.date', '>=', date_from)
                .orWhere('sr.date_created', '>=', date_from);
          });
        }
        if (date_to) {
          query = query.where(function() {
            this.where('p.date', '<=', date_to)
                .orWhere('sr.date_created', '<=', date_to);
          });
        }
      }

      const results = await query;

      // Calculate net amounts
      const summary = results.map(row => {
        const paymentsEGP = parseFloat(row.total_payments_egp) || 0;
        const paymentsGBP = parseFloat(row.total_payments_gbp) || 0;
        const requestsEGP = parseFloat(row.total_service_requests_egp) || 0;
        const requestsGBP = parseFloat(row.total_service_requests_gbp) || 0;

        return {
          apartment_id: row.apartment_id,
          apartment_name: row.apartment_name,
          village_name: row.village_name,
          owner_name: row.owner_name,
          owner_id: row.owner_id,
          total_money_spent: {
            EGP: paymentsEGP,
            GBP: paymentsGBP
          },
          total_money_requested: {
            EGP: requestsEGP,
            GBP: requestsGBP
          },
          net_money: {
            EGP: requestsEGP - paymentsEGP,
            GBP: requestsGBP - paymentsGBP
          }
        };
      });

      // Calculate totals
      const totals = summary.reduce((acc, item) => {
        acc.total_spent_egp += item.total_money_spent.EGP;
        acc.total_spent_gbp += item.total_money_spent.GBP;
        acc.total_requested_egp += item.total_money_requested.EGP;
        acc.total_requested_gbp += item.total_money_requested.GBP;
        acc.net_egp += item.net_money.EGP;
        acc.net_gbp += item.net_money.GBP;
        return acc;
      }, {
        total_spent_egp: 0,
        total_spent_gbp: 0,
        total_requested_egp: 0,
        total_requested_gbp: 0,
        net_egp: 0,
        net_gbp: 0
      });

      res.json({
        success: true,
        data: {
          summary,
          totals: {
            total_money_spent: {
              EGP: totals.total_spent_egp,
              GBP: totals.total_spent_gbp
            },
            total_money_requested: {
              EGP: totals.total_requested_egp,
              GBP: totals.total_requested_gbp
            },
            net_money: {
              EGP: totals.net_egp,
              GBP: totals.net_gbp
            }
          }
        }
      });
    } catch (error: any) {
      console.error('Error fetching bills summary:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: 'Failed to fetch bills summary'
      });
    }
  }
);

/**
 * GET /api/bills/apartment/:id
 * Get detailed bills for a specific apartment
 */
router.get(
  '/apartment/:id',
  authenticateToken,
  filterByResponsibleVillage(),
  async (req: Request, res: Response) => {
    try {
      const user = (req as any).user;
      const apartmentId = parseInt(req.params.id);

      if (isNaN(apartmentId) || apartmentId <= 0) {
        return res.status(400).json({
          success: false,
          error: 'Invalid ID',
          message: 'Apartment ID must be a positive number'
        });
      }

      // Check access permissions
      const apartment = await db('apartments')
        .where('id', apartmentId)
        .first();

      if (!apartment) {
        return res.status(404).json({
          success: false,
          error: 'Not found',
          message: 'Apartment not found'
        });
      }

      // Check permissions
      if (user.role === 'owner' && apartment.owner_id !== user.id) {
        return res.status(403).json({
          success: false,
          error: 'Access denied',
          message: 'You can only access bills for your own apartments'
        });
      } else if (user.role === 'renter') {
        const hasBooking = await db('bookings')
          .where('apartment_id', apartmentId)
          .where('user_id', user.id)
          .first();

        if (!hasBooking) {
          return res.status(403).json({
            success: false,
            error: 'Access denied',
            message: 'You can only access bills for apartments you have bookings for'
          });
        }
      }

      // Check village filter (for admin users with responsible_village)
      if (req.villageFilter && apartment.village_id !== req.villageFilter) {
        return res.status(403).json({
          success: false,
          error: 'Access denied',
          message: 'You can only access bills for apartments in your responsible village'
        });
      }

      // Get all payments for this apartment
      const payments = await db('payments as p')
        .leftJoin('bookings as b', 'p.booking_id', 'b.id')
        .leftJoin('users as u', 'b.user_id', 'u.id')
        .leftJoin('payment_methods as pm', 'p.method_id', 'pm.id')
        .select(
          'p.*',
          'b.arrival_date as booking_arrival_date',
          'u.name as person_name',
          'pm.name as payment_method_name'
        )
        .where('p.apartment_id', apartmentId)
        .orderBy('p.date', 'desc');

      // Get all service requests for this apartment
      const serviceRequests = await db('service_requests as sr')
        .leftJoin('service_types as st', 'sr.type_id', 'st.id')
        .leftJoin('bookings as b', 'sr.booking_id', 'b.id')
        .leftJoin('users as u', 'b.user_id', 'u.id')
        .select(
          'sr.*',
          'st.name as service_name',
          'st.cost',
          'st.currency',
          'b.arrival_date as booking_arrival_date',
          'u.name as person_name'
        )
        .where('sr.apartment_id', apartmentId)
        .orderBy('sr.date_created', 'desc');

      // Combine and format bills
      const bills = [
        ...payments.map(p => ({
          id: `payment_${p.id}`,
          type: 'Payment',
          description: p.description || `Payment via ${p.payment_method_name}`,
          amount: parseFloat(p.amount),
          currency: p.currency,
          date: p.date,
          booking_id: p.booking_id,
          booking_arrival_date: p.booking_arrival_date,
          person_name: p.person_name,
          created_at: p.created_at
        })),
        ...serviceRequests.map(sr => ({
          id: `service_${sr.id}`,
          type: 'Service Request',
          description: sr.notes || sr.service_name,
          amount: parseFloat(sr.cost),
          currency: sr.currency,
          date: sr.date_created,
          booking_id: sr.booking_id,
          booking_arrival_date: sr.booking_arrival_date,
          person_name: sr.person_name,
          created_at: sr.created_at
        }))
      ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      // Calculate totals
      const totals = bills.reduce((acc, bill) => {
        if (bill.type === 'Payment') {
          if (bill.currency === 'EGP') acc.total_spent_egp += bill.amount;
          else acc.total_spent_gbp += bill.amount;
        } else {
          if (bill.currency === 'EGP') acc.total_requested_egp += bill.amount;
          else acc.total_requested_gbp += bill.amount;
        }
        return acc;
      }, {
        total_spent_egp: 0,
        total_spent_gbp: 0,
        total_requested_egp: 0,
        total_requested_gbp: 0
      });

      res.json({
        success: true,
        data: {
          apartment: {
            id: apartment.id,
            name: apartment.name
          },
          bills,
          totals: {
            total_money_spent: {
              EGP: totals.total_spent_egp,
              GBP: totals.total_spent_gbp
            },
            total_money_requested: {
              EGP: totals.total_requested_egp,
              GBP: totals.total_requested_gbp
            },
            net_money: {
              EGP: totals.total_requested_egp - totals.total_spent_egp,
              GBP: totals.total_requested_gbp - totals.total_spent_gbp
            }
          }
        }
      });
    } catch (error: any) {
      console.error('Error fetching apartment bills:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: 'Failed to fetch apartment bills'
      });
    }
  }
);

/**
 * GET /api/bills/user/:id
 * Get detailed bills for a specific user across all their apartments/bookings
 */
router.get(
  '/user/:id',
  authenticateToken,
  async (req: Request, res: Response) => {
    try {
      const user = (req as any).user;
      const userId = parseInt(req.params.id);

      if (isNaN(userId) || userId <= 0) {
        return res.status(400).json({
          success: false,
          error: 'Invalid ID',
          message: 'User ID must be a positive number'
        });
      }

      // Check permissions
      if (user.role !== 'admin' && user.role !== 'super_admin' && user.id !== userId) {
        return res.status(403).json({
          success: false,
          error: 'Access denied',
          message: 'You can only access your own bills'
        });
      }

      // Get target user info
      const targetUser = await db('users')
        .where('id', userId)
        .first();

      if (!targetUser) {
        return res.status(404).json({
          success: false,
          error: 'Not found',
          message: 'User not found'
        });
      }

      // Get bills based on user role
      let payments = [];
      let serviceRequests = [];

      if (targetUser.role === 'owner') {
        // Get all payments and service requests for apartments owned by this user
        payments = await db('payments as p')
          .leftJoin('apartments as a', 'p.apartment_id', 'a.id')
          .leftJoin('bookings as b', 'p.booking_id', 'b.id')
          .leftJoin('users as booking_user', 'b.user_id', 'booking_user.id')
          .leftJoin('payment_methods as pm', 'p.method_id', 'pm.id')
          .select(
            'p.*',
            'a.name as apartment_name',
            'b.arrival_date as booking_arrival_date',
            'booking_user.name as person_name',
            'pm.name as payment_method_name'
          )
          .where('a.owner_id', userId)
          .orderBy('p.date', 'desc');

        serviceRequests = await db('service_requests as sr')
          .leftJoin('apartments as a', 'sr.apartment_id', 'a.id')
          .leftJoin('service_types as st', 'sr.type_id', 'st.id')
          .leftJoin('bookings as b', 'sr.booking_id', 'b.id')
          .leftJoin('users as booking_user', 'b.user_id', 'booking_user.id')
          .select(
            'sr.*',
            'a.name as apartment_name',
            'st.name as service_name',
            'st.cost',
            'st.currency',
            'b.arrival_date as booking_arrival_date',
            'booking_user.name as person_name'
          )
          .where('a.owner_id', userId)
          .orderBy('sr.date_created', 'desc');
      } else {
        // For renters, get payments and service requests they created
        payments = await db('payments as p')
          .leftJoin('apartments as a', 'p.apartment_id', 'a.id')
          .leftJoin('bookings as b', 'p.booking_id', 'b.id')
          .leftJoin('payment_methods as pm', 'p.method_id', 'pm.id')
          .select(
            'p.*',
            'a.name as apartment_name',
            'b.arrival_date as booking_arrival_date',
            'pm.name as payment_method_name'
          )
          .where('p.created_by', userId)
          .orderBy('p.date', 'desc');

        serviceRequests = await db('service_requests as sr')
          .leftJoin('apartments as a', 'sr.apartment_id', 'a.id')
          .leftJoin('service_types as st', 'sr.type_id', 'st.id')
          .leftJoin('bookings as b', 'sr.booking_id', 'b.id')
          .select(
            'sr.*',
            'a.name as apartment_name',
            'st.name as service_name',
            'st.cost',
            'st.currency',
            'b.arrival_date as booking_arrival_date'
          )
          .where('sr.requester_id', userId)
          .orderBy('sr.date_created', 'desc');
      }

      // Combine and format bills
      const bills = [
        ...payments.map(p => ({
          id: `payment_${p.id}`,
          type: 'Payment',
          description: p.description || `Payment via ${p.payment_method_name}`,
          amount: parseFloat(p.amount),
          currency: p.currency,
          date: p.date,
          apartment_name: p.apartment_name,
          booking_id: p.booking_id,
          booking_arrival_date: p.booking_arrival_date,
          person_name: p.person_name || targetUser.name,
          created_at: p.created_at
        })),
        ...serviceRequests.map(sr => ({
          id: `service_${sr.id}`,
          type: 'Service Request',
          description: sr.notes || sr.service_name,
          amount: parseFloat(sr.cost),
          currency: sr.currency,
          date: sr.date_created,
          apartment_name: sr.apartment_name,
          booking_id: sr.booking_id,
          booking_arrival_date: sr.booking_arrival_date,
          person_name: sr.person_name || targetUser.name,
          created_at: sr.created_at
        }))
      ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      // Calculate totals
      const totals = bills.reduce((acc, bill) => {
        if (bill.type === 'Payment') {
          if (bill.currency === 'EGP') acc.total_spent_egp += bill.amount;
          else acc.total_spent_gbp += bill.amount;
        } else {
          if (bill.currency === 'EGP') acc.total_requested_egp += bill.amount;
          else acc.total_requested_gbp += bill.amount;
        }
        return acc;
      }, {
        total_spent_egp: 0,
        total_spent_gbp: 0,
        total_requested_egp: 0,
        total_requested_gbp: 0
      });

      res.json({
        success: true,
        data: {
          user: {
            id: targetUser.id,
            name: targetUser.name,
            email: targetUser.email,
            role: targetUser.role
          },
          bills,
          totals: {
            total_money_spent: {
              EGP: totals.total_spent_egp,
              GBP: totals.total_spent_gbp
            },
            total_money_requested: {
              EGP: totals.total_requested_egp,
              GBP: totals.total_requested_gbp
            },
            net_money: {
              EGP: totals.total_requested_egp - totals.total_spent_egp,
              GBP: totals.total_requested_gbp - totals.total_spent_gbp
            }
          }
        }
      });
    } catch (error: any) {
      console.error('Error fetching user bills:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: 'Failed to fetch user bills'
      });
    }
  }
);

/**
 * GET /api/bills/previous-years
 * Get financial totals for years before the specified year
 */
router.get(
  '/previous-years',
  authenticateToken,
  filterByResponsibleVillage(),
  async (req: Request, res: Response) => {
    try {
      const user = (req as any).user;
      const { before_year } = req.query;

      if (!before_year) {
        return res.status(400).json({
          success: false,
          error: 'Missing parameter',
          message: 'before_year parameter is required'
        });
      }

      const year = parseInt(before_year as string);
      if (isNaN(year)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid parameter',
          message: 'before_year must be a valid number'
        });
      }

      // Build base query for previous years totals
      let paymentsQuery = db('payments as p')
        .leftJoin('apartments as a', 'p.apartment_id', 'a.id')
        .select(
          db.raw("COALESCE(SUM(CASE WHEN p.currency = 'EGP' THEN p.amount ELSE 0 END), 0) as total_egp"),
          db.raw("COALESCE(SUM(CASE WHEN p.currency = 'GBP' THEN p.amount ELSE 0 END), 0) as total_gbp")
        )
        .whereRaw("EXTRACT(YEAR FROM p.date) < ?", [year]);

      let serviceRequestsQuery = db('service_requests as sr')
        .leftJoin('service_types as st', 'sr.type_id', 'st.id')
        .leftJoin('apartments as a', 'sr.apartment_id', 'a.id')
        .select(
          db.raw("COALESCE(SUM(CASE WHEN st.currency = 'EGP' THEN st.cost ELSE 0 END), 0) as total_egp"),
          db.raw("COALESCE(SUM(CASE WHEN st.currency = 'GBP' THEN st.cost ELSE 0 END), 0) as total_gbp")
        )
        .whereRaw("EXTRACT(YEAR FROM sr.date_created) < ?", [year]);

      // Apply role-based filtering
      if (user.role === 'owner') {
        paymentsQuery = paymentsQuery.where('a.owner_id', user.id);
        serviceRequestsQuery = serviceRequestsQuery.where('a.owner_id', user.id);
      } else if (user.role === 'renter') {
        paymentsQuery = paymentsQuery.where('p.created_by', user.id);
        serviceRequestsQuery = serviceRequestsQuery.where('sr.requester_id', user.id);
      }

      // Apply village filter from middleware (for admin users with responsible_village)
      if (req.villageFilter) {
        paymentsQuery = paymentsQuery.where('a.village_id', req.villageFilter);
        serviceRequestsQuery = serviceRequestsQuery.where('a.village_id', req.villageFilter);
      }

      const [paymentsResult, serviceRequestsResult] = await Promise.all([
        paymentsQuery.first(),
        serviceRequestsQuery.first()
      ]);

      const paymentsEGP = parseFloat(paymentsResult?.total_egp || '0');
      const paymentsGBP = parseFloat(paymentsResult?.total_gbp || '0');
      const requestsEGP = parseFloat(serviceRequestsResult?.total_egp || '0');
      const requestsGBP = parseFloat(serviceRequestsResult?.total_gbp || '0');

      const totals = {
        total_money_spent: {
          EGP: paymentsEGP,
          GBP: paymentsGBP
        },
        total_money_requested: {
          EGP: requestsEGP,
          GBP: requestsGBP
        },
        net_money: {
          EGP: requestsEGP - paymentsEGP,
          GBP: requestsGBP - paymentsGBP
        }
      };

      res.json({
        success: true,
        data: totals
      });
    } catch (error: any) {
      console.error('Error fetching previous years totals:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: 'Failed to fetch previous years totals'
      });
    }
  }
);

export default router; 