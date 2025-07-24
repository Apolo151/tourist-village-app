import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // Add indexes for occupancy rate calculations
  await knex.raw(`
    CREATE INDEX IF NOT EXISTS idx_bookings_apartment_dates 
    ON bookings (apartment_id, arrival_date, leaving_date)
  `);

  await knex.raw(`
    CREATE INDEX IF NOT EXISTS idx_bookings_village_dates 
    ON bookings (arrival_date, leaving_date) 
    WHERE status IN ('Booked', 'Checked In')
  `);

  await knex.raw(`
    CREATE INDEX IF NOT EXISTS idx_bookings_status_dates 
    ON bookings (status, arrival_date, leaving_date)
  `);

  // Composite index for apartment + village filtering
  await knex.raw(`
    CREATE INDEX IF NOT EXISTS idx_apartments_village_phase 
    ON apartments (village_id, phase)
  `);
}

export async function down(knex: Knex): Promise<void> {
  // Remove the indexes
  await knex.raw('DROP INDEX IF EXISTS idx_bookings_apartment_dates');
  await knex.raw('DROP INDEX IF EXISTS idx_bookings_village_dates');
  await knex.raw('DROP INDEX IF EXISTS idx_bookings_status_dates');
  await knex.raw('DROP INDEX IF EXISTS idx_apartments_village_phase');
} 