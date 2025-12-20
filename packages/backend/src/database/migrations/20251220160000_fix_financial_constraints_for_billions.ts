import { Knex } from 'knex';

/**
 * Migration: Fix Financial Constraints for Billion-Scale Operations
 * 
 * This migration corrects constraints added in 20251220150000 that conflict
 * with the DECIMAL(15,2) expansion done in 20251220140000.
 * 
 * PROBLEM:
 * - 20251220140000 expanded columns to DECIMAL(15,2) supporting ~10 trillion
 * - 20251220150000 added CHECK constraints limiting:
 *   - payments.amount <= 99,999,999.99 (~100 million)
 *   - service_requests.cost <= 999,999.99 (~1 million)
 * 
 * REQUIREMENT:
 * - System must support summations reaching 1,000,000,000 (1 billion)
 * - System must operate for 20+ years
 * - Individual transactions may need to exceed the old limits
 * 
 * SOLUTION:
 * This migration:
 * 1. Drops the restrictive max amount constraints
 * 2. Removes duplicate positive constraints (already in 20251220140000)
 * 3. Removes duplicate date order constraint (already in 20251220140000)
 * 4. Keeps the useful utility reading constraints (non-negative, paired readings)
 * 
 * After this migration, constraints will be:
 * - Positive amounts enforced by: chk_payments_amount_positive (from 20251220140000)
 * - Positive costs enforced by: chk_service_requests_cost_positive (from 20251220140000)
 * - Date order enforced by: chk_utility_readings_dates_order (from 20251220140000)
 * - Non-negative readings enforced by: chk_*_non_negative (from 20251220150000)
 * - Paired readings enforced by: chk_*_readings_complete (from 20251220150000)
 */

export async function up(knex: Knex): Promise<void> {
  // ============================================================
  // STEP 1: Drop restrictive max amount constraints
  // These block transactions exceeding old DECIMAL(10,2) limits
  // ============================================================
  
  await knex.raw(`
    ALTER TABLE payments 
    DROP CONSTRAINT IF EXISTS chk_payment_amount_max
  `);
  
  await knex.raw(`
    ALTER TABLE service_requests 
    DROP CONSTRAINT IF EXISTS chk_service_request_cost_max
  `);

  // ============================================================
  // STEP 2: Drop duplicate positive constraints
  // These are already covered by 20251220140000 migration
  // ============================================================
  
  // chk_payment_amount_positive duplicates chk_payments_amount_positive
  await knex.raw(`
    ALTER TABLE payments 
    DROP CONSTRAINT IF EXISTS chk_payment_amount_positive
  `);
  
  // chk_service_request_cost_positive duplicates chk_service_requests_cost_positive
  await knex.raw(`
    ALTER TABLE service_requests 
    DROP CONSTRAINT IF EXISTS chk_service_request_cost_positive
  `);

  // ============================================================
  // STEP 3: Drop duplicate date order constraint
  // chk_utility_dates_order duplicates chk_utility_readings_dates_order
  // ============================================================
  
  await knex.raw(`
    ALTER TABLE utility_readings 
    DROP CONSTRAINT IF EXISTS chk_utility_dates_order
  `);

  // ============================================================
  // NOTE: The following constraints from 20251220150000 are KEPT:
  // - chk_water_start_non_negative
  // - chk_water_end_non_negative
  // - chk_electricity_start_non_negative
  // - chk_electricity_end_non_negative
  // - chk_water_readings_complete
  // - chk_electricity_readings_complete
  // These are valuable and don't conflict with the expanded precision.
  // ============================================================
}

export async function down(knex: Knex): Promise<void> {
  // Re-add the constraints if rolling back
  // NOTE: This would re-introduce the problematic limits
  
  await knex.raw(`
    ALTER TABLE payments 
    ADD CONSTRAINT chk_payment_amount_max 
    CHECK (amount <= 99999999.99)
  `);
  
  await knex.raw(`
    ALTER TABLE service_requests 
    ADD CONSTRAINT chk_service_request_cost_max 
    CHECK (cost <= 999999.99)
  `);
  
  await knex.raw(`
    ALTER TABLE payments 
    ADD CONSTRAINT chk_payment_amount_positive 
    CHECK (amount > 0)
  `);
  
  await knex.raw(`
    ALTER TABLE service_requests 
    ADD CONSTRAINT chk_service_request_cost_positive 
    CHECK (cost > 0)
  `);
  
  await knex.raw(`
    ALTER TABLE utility_readings 
    ADD CONSTRAINT chk_utility_dates_order 
    CHECK (end_date > start_date)
  `);
}

