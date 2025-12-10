import { Knex } from 'knex';

/**
 * Indexes to speed up the optimized invoices summary query
 * - payments: apartment/date/currency
 * - service_requests: apartment/date/currency/who_pays
 * - utility_readings: apartment/date
 * - apartments: owner/village
 * - bookings: apartment/user/user_type (used in filters)
 */
export async function up(knex: Knex): Promise<void> {
  await knex.raw(`CREATE INDEX IF NOT EXISTS idx_payments_apartment_date ON payments (apartment_id, date)`);
  await knex.raw(`CREATE INDEX IF NOT EXISTS idx_payments_apartment_currency ON payments (apartment_id, currency)`);

  await knex.raw(`CREATE INDEX IF NOT EXISTS idx_service_requests_apartment_dates ON service_requests (apartment_id, date_action, date_created)`);
  await knex.raw(`CREATE INDEX IF NOT EXISTS idx_service_requests_apartment_currency ON service_requests (apartment_id, currency)`);
  await knex.raw(`CREATE INDEX IF NOT EXISTS idx_service_requests_who_pays ON service_requests (who_pays)`);

  await knex.raw(`CREATE INDEX IF NOT EXISTS idx_utility_readings_apartment_created ON utility_readings (apartment_id, created_at)`);

  await knex.raw(`CREATE INDEX IF NOT EXISTS idx_apartments_owner_village ON apartments (owner_id, village_id)`);

  await knex.raw(`CREATE INDEX IF NOT EXISTS idx_bookings_apartment_user_type ON bookings (apartment_id, user_id, user_type)`);
}

export async function down(knex: Knex): Promise<void> {
  await knex.raw(`DROP INDEX IF EXISTS idx_payments_apartment_date`);
  await knex.raw(`DROP INDEX IF EXISTS idx_payments_apartment_currency`);

  await knex.raw(`DROP INDEX IF EXISTS idx_service_requests_apartment_dates`);
  await knex.raw(`DROP INDEX IF EXISTS idx_service_requests_apartment_currency`);
  await knex.raw(`DROP INDEX IF EXISTS idx_service_requests_who_pays`);

  await knex.raw(`DROP INDEX IF EXISTS idx_utility_readings_apartment_created`);

  await knex.raw(`DROP INDEX IF EXISTS idx_apartments_owner_village`);

  await knex.raw(`DROP INDEX IF EXISTS idx_bookings_apartment_user_type`);
}

