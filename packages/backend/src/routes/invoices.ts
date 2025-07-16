import { Router, Request, Response } from 'express';
import { authenticateToken, requireRole, filterByResponsibleVillage } from '../middleware/auth';
import { db } from '../database/connection';

const router = Router();

/**
 * GET /api/invoices/summary
 * Get financial summary for invoices page with apartment-level aggregations
 */
router.get(
  '/summary',
  authenticateToken,
  filterByResponsibleVillage(),
  async (req: Request, res: Response) => {
    try {
      const user = (req as any).user;
      const { village_id, user_type, year, date_from, date_to } = req.query;

      // Get all apartments (with filters)
      let apartmentsQuery = db('apartments as a')
        .leftJoin('villages as v', 'a.village_id', 'v.id')
        .leftJoin('users as owner', 'a.owner_id', 'owner.id')
        .select(
          'a.id as apartment_id',
          'a.name as apartment_name',
          'v.name as village_name',
          'owner.name as owner_name',
          'owner.id as owner_id',
          'a.village_id'
        );

      // Role-based filtering
      if (user.role === 'owner') {
        apartmentsQuery = apartmentsQuery.where('a.owner_id', user.id);
      } else if (user.role === 'renter') {
        apartmentsQuery = apartmentsQuery.whereExists(function() {
          this.select('*')
              .from('bookings as b')
              .whereRaw('b.apartment_id = a.id')
              .where('b.user_id', user.id);
        });
      }
      if (village_id) {
        apartmentsQuery = apartmentsQuery.where('a.village_id', village_id);
      }
      if (req.villageFilter) {
        apartmentsQuery = apartmentsQuery.where('a.village_id', req.villageFilter);
      }
      if (user_type) {
        if (user_type === 'owner') {
          apartmentsQuery = apartmentsQuery.whereExists(function() {
            this.select('*')
                .from('bookings as b')
                .whereRaw('b.apartment_id = a.id')
                .where('b.user_type', 'owner');
          });
        } else if (user_type === 'renter') {
          apartmentsQuery = apartmentsQuery.whereExists(function() {
            this.select('*')
                .from('bookings as b')
                .whereRaw('b.apartment_id = a.id')
                .where('b.user_type', 'renter');
          });
        }
      }
      const apartments = await apartmentsQuery;

      // Helper to build date filter
      function buildDateFilter(table: string) {
        if (year) {
          return db.raw(`EXTRACT(YEAR FROM ${table}) = ?`, [year]);
        } else if (date_from || date_to) {
          const conditions = [];
          if (date_from) conditions.push(db.raw(`${table} >= ?`, [date_from]));
          if (date_to) conditions.push(db.raw(`${table} <= ?`, [date_to]));
          return conditions;
        }
        return [];
      }

      // For each apartment, aggregate payments, service requests, and utility readings separately
      const summary = [];
      for (const apt of apartments) {
        // Payments
        let paymentsQuery = db('payments as p')
          .select(
            db.raw("COALESCE(SUM(CASE WHEN p.currency = 'EGP' THEN p.amount ELSE 0 END), 0) as total_payments_egp"),
            db.raw("COALESCE(SUM(CASE WHEN p.currency = 'GBP' THEN p.amount ELSE 0 END), 0) as total_payments_gbp")
          )
          .where('p.apartment_id', apt.apartment_id);
        const paymentDateFilter = buildDateFilter('p.date');
        if (Array.isArray(paymentDateFilter)) {
          paymentDateFilter.forEach(f => paymentsQuery = paymentsQuery.where(f));
        } else if (paymentDateFilter) {
          paymentsQuery = paymentsQuery.where(paymentDateFilter);
        }
        const payments = await paymentsQuery.first();

        // Service Requests
        let serviceRequestsQuery = db('service_requests as sr')
          .leftJoin('service_types as st', 'sr.type_id', 'st.id')
          .select(
            db.raw("COALESCE(SUM(CASE WHEN st.currency = 'EGP' THEN st.cost ELSE 0 END), 0) as total_service_requests_egp"),
            db.raw("COALESCE(SUM(CASE WHEN st.currency = 'GBP' THEN st.cost ELSE 0 END), 0) as total_service_requests_gbp")
          )
          .where('sr.apartment_id', apt.apartment_id);
        const srDateFilter = buildDateFilter('sr.date_created');
        if (Array.isArray(srDateFilter)) {
          srDateFilter.forEach(f => serviceRequestsQuery = serviceRequestsQuery.where(f));
        } else if (srDateFilter) {
          serviceRequestsQuery = serviceRequestsQuery.where(srDateFilter);
        }
        const serviceRequests = await serviceRequestsQuery.first();

        // Utility Readings
        let utilityQuery = db('utility_readings as ur')
          .leftJoin('apartments as a', 'ur.apartment_id', 'a.id')
          .leftJoin('villages as v', 'a.village_id', 'v.id')
          .select(
            db.raw(`COALESCE(SUM(
              CASE 
                WHEN ur.water_start_reading IS NOT NULL AND ur.water_end_reading IS NOT NULL 
                THEN (ur.water_end_reading - ur.water_start_reading) * v.water_price 
                ELSE 0 
              END +
              CASE 
                WHEN ur.electricity_start_reading IS NOT NULL AND ur.electricity_end_reading IS NOT NULL
                THEN (ur.electricity_end_reading - ur.electricity_start_reading) * v.electricity_price
                ELSE 0 
              END
            ), 0) as total_utility_readings_egp`)
          )
          .where('ur.apartment_id', apt.apartment_id);
        const urDateFilter = buildDateFilter('ur.created_at');
        if (Array.isArray(urDateFilter)) {
          urDateFilter.forEach(f => utilityQuery = utilityQuery.where(f));
        } else if (urDateFilter) {
          utilityQuery = utilityQuery.where(urDateFilter);
        }
        const utility = await utilityQuery.first();

        // Compose summary row
        const paymentsEGP = parseFloat(payments?.total_payments_egp || 0);
        const paymentsGBP = parseFloat(payments?.total_payments_gbp || 0);
        const requestsEGP = parseFloat(serviceRequests?.total_service_requests_egp || 0);
        const requestsGBP = parseFloat(serviceRequests?.total_service_requests_gbp || 0);
        const utilityEGP = parseFloat(utility?.total_utility_readings_egp || 0);
        const utilityGBP = 0; // No utility readings in GBP

        summary.push({
          apartment_id: apt.apartment_id,
          apartment_name: apt.apartment_name,
          village_name: apt.village_name,
          owner_name: apt.owner_name,
          owner_id: apt.owner_id,
          total_money_spent: {
            EGP: paymentsEGP,
            GBP: paymentsGBP
          },
          total_money_requested: {
            EGP: requestsEGP + utilityEGP,
            GBP: requestsGBP + utilityGBP
          },
          net_money: {
            EGP: (requestsEGP + utilityEGP) - paymentsEGP,
            GBP: (requestsGBP + utilityGBP) - paymentsGBP
          }
        });
      }

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
      console.error('Error fetching invoices summary:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: 'Failed to fetch invoices summary'
      });
    }
  }
);

/**
 * GET /api/invoices/apartment/:id
 * Get detailed invoices for a specific apartment
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
          message: 'You can only access invoices for your own apartments'
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
            message: 'You can only access invoices for apartments you have bookings for'
          });
        }
      }

      // Check village filter (for admin users with responsible_village)
      if (req.villageFilter && apartment.village_id !== req.villageFilter) {
        return res.status(403).json({
          success: false,
          error: 'Access denied',
          message: 'You can only access invoices for apartments in your responsible village'
        });
      }

      // Get date filters from query parameters
      const { year, date_from, date_to } = req.query;

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
        .modify(function(qb: any) {
          if (year) {
            qb.whereRaw("EXTRACT(YEAR FROM p.date) = ?", [year]);
          } else if (date_from || date_to) {
            if (date_from) qb.where('p.date', '>=', date_from);
            if (date_to) qb.where('p.date', '<=', date_to);
          }
        })
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
        .modify(function(qb: any) {
          if (year) {
            qb.whereRaw("EXTRACT(YEAR FROM sr.date_created) = ?", [year]);
          } else if (date_from || date_to) {
            if (date_from) qb.where('sr.date_created', '>=', date_from);
            if (date_to) qb.where('sr.date_created', '<=', date_to);
          }
        })
        .orderBy('sr.date_created', 'desc');

      // Get all utility readings for this apartment
      const utilityReadings = await db('utility_readings as ur')
        .leftJoin('bookings as b', 'ur.booking_id', 'b.id')
        .leftJoin('users as u', 'b.user_id', 'u.id')
        .leftJoin('apartments as a', 'ur.apartment_id', 'a.id')
        .leftJoin('villages as v', 'a.village_id', 'v.id')
        .select(
          'ur.*',
          'b.arrival_date as booking_arrival_date',
          'u.name as person_name',
          'v.electricity_price',
          'v.water_price'
        )
        .where('ur.apartment_id', apartmentId)
        .modify(function(qb: any) {
          if (year) {
            qb.whereRaw("EXTRACT(YEAR FROM ur.created_at) = ?", [year]);
          } else if (date_from || date_to) {
            if (date_from) qb.where('ur.created_at', '>=', date_from);
            if (date_to) qb.where('ur.created_at', '<=', date_to);
          }
        })
        .orderBy('ur.created_at', 'desc');

      // Combine and format invoices
      const invoices = [
        ...payments.map((p: any) => ({
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
        ...serviceRequests.map((sr: any) => ({
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
        })),
        ...utilityReadings.map((ur: any) => {
          // Calculate utility costs
          const waterUsage = (ur.water_end_reading && ur.water_start_reading) ? 
            parseFloat(ur.water_end_reading) - parseFloat(ur.water_start_reading) : 0;
          const electricityUsage = (ur.electricity_end_reading && ur.electricity_start_reading) ?
            parseFloat(ur.electricity_end_reading) - parseFloat(ur.electricity_start_reading) : 0;
          
          const waterCost = waterUsage * (parseFloat(ur.water_price) || 0);
          const electricityCost = electricityUsage * (parseFloat(ur.electricity_price) || 0);
          const totalCost = waterCost + electricityCost;

          // Build description with usage details
          let description = `Utility reading from ${ur.start_date} to ${ur.end_date} (${ur.who_pays} pays)`;
          if (waterUsage > 0 || electricityUsage > 0) {
            const usageDetails = [];
            if (waterUsage > 0) usageDetails.push(`Water: ${waterUsage.toFixed(2)} units`);
            if (electricityUsage > 0) usageDetails.push(`Electricity: ${electricityUsage.toFixed(2)} units`);
            description += ` - ${usageDetails.join(', ')}`;
          }

          return {
          id: `utility_${ur.id}`,
          type: 'Utility Reading',
            description,
            amount: totalCost,
            currency: 'EGP',
          date: ur.created_at,
          booking_id: ur.booking_id,
          booking_arrival_date: ur.booking_arrival_date,
          person_name: ur.person_name,
          created_at: ur.created_at
          };
        })
      ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      // Calculate totals
      const totals = invoices.reduce((acc, invoice) => {
        if (invoice.type === 'Payment') {
          if (invoice.currency === 'EGP') acc.total_spent_egp += invoice.amount;
          else acc.total_spent_gbp += invoice.amount;
        } else {
          if (invoice.currency === 'EGP') acc.total_requested_egp += invoice.amount;
          else acc.total_requested_gbp += invoice.amount;
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
          invoices,
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
      console.error('Error fetching apartment invoices:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: 'Failed to fetch apartment invoices'
      });
    }
  }
);

/**
 * GET /api/invoices/user/:id
 * Get detailed invoices for a specific user across all their apartments/bookings
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
          message: 'You can only access your own invoices'
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

      // Get invoices based on user role
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

      // Combine and format invoices
      const invoices = [
        ...payments.map((p: any) => ({
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
        ...serviceRequests.map((sr: any) => ({
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
      const totals = invoices.reduce((acc, invoice) => {
        if (invoice.type === 'Payment') {
          if (invoice.currency === 'EGP') acc.total_spent_egp += invoice.amount;
          else acc.total_spent_gbp += invoice.amount;
        } else {
          if (invoice.currency === 'EGP') acc.total_requested_egp += invoice.amount;
          else acc.total_requested_gbp += invoice.amount;
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
          invoices,
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
      console.error('Error fetching user invoices:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: 'Failed to fetch user invoices'
      });
    }
  }
);

/**
 * GET /api/invoices/previous-years
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

/**
 * GET /api/invoices/renter-summary/:apartmentId
 * Get renter summary for a specific apartment invoice
 */
router.get(
  '/renter-summary/:apartmentId',
  authenticateToken,
  filterByResponsibleVillage(),
  async (req: Request, res: Response) => {
    try {
      const user = (req as any).user;
      const apartmentId = parseInt(req.params.apartmentId);

      if (isNaN(apartmentId) || apartmentId <= 0) {
        return res.status(400).json({
          success: false,
          error: 'Invalid ID',
          message: 'Apartment ID must be a positive number'
        });
      }

      // Check if apartment exists and get basic info
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

      // Check village filter (for admin users with responsible_village)
      if (req.villageFilter && apartment.village_id !== req.villageFilter) {
        return res.status(403).json({
          success: false,
          error: 'Access denied',
          message: 'You can only access invoices for apartments in your responsible village'
        });
      }

      // Get all payments for this apartment where the payer is a renter
      const renterPayments = await db('payments as p')
        .leftJoin('bookings as b', 'p.booking_id', 'b.id')
        .leftJoin('users as u', 'b.user_id', 'u.id')
        .select(
          'u.name as renter_name',
          'u.id as renter_id',
          db.raw("COALESCE(SUM(CASE WHEN p.currency = 'EGP' THEN p.amount ELSE 0 END), 0) as total_egp"),
          db.raw("COALESCE(SUM(CASE WHEN p.currency = 'GBP' THEN p.amount ELSE 0 END), 0) as total_gbp")
        )
        .where('p.apartment_id', apartmentId)
        .where(function() {
          this.where('p.user_type', 'renter')
            .orWhere('u.role', 'renter');
        })
        .groupBy('u.id', 'u.name');

      // Get all service requests for this apartment where the requester is a renter
      const renterServiceRequests = await db('service_requests as sr')
        .leftJoin('service_types as st', 'sr.type_id', 'st.id')
        .leftJoin('users as u', 'sr.requester_id', 'u.id')
        .select(
          'u.name as renter_name',
          'u.id as renter_id',
          db.raw("COALESCE(SUM(CASE WHEN st.currency = 'EGP' THEN st.cost ELSE 0 END), 0) as total_egp"),
          db.raw("COALESCE(SUM(CASE WHEN st.currency = 'GBP' THEN st.cost ELSE 0 END), 0) as total_gbp")
        )
        .where('sr.apartment_id', apartmentId)
        .where('u.role', 'renter')
        .groupBy('u.id', 'u.name');

      // Get all utility readings for this apartment where who_pays is renter
      const renterUtilityReadings = await db('utility_readings as ur')
        .leftJoin('apartments as a', 'ur.apartment_id', 'a.id')
        .leftJoin('villages as v', 'a.village_id', 'v.id')
        .select(
          db.raw(`COALESCE(SUM(
            CASE 
              WHEN ur.water_start_reading IS NOT NULL AND ur.water_end_reading IS NOT NULL AND ur.who_pays = 'renter'
              THEN (ur.water_end_reading - ur.water_start_reading) * v.water_price 
              ELSE 0 
            END +
            CASE 
              WHEN ur.electricity_start_reading IS NOT NULL AND ur.electricity_end_reading IS NOT NULL AND ur.who_pays = 'renter'
              THEN (ur.electricity_end_reading - ur.electricity_start_reading) * v.electricity_price 
              ELSE 0 
            END
          ), 0) as total_egp`)
        )
        .where('ur.apartment_id', apartmentId)
        .first();

      // Aggregate totals for all renters
      let renterSummary = null;
      if ((renterPayments && renterPayments.length > 0) || (renterServiceRequests && renterServiceRequests.length > 0) || renterUtilityReadings) {
        // For simplicity, sum all payments and requests for all renters
        let paymentsEGP = 0, paymentsGBP = 0, requestsEGP = 0, requestsGBP = 0, utilityEGP = 0;
        let renterName = null, renterId = null;
        if (renterPayments && renterPayments.length > 0) {
          paymentsEGP = renterPayments.reduce((sum, p) => sum + parseFloat(p.total_egp || 0), 0);
          paymentsGBP = renterPayments.reduce((sum, p) => sum + parseFloat(p.total_gbp || 0), 0);
          renterName = renterPayments[0].renter_name;
          renterId = renterPayments[0].renter_id;
        }
        if (renterServiceRequests && renterServiceRequests.length > 0) {
          requestsEGP = renterServiceRequests.reduce((sum, r) => sum + parseFloat(r.total_egp || 0), 0);
          requestsGBP = renterServiceRequests.reduce((sum, r) => sum + parseFloat(r.total_gbp || 0), 0);
          if (!renterName) {
            renterName = renterServiceRequests[0].renter_name;
            renterId = renterServiceRequests[0].renter_id;
          }
        }
        if (renterUtilityReadings) {
          utilityEGP = parseFloat(renterUtilityReadings.total_egp || 0);
        }
        renterSummary = {
          userName: renterName,
          userId: renterId,
          bookingId: null,
          bookingDates: null,
          total_money_spent: {
            EGP: paymentsEGP,
            GBP: paymentsGBP
          },
          total_money_requested: {
            EGP: requestsEGP + utilityEGP,
            GBP: requestsGBP
          },
          net_money: {
            EGP: (requestsEGP + utilityEGP) - paymentsEGP,
            GBP: requestsGBP - paymentsGBP
          }
        };
      }

      res.json({
        success: true,
        data: {
          apartmentId,
          apartmentName: apartment.name,
          renterSummary
        }
      });
    } catch (error: any) {
      console.error('Error fetching renter summary:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: 'Failed to fetch renter summary'
      });
    }
  }
);

export default router; 