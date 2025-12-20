import { Router, Request, Response } from 'express';
import { authenticateToken, requireRole, filterByResponsibleVillage } from '../middleware/auth';
import { db } from '../database/connection';

const router = Router();

/**
 * Maximum value for utility meters before they roll over to 0.
 * Most utility meters are 5-6 digit displays (99999 or 999999).
 * Using 999999 as the default max meter value for safety.
 */
const DEFAULT_MAX_METER_VALUE = 999999;

/**
 * Calculate utility usage accounting for meter rollover.
 * 
 * When a meter reaches its maximum value, it rolls over to 0.
 * This function correctly calculates usage in both normal and rollover scenarios.
 * 
 * @param startReading - The starting meter reading
 * @param endReading - The ending meter reading  
 * @param maxMeterValue - Maximum value before meter rolls over (default: 999999)
 * @returns The calculated usage (always positive or zero)
 */
function calculateMeterUsage(
  startReading: number | null | undefined,
  endReading: number | null | undefined,
  maxMeterValue: number = DEFAULT_MAX_METER_VALUE
): number {
  // If either reading is missing, return 0
  if (startReading === null || startReading === undefined || 
      endReading === null || endReading === undefined) {
    return 0;
  }

  // Normal case: end reading is greater than or equal to start reading
  if (endReading >= startReading) {
    return endReading - startReading;
  }

  // Rollover case: meter rolled over from max to 0
  return (maxMeterValue - startReading) + endReading;
}

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
      const { village_id, user_type, year, date_from, date_to, phase, include_renter } = req.query;
      const search = (req.query.search as string | undefined)?.trim();
      
      // include_renter: if false (default), only include owner transactions
      // if true, include both owner and renter transactions
      const includeRenter = include_renter === 'true';

      // Pagination (safe defaults)
      const page = Math.max(parseInt((req.query.page as string) || '1', 10), 1);
      const limit = Math.min(
        Math.max(parseInt((req.query.limit as string) || '50', 10), 1),
        200
      );
      const offset = (page - 1) * limit;

      // Normalize filters
      const parsedVillageId = village_id ? parseInt(village_id as string, 10) : undefined;
      const parsedYear = year ? parseInt(year as string, 10) : undefined;
      const hasDateRange = date_from || date_to;
      const parsedPhase = phase ? parseInt(phase as string, 10) : undefined;

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
          'a.village_id',
          'a.phase as apartment_phase' // ADD PHASE
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
      if (parsedVillageId) {
        apartmentsQuery = apartmentsQuery.where('a.village_id', parsedVillageId);
      }
      if (parsedPhase) {
        apartmentsQuery = apartmentsQuery.where('a.phase', parsedPhase);
      }
      if (req.villageFilter) {
        apartmentsQuery = apartmentsQuery.where('a.village_id', req.villageFilter);
      }
      if (search) {
        const like = `%${search}%`;
        apartmentsQuery = apartmentsQuery.andWhere(function() {
          this.whereILike('a.name', like)
            .orWhereILike('owner.name', like)
            .orWhereILike('v.name', like);
        });
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
      // Helper to add date filters to a query for a given expression
      const applyDateFilter = (qb: any, columnExpr: string) => {
        if (parsedYear) {
          qb.whereRaw(`EXTRACT(YEAR FROM ${columnExpr}) = ?`, [parsedYear]);
        } else if (hasDateRange) {
          if (date_from) qb.whereRaw(`${columnExpr} >= ?`, [date_from]);
          if (date_to) qb.whereRaw(`${columnExpr} <= ?`, [date_to]);
        }
        return qb;
      };

      // Aggregations
      // Filter by user_type/who_pays based on include_renter flag
      let paymentsAgg = db('payments as p')
        .select('p.apartment_id')
        .sum({ total_payments_egp: db.raw("CASE WHEN p.currency = 'EGP' THEN p.amount ELSE 0 END") })
        .sum({ total_payments_gbp: db.raw("CASE WHEN p.currency = 'GBP' THEN p.amount ELSE 0 END") })
        .groupBy('p.apartment_id');
      paymentsAgg = applyDateFilter(paymentsAgg, 'p.date');
      // Filter payments by user_type if not including renter transactions
      if (!includeRenter) {
        paymentsAgg = paymentsAgg.where(function() {
          this.where('p.user_type', 'owner').orWhereNull('p.user_type');
        });
      }

      let serviceRequestsAgg = db('service_requests as sr')
        .select('sr.apartment_id')
        .sum({ total_service_requests_egp: db.raw("CASE WHEN sr.currency = 'EGP' THEN sr.cost ELSE 0 END") })
        .sum({ total_service_requests_gbp: db.raw("CASE WHEN sr.currency = 'GBP' THEN sr.cost ELSE 0 END") })
        .groupBy('sr.apartment_id');
      serviceRequestsAgg = applyDateFilter(serviceRequestsAgg, 'COALESCE(sr.date_action, sr.date_created)');
      // Filter service requests by who_pays if not including renter transactions
      if (!includeRenter) {
        serviceRequestsAgg = serviceRequestsAgg.where(function() {
          this.whereRaw("LOWER(sr.who_pays) = 'owner'").orWhereNull('sr.who_pays');
        });
      }

      // Calculate utility costs with meter rollover handling
      // When end < start, assume meter rolled over: usage = (max_meter - start) + end
      const maxMeter = DEFAULT_MAX_METER_VALUE;
      let utilityAgg = db('utility_readings as ur')
        .leftJoin('apartments as a2', 'ur.apartment_id', 'a2.id')
        .leftJoin('villages as v2', 'a2.village_id', 'v2.id')
        .select('ur.apartment_id')
        .sum({
          total_utility_readings_egp: db.raw(`
            COALESCE(
              CASE 
                WHEN COALESCE(ur.water_end_reading, 0) >= COALESCE(ur.water_start_reading, 0)
                THEN (COALESCE(ur.water_end_reading, 0) - COALESCE(ur.water_start_reading, 0)) * COALESCE(v2.water_price, 0)
                ELSE (${maxMeter} - COALESCE(ur.water_start_reading, 0) + COALESCE(ur.water_end_reading, 0)) * COALESCE(v2.water_price, 0)
              END +
              CASE 
                WHEN COALESCE(ur.electricity_end_reading, 0) >= COALESCE(ur.electricity_start_reading, 0)
                THEN (COALESCE(ur.electricity_end_reading, 0) - COALESCE(ur.electricity_start_reading, 0)) * COALESCE(v2.electricity_price, 0)
                ELSE (${maxMeter} - COALESCE(ur.electricity_start_reading, 0) + COALESCE(ur.electricity_end_reading, 0)) * COALESCE(v2.electricity_price, 0)
              END,
              0
            )
          `)
        })
        .groupBy('ur.apartment_id');
      utilityAgg = applyDateFilter(utilityAgg, 'ur.created_at');
      // Filter utility readings by who_pays if not including renter transactions
      if (!includeRenter) {
        utilityAgg = utilityAgg.where(function() {
          this.whereRaw("LOWER(ur.who_pays) = 'owner'").orWhereNull('ur.who_pays');
        });
      }

      // Count before pagination (avoid select columns)
      const totalResult = await apartmentsQuery
        .clone()
        .clearSelect()
        .clearOrder()
        .countDistinct<{ count: string }>('a.id as count')
        .first();
      const total = parseInt(totalResult?.count || '0', 10);

      // Totals across full filtered set (not paginated)
      const totalsRow = await apartmentsQuery
        .clone()
        .clearSelect()
        .clearOrder()
        .leftJoin(paymentsAgg.as('pagg'), 'pagg.apartment_id', 'a.id')
        .leftJoin(serviceRequestsAgg.as('sragg'), 'sragg.apartment_id', 'a.id')
        .leftJoin(utilityAgg.as('uagg'), 'uagg.apartment_id', 'a.id')
        .select(
          db.raw('COALESCE(SUM(COALESCE(pagg.total_payments_egp, 0)), 0) as total_spent_egp'),
          db.raw('COALESCE(SUM(COALESCE(pagg.total_payments_gbp, 0)), 0) as total_spent_gbp'),
          db.raw('COALESCE(SUM(COALESCE(sragg.total_service_requests_egp, 0) + COALESCE(uagg.total_utility_readings_egp, 0)), 0) as total_requested_egp'),
          db.raw('COALESCE(SUM(COALESCE(sragg.total_service_requests_gbp, 0)), 0) as total_requested_gbp')
        )
        .first();

      // Apply pagination to base apartments query
      const apartmentsPage = apartmentsQuery.clone().limit(limit).offset(offset);

      // Join aggregated data in one query (eliminates N+1)
      const rows = await apartmentsPage
        .leftJoin(paymentsAgg.as('pagg'), 'pagg.apartment_id', 'a.id')
        .leftJoin(serviceRequestsAgg.as('sragg'), 'sragg.apartment_id', 'a.id')
        .leftJoin(utilityAgg.as('uagg'), 'uagg.apartment_id', 'a.id')
        .select(
          'a.id as apartment_id',
          'a.name as apartment_name',
          'v.name as village_name',
          'owner.name as owner_name',
          'owner.id as owner_id',
          'a.phase as apartment_phase',
          db.raw('COALESCE(pagg.total_payments_egp, 0) as total_payments_egp'),
          db.raw('COALESCE(pagg.total_payments_gbp, 0) as total_payments_gbp'),
          db.raw('COALESCE(sragg.total_service_requests_egp, 0) as total_service_requests_egp'),
          db.raw('COALESCE(sragg.total_service_requests_gbp, 0) as total_service_requests_gbp'),
          db.raw('COALESCE(uagg.total_utility_readings_egp, 0) as total_utility_readings_egp')
        );

      const summary = rows.map((row: any) => {
        const paymentsEGP = parseFloat(row.total_payments_egp || 0);
        const paymentsGBP = parseFloat(row.total_payments_gbp || 0);
        const requestsEGP = parseFloat(row.total_service_requests_egp || 0);
        const requestsGBP = parseFloat(row.total_service_requests_gbp || 0);
        const utilityEGP = parseFloat(row.total_utility_readings_egp || 0);
        const utilityGBP = 0; // No utility readings in GBP

        return {
          apartment_id: row.apartment_id,
          apartment_name: row.apartment_name,
          village_name: row.village_name,
          owner_name: row.owner_name,
          owner_id: row.owner_id,
          phase: row.apartment_phase, // ADD PHASE
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
        };
      });

      res.json({
        success: true,
        data: {
          summary,
          totals: {
            total_money_spent: {
              EGP: parseFloat(totalsRow?.total_spent_egp || 0),
              GBP: parseFloat(totalsRow?.total_spent_gbp || 0)
            },
            total_money_requested: {
              EGP: parseFloat(totalsRow?.total_requested_egp || 0),
              GBP: parseFloat(totalsRow?.total_requested_gbp || 0)
            },
            net_money: {
              EGP: parseFloat(totalsRow?.total_requested_egp || 0) - parseFloat(totalsRow?.total_spent_egp || 0),
              GBP: parseFloat(totalsRow?.total_requested_gbp || 0) - parseFloat(totalsRow?.total_spent_gbp || 0)
            }
          },
          pagination: {
            page,
            limit,
            total,
            total_pages: Math.ceil(total / limit)
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
      const apartment = await db('apartments as a')
        .leftJoin('users as owner', 'a.owner_id', 'owner.id')
        .select('a.*', 'owner.name as owner_name', 'a.phase as apartment_phase') // ADD PHASE
        .where('a.id', apartmentId)
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
      const { year, date_from, date_to, include_renter } = req.query;
      
      // include_renter: if false (default), only include owner transactions
      // if true, include both owner and renter transactions
      const includeRenter = include_renter === 'true';

      // Get all payments for this apartment
      const payments = await db('payments as p')
        .leftJoin('bookings as b', 'p.booking_id', 'b.id')
        .leftJoin('users as u', 'b.user_id', 'u.id')
        .leftJoin('payment_methods as pm', 'p.method_id', 'pm.id')
        .select(
          'p.*',
          'b.arrival_date as booking_arrival_date',
          'b.leaving_date as booking_departure_date',
          'u.name as person_name',
          'pm.name as payment_method_name',
          'p.user_type'
        )
        .where('p.apartment_id', apartmentId)
        .modify(function(qb: any) {
          if (year) {
            qb.whereRaw("EXTRACT(YEAR FROM p.date) = ?", [year]);
          } else if (date_from || date_to) {
            if (date_from) qb.where('p.date', '>=', date_from);
            if (date_to) qb.where('p.date', '<=', date_to);
          }
          // Filter by user_type if not including renter transactions
          if (!includeRenter) {
            qb.where(function(this: any) {
              this.where('p.user_type', 'owner').orWhereNull('p.user_type');
            });
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
          'sr.cost',
          'sr.currency',
          'b.arrival_date as booking_arrival_date',
          'b.leaving_date as booking_departure_date',
          'u.name as person_name',
          'sr.who_pays'
        )
        .where('sr.apartment_id', apartmentId)
        .modify(function(qb: any) {
          if (year) {
            qb.whereRaw("EXTRACT(YEAR FROM COALESCE(sr.date_action, sr.date_created)) = ?", [year]);
          } else if (date_from || date_to) {
            if (date_from) qb.whereRaw('COALESCE(sr.date_action, sr.date_created) >= ?', [date_from]);
            if (date_to) qb.whereRaw('COALESCE(sr.date_action, sr.date_created) <= ?', [date_to]);
          }
          // Filter by who_pays if not including renter transactions
          if (!includeRenter) {
            qb.where(function(this: any) {
              this.whereRaw("LOWER(sr.who_pays) = 'owner'").orWhereNull('sr.who_pays');
            });
          }
        })
        .orderByRaw('COALESCE(sr.date_action, sr.date_created) DESC');

      // Get all utility readings for this apartment
      const utilityReadings = await db('utility_readings as ur')
        .leftJoin('bookings as b', 'ur.booking_id', 'b.id')
        .leftJoin('users as u', 'b.user_id', 'u.id')
        .leftJoin('apartments as a', 'ur.apartment_id', 'a.id')
        .leftJoin('villages as v', 'a.village_id', 'v.id')
        .select(
          'ur.*',
          'b.arrival_date as booking_arrival_date',
          'b.leaving_date as booking_departure_date',
          'u.name as person_name',
          'v.electricity_price',
          'v.water_price',
          'ur.who_pays'
        )
        .where('ur.apartment_id', apartmentId)
        .modify(function(qb: any) {
          if (year) {
            qb.whereRaw("EXTRACT(YEAR FROM ur.created_at) = ?", [year]);
          } else if (date_from || date_to) {
            if (date_from) qb.where('ur.created_at', '>=', date_from);
            if (date_to) qb.where('ur.created_at', '<=', date_to);
          }
          // Filter by who_pays if not including renter transactions
          if (!includeRenter) {
            qb.where(function(this: any) {
              this.whereRaw("LOWER(ur.who_pays) = 'owner'").orWhereNull('ur.who_pays');
            });
          }
        })
        .orderBy('ur.created_at', 'desc');

      // Combine and format invoices
      const invoices = [
        ...payments.map((p: any) => ({
          id: `payment_${p.id}`,
          type: 'Payment',
          description: p.description
            ? p.description
            : (p.payment_method_name ? `Payment via ${p.payment_method_name}` : `Payment of ${p.amount} ${p.currency}`),
          amount: parseFloat(p.amount),
          currency: p.currency,
          date: p.date,
          booking_id: p.booking_id,
          booking_arrival_date: p.booking_arrival_date,
          person_name: p.person_name,
          created_at: p.created_at,
          user_type: p.user_type,
          owner_name: apartment.owner_name,
          apartment_phase: apartment.apartment_phase // ADD PHASE
        })),
        ...serviceRequests.map((sr: any) => ({
          id: `service_${sr.id}`,
          type: 'Service Request',
          description: sr.notes
            ? `${sr.service_name} - ${sr.notes}`
            : sr.service_name || `Service Request of ${sr.cost} ${sr.currency}`,
          amount: parseFloat(sr.cost),
          currency: sr.currency,
          date: sr.date_action || sr.date_created, // Use action date, fallback to created date
          booking_id: sr.booking_id,
          booking_arrival_date: sr.booking_arrival_date,
          person_name: sr.person_name,
          created_at: sr.created_at,
          who_pays: sr.who_pays,
          owner_name: apartment.owner_name,
          apartment_phase: apartment.apartment_phase // ADD PHASE
        })),
        ...utilityReadings.map((ur: any) => {
          // Calculate utility costs with meter rollover handling
          const waterUsage = calculateMeterUsage(
            ur.water_start_reading ? parseFloat(ur.water_start_reading) : null,
            ur.water_end_reading ? parseFloat(ur.water_end_reading) : null
          );
          const electricityUsage = calculateMeterUsage(
            ur.electricity_start_reading ? parseFloat(ur.electricity_start_reading) : null,
            ur.electricity_end_reading ? parseFloat(ur.electricity_end_reading) : null
          );
          const waterCost = waterUsage * (parseFloat(ur.water_price) || 0);
          const electricityCost = electricityUsage * (parseFloat(ur.electricity_price) || 0);
          const totalCost = waterCost + electricityCost;
          // Build concise description
          let descParts = [];
          if (waterUsage > 0) descParts.push(`Water ${waterUsage.toFixed(2)} units`);
          if (electricityUsage > 0) descParts.push(`Electricity ${electricityUsage.toFixed(2)} units`);
          if (ur.who_pays) descParts.push(ur.who_pays);
          let description = descParts.length > 0 ? `Utility: ${descParts.join(', ')}` : 'Utility';
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
            created_at: ur.created_at,
            who_pays: ur.who_pays,
            owner_name: apartment.owner_name,
            apartment_phase: apartment.apartment_phase // ADD PHASE
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
            name: apartment.name,
            owner_name: apartment.owner_name,
            phase: apartment.apartment_phase // ADD PHASE
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
          .orderByRaw('COALESCE(sr.date_action, sr.date_created) DESC');
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
          .orderByRaw('COALESCE(sr.date_action, sr.date_created) DESC');
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
          date: sr.date_action || sr.date_created, // Use action date, fallback to created date
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
          db.raw("COALESCE(SUM(CASE WHEN sr.currency = 'EGP' THEN sr.cost ELSE 0 END), 0) as total_egp"),
          db.raw("COALESCE(SUM(CASE WHEN sr.currency = 'GBP' THEN sr.cost ELSE 0 END), 0) as total_gbp")
        )
        .whereRaw("EXTRACT(YEAR FROM COALESCE(sr.date_action, sr.date_created)) < ?", [year]);

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

      // Get all service requests for this apartment where the requester is a renter (using action date for consistency)
      const renterServiceRequests = await db('service_requests as sr')
        .leftJoin('service_types as st', 'sr.type_id', 'st.id')
        .leftJoin('users as u', 'sr.requester_id', 'u.id')
        .select(
          'u.name as renter_name',
          'u.id as renter_id',
          db.raw("COALESCE(SUM(CASE WHEN sr.currency = 'EGP' THEN sr.cost ELSE 0 END), 0) as total_egp"),
          db.raw("COALESCE(SUM(CASE WHEN sr.currency = 'GBP' THEN sr.cost ELSE 0 END), 0) as total_gbp")
        )
        .where('sr.apartment_id', apartmentId)
        .where('u.role', 'renter')
        .groupBy('u.id', 'u.name');

      // Get all utility readings for this apartment where who_pays is renter
      // Includes meter rollover handling: when end < start, calculate (max - start) + end
      const renterUtilityReadings = await db('utility_readings as ur')
        .leftJoin('apartments as a', 'ur.apartment_id', 'a.id')
        .leftJoin('villages as v', 'a.village_id', 'v.id')
        .select(
          db.raw(`COALESCE(SUM(
            CASE 
              WHEN ur.water_start_reading IS NOT NULL AND ur.water_end_reading IS NOT NULL AND ur.who_pays = 'renter'
              THEN CASE
                WHEN ur.water_end_reading >= ur.water_start_reading
                THEN (ur.water_end_reading - ur.water_start_reading) * v.water_price
                ELSE (${DEFAULT_MAX_METER_VALUE} - ur.water_start_reading + ur.water_end_reading) * v.water_price
              END
              ELSE 0 
            END +
            CASE 
              WHEN ur.electricity_start_reading IS NOT NULL AND ur.electricity_end_reading IS NOT NULL AND ur.who_pays = 'renter'
              THEN CASE
                WHEN ur.electricity_end_reading >= ur.electricity_start_reading
                THEN (ur.electricity_end_reading - ur.electricity_start_reading) * v.electricity_price
                ELSE (${DEFAULT_MAX_METER_VALUE} - ur.electricity_start_reading + ur.electricity_end_reading) * v.electricity_price
              END
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

/**
 * GET /api/invoices/booking/:bookingId
 * Get all invoices for a specific booking
 */
router.get(
  '/booking/:bookingId',
  authenticateToken,
  async (req: Request, res: Response) => {
    try {
      const bookingId = parseInt(req.params.bookingId);
      if (isNaN(bookingId) || bookingId <= 0) {
        return res.status(400).json({
          success: false,
          error: 'Invalid ID',
          message: 'Booking ID must be a positive number'
        });
      }

      // Get booking to check permissions
      const booking = await db('bookings').where('id', bookingId).first();
      if (!booking) {
        return res.status(404).json({
          success: false,
          error: 'Not found',
          message: 'Booking not found'
        });
      }

      // Permissions: only admin/super_admin, or booking owner/renter
      const user = (req as any).user;
      if (
        user.role !== 'admin' &&
        user.role !== 'super_admin' &&
        booking.user_id !== user.id
      ) {
        return res.status(403).json({
          success: false,
          error: 'Access denied',
          message: 'You can only access invoices for your own bookings'
        });
      }

      // Payments for this booking (with negative amounts)
      const payments = await db('payments as p')
        .leftJoin('payment_methods as pm', 'p.method_id', 'pm.id')
        .select(
          'p.id',
          db.raw("'Payment' as type"),
          db.raw("COALESCE(p.description, pm.name) as description"),
          'p.amount', // Keep original amount in database
          'p.currency',
          'p.date',
          'p.user_type',
          'p.created_by',
          'p.created_at'
        )
        .where('p.booking_id', bookingId);

      // Service requests for this booking
      const serviceRequests = await db('service_requests as sr')
        .leftJoin('service_types as st', 'sr.type_id', 'st.id')
        .select(
          'sr.id',
          db.raw("'Service Request' as type"),
          db.raw("COALESCE(sr.notes, st.name) as description"),
          'sr.cost as amount',
          'sr.currency',
          db.raw('COALESCE(sr.date_action, sr.date_created) as date'),
          'sr.who_pays as user_type',
          'sr.created_by',
          'sr.created_at'
        )
        .where('sr.booking_id', bookingId);

      // Utility readings for this booking (with meter rollover handling)
      const utilityReadings = await db('utility_readings as ur')
        .leftJoin('apartments as a', 'ur.apartment_id', 'a.id')
        .leftJoin('villages as v', 'a.village_id', 'v.id')
        .select(
          'ur.id',
          db.raw("'Utility Reading' as type"),
          db.raw(`
            'Utility reading from ' || ur.start_date || ' to ' || ur.end_date || ' (' || ur.who_pays || ' pays)' as description
          `),
          db.raw(`
            COALESCE(
              CASE 
                WHEN COALESCE(ur.water_end_reading, 0) >= COALESCE(ur.water_start_reading, 0)
                THEN (COALESCE(ur.water_end_reading, 0) - COALESCE(ur.water_start_reading, 0)) * COALESCE(v.water_price, 0)
                ELSE (${DEFAULT_MAX_METER_VALUE} - COALESCE(ur.water_start_reading, 0) + COALESCE(ur.water_end_reading, 0)) * COALESCE(v.water_price, 0)
              END +
              CASE 
                WHEN COALESCE(ur.electricity_end_reading, 0) >= COALESCE(ur.electricity_start_reading, 0)
                THEN (COALESCE(ur.electricity_end_reading, 0) - COALESCE(ur.electricity_start_reading, 0)) * COALESCE(v.electricity_price, 0)
                ELSE (${DEFAULT_MAX_METER_VALUE} - COALESCE(ur.electricity_start_reading, 0) + COALESCE(ur.electricity_end_reading, 0)) * COALESCE(v.electricity_price, 0)
              END,
              0
            ) as amount
          `),
          db.raw("'EGP' as currency"),
          'ur.created_at as date',
          'ur.who_pays as user_type',
          'ur.created_by',
          'ur.created_at'
        )
        .where('ur.booking_id', bookingId);

      // Combine and sort all invoices by date descending
      const invoices = [
        ...payments,
        ...serviceRequests,
        ...utilityReadings
      ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      res.json({
        success: true,
        data: invoices
      });
    } catch (error: any) {
      console.error('Error fetching booking invoices:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: 'Failed to fetch booking invoices'
      });
    }
  }
);

export default router;