import { Knex } from 'knex';

/**
 * Migration: Add Financial Data Constraints
 * 
 * This migration adds database-level CHECK constraints to ensure data integrity
 * for financial tables (payments, service_requests, utility_readings).
 * 
 * Issues addressed:
 * 1. Amount precision mismatch - validation allowed larger values than DB could store
 * 2. Missing CHECK constraints - no DB-level enforcement of business rules
 * 3. Invalid utility readings - no enforcement of logical reading relationships
 */
export async function up(knex: Knex): Promise<void> {
  // ============================================
  // PAYMENTS TABLE CONSTRAINTS
  // ============================================
  
  // Ensure payment amount is always positive
  // This prevents accidental negative payments or zero-value entries
  await knex.raw(`
    ALTER TABLE payments 
    ADD CONSTRAINT chk_payment_amount_positive 
    CHECK (amount > 0)
  `);
  
  // Ensure payment amount doesn't exceed DB precision (decimal 10,2 = max 99,999,999.99)
  // This prevents overflow/truncation errors
  await knex.raw(`
    ALTER TABLE payments 
    ADD CONSTRAINT chk_payment_amount_max 
    CHECK (amount <= 99999999.99)
  `);

  // ============================================
  // SERVICE_REQUESTS TABLE CONSTRAINTS
  // ============================================
  
  // Ensure service request cost is always positive
  // Zero or negative costs would corrupt financial summaries
  await knex.raw(`
    ALTER TABLE service_requests 
    ADD CONSTRAINT chk_service_request_cost_positive 
    CHECK (cost > 0)
  `);
  
  // Ensure service request cost doesn't exceed reasonable maximum
  // Matches the 999,999.99 validation in middleware
  await knex.raw(`
    ALTER TABLE service_requests 
    ADD CONSTRAINT chk_service_request_cost_max 
    CHECK (cost <= 999999.99)
  `);

  // ============================================
  // UTILITY_READINGS TABLE CONSTRAINTS
  // ============================================
  
  // Ensure end_date is after start_date
  // Invalid date ranges would produce incorrect billing periods
  await knex.raw(`
    ALTER TABLE utility_readings 
    ADD CONSTRAINT chk_utility_dates_order 
    CHECK (end_date > start_date)
  `);
  
  // Ensure readings are non-negative (meters can't show negative values)
  // Note: We allow end < start to handle meter rollover cases
  await knex.raw(`
    ALTER TABLE utility_readings 
    ADD CONSTRAINT chk_water_start_non_negative 
    CHECK (water_start_reading IS NULL OR water_start_reading >= 0)
  `);
  
  await knex.raw(`
    ALTER TABLE utility_readings 
    ADD CONSTRAINT chk_water_end_non_negative 
    CHECK (water_end_reading IS NULL OR water_end_reading >= 0)
  `);
  
  await knex.raw(`
    ALTER TABLE utility_readings 
    ADD CONSTRAINT chk_electricity_start_non_negative 
    CHECK (electricity_start_reading IS NULL OR electricity_start_reading >= 0)
  `);
  
  await knex.raw(`
    ALTER TABLE utility_readings 
    ADD CONSTRAINT chk_electricity_end_non_negative 
    CHECK (electricity_end_reading IS NULL OR electricity_end_reading >= 0)
  `);
  
  // Ensure that if one reading is provided, both must be provided (no partial readings)
  // This prevents incomplete data that would produce incorrect cost calculations
  await knex.raw(`
    ALTER TABLE utility_readings 
    ADD CONSTRAINT chk_water_readings_complete 
    CHECK (
      (water_start_reading IS NULL AND water_end_reading IS NULL) OR 
      (water_start_reading IS NOT NULL AND water_end_reading IS NOT NULL)
    )
  `);
  
  await knex.raw(`
    ALTER TABLE utility_readings 
    ADD CONSTRAINT chk_electricity_readings_complete 
    CHECK (
      (electricity_start_reading IS NULL AND electricity_end_reading IS NULL) OR 
      (electricity_start_reading IS NOT NULL AND electricity_end_reading IS NOT NULL)
    )
  `);
}

export async function down(knex: Knex): Promise<void> {
  // Remove constraints in reverse order
  
  // Utility readings constraints
  await knex.raw(`ALTER TABLE utility_readings DROP CONSTRAINT IF EXISTS chk_electricity_readings_complete`);
  await knex.raw(`ALTER TABLE utility_readings DROP CONSTRAINT IF EXISTS chk_water_readings_complete`);
  await knex.raw(`ALTER TABLE utility_readings DROP CONSTRAINT IF EXISTS chk_electricity_end_non_negative`);
  await knex.raw(`ALTER TABLE utility_readings DROP CONSTRAINT IF EXISTS chk_electricity_start_non_negative`);
  await knex.raw(`ALTER TABLE utility_readings DROP CONSTRAINT IF EXISTS chk_water_end_non_negative`);
  await knex.raw(`ALTER TABLE utility_readings DROP CONSTRAINT IF EXISTS chk_water_start_non_negative`);
  await knex.raw(`ALTER TABLE utility_readings DROP CONSTRAINT IF EXISTS chk_utility_dates_order`);
  
  // Service requests constraints
  await knex.raw(`ALTER TABLE service_requests DROP CONSTRAINT IF EXISTS chk_service_request_cost_max`);
  await knex.raw(`ALTER TABLE service_requests DROP CONSTRAINT IF EXISTS chk_service_request_cost_positive`);
  
  // Payments constraints
  await knex.raw(`ALTER TABLE payments DROP CONSTRAINT IF EXISTS chk_payment_amount_max`);
  await knex.raw(`ALTER TABLE payments DROP CONSTRAINT IF EXISTS chk_payment_amount_positive`);
}

