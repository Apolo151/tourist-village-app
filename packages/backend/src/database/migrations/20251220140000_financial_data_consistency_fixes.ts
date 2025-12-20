import { Knex } from 'knex';

/**
 * Migration: Financial Data Consistency Fixes
 * 
 * This migration addresses the following data consistency issues:
 * 
 * 1. AMOUNT PRECISION: Expands decimal columns to support multi-billion amounts
 *    - Changed from DECIMAL(10,2) to DECIMAL(15,2)
 *    - Max value: 9,999,999,999,999.99 (nearly 10 trillion)
 *    - Maintains 2 decimal places for currency accuracy
 * 
 * 2. CHECK CONSTRAINTS: Adds database-level validation for data integrity
 *    - payments.amount > 0 (no zero/negative payments)
 *    - service_requests.cost > 0 (no zero/negative costs)
 *    - utility_readings date order (end_date > start_date)
 * 
 * 3. SERVICE TYPE VILLAGE PRICES: Also expands cost precision
 */

export async function up(knex: Knex): Promise<void> {
  // ============================================================
  // STEP 1: Expand DECIMAL precision for payments table
  // ============================================================
  await knex.raw(`
    ALTER TABLE payments 
    ALTER COLUMN amount TYPE DECIMAL(15, 2)
  `);

  // ============================================================
  // STEP 2: Expand DECIMAL precision for service_requests table
  // ============================================================
  await knex.raw(`
    ALTER TABLE service_requests 
    ALTER COLUMN cost TYPE DECIMAL(15, 2)
  `);

  // ============================================================
  // STEP 3: Expand DECIMAL precision for service_type_village_prices table
  // ============================================================
  await knex.raw(`
    ALTER TABLE service_type_village_prices 
    ALTER COLUMN cost TYPE DECIMAL(15, 2)
  `);

  // ============================================================
  // STEP 4: Expand DECIMAL precision for villages (utility prices)
  // ============================================================
  await knex.raw(`
    ALTER TABLE villages 
    ALTER COLUMN electricity_price TYPE DECIMAL(15, 2),
    ALTER COLUMN water_price TYPE DECIMAL(15, 2)
  `);

  // ============================================================
  // STEP 5: Expand DECIMAL precision for utility_readings
  // ============================================================
  await knex.raw(`
    ALTER TABLE utility_readings 
    ALTER COLUMN water_start_reading TYPE DECIMAL(15, 2),
    ALTER COLUMN water_end_reading TYPE DECIMAL(15, 2),
    ALTER COLUMN electricity_start_reading TYPE DECIMAL(15, 2),
    ALTER COLUMN electricity_end_reading TYPE DECIMAL(15, 2)
  `);

  // ============================================================
  // STEP 6: Add CHECK constraints for data integrity
  // ============================================================
  
  // Payments: amount must be positive
  await knex.raw(`
    ALTER TABLE payments 
    ADD CONSTRAINT chk_payments_amount_positive CHECK (amount > 0)
  `);

  // Service Requests: cost must be positive
  await knex.raw(`
    ALTER TABLE service_requests 
    ADD CONSTRAINT chk_service_requests_cost_positive CHECK (cost > 0)
  `);

  // Service Type Village Prices: cost must be positive
  await knex.raw(`
    ALTER TABLE service_type_village_prices 
    ADD CONSTRAINT chk_service_type_village_prices_cost_positive CHECK (cost > 0)
  `);

  // Villages: utility prices must be non-negative
  await knex.raw(`
    ALTER TABLE villages 
    ADD CONSTRAINT chk_villages_electricity_price_non_negative CHECK (electricity_price >= 0),
    ADD CONSTRAINT chk_villages_water_price_non_negative CHECK (water_price >= 0)
  `);

  // Utility Readings: end_date must be after start_date
  await knex.raw(`
    ALTER TABLE utility_readings 
    ADD CONSTRAINT chk_utility_readings_dates_order CHECK (end_date > start_date)
  `);
}

export async function down(knex: Knex): Promise<void> {
  // ============================================================
  // Remove CHECK constraints
  // ============================================================
  await knex.raw(`
    ALTER TABLE payments 
    DROP CONSTRAINT IF EXISTS chk_payments_amount_positive
  `);

  await knex.raw(`
    ALTER TABLE service_requests 
    DROP CONSTRAINT IF EXISTS chk_service_requests_cost_positive
  `);

  await knex.raw(`
    ALTER TABLE service_type_village_prices 
    DROP CONSTRAINT IF EXISTS chk_service_type_village_prices_cost_positive
  `);

  await knex.raw(`
    ALTER TABLE villages 
    DROP CONSTRAINT IF EXISTS chk_villages_electricity_price_non_negative,
    DROP CONSTRAINT IF EXISTS chk_villages_water_price_non_negative
  `);

  await knex.raw(`
    ALTER TABLE utility_readings 
    DROP CONSTRAINT IF EXISTS chk_utility_readings_dates_order
  `);

  // ============================================================
  // Revert DECIMAL precision (back to original 10,2)
  // Note: This could fail if there's data exceeding the old limits
  // ============================================================
  await knex.raw(`
    ALTER TABLE payments 
    ALTER COLUMN amount TYPE DECIMAL(10, 2)
  `);

  await knex.raw(`
    ALTER TABLE service_requests 
    ALTER COLUMN cost TYPE DECIMAL(10, 2)
  `);

  await knex.raw(`
    ALTER TABLE service_type_village_prices 
    ALTER COLUMN cost TYPE DECIMAL(10, 2)
  `);

  await knex.raw(`
    ALTER TABLE villages 
    ALTER COLUMN electricity_price TYPE DECIMAL(10, 2),
    ALTER COLUMN water_price TYPE DECIMAL(10, 2)
  `);

  await knex.raw(`
    ALTER TABLE utility_readings 
    ALTER COLUMN water_start_reading TYPE DECIMAL(10, 2),
    ALTER COLUMN water_end_reading TYPE DECIMAL(10, 2),
    ALTER COLUMN electricity_start_reading TYPE DECIMAL(10, 2),
    ALTER COLUMN electricity_end_reading TYPE DECIMAL(10, 2)
  `);
}

