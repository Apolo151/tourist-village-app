import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // Create the materialized view for apartment status
  await knex.raw(`
    CREATE MATERIALIZED VIEW apartment_status_view AS
    SELECT
      a.id AS apartment_id,
      CASE
        WHEN b.id IS NULL THEN 'Available'
        WHEN b.user_type = 'owner' THEN 'Occupied by Owner'
        ELSE 'Occupied by Tenant'
      END AS status
    FROM apartments a
    LEFT JOIN LATERAL (
      SELECT * FROM bookings b
      WHERE b.apartment_id = a.id
        AND b.arrival_date <= NOW()
        AND b.leaving_date >= NOW()
        AND b.status IN ('Booked', 'Checked In')
      ORDER BY b.arrival_date DESC
      LIMIT 1
    ) b ON TRUE;
  `);
  // Index for fast filtering
  await knex.raw(`CREATE INDEX IF NOT EXISTS idx_apartment_status_view_status ON apartment_status_view (status)`);
  await knex.raw(`CREATE INDEX IF NOT EXISTS idx_apartment_status_view_apartment_id ON apartment_status_view (apartment_id)`);
}

export async function down(knex: Knex): Promise<void> {
  await knex.raw('DROP MATERIALIZED VIEW IF EXISTS apartment_status_view');
  await knex.raw('DROP INDEX IF EXISTS idx_apartment_status_view_status');
  await knex.raw('DROP INDEX IF EXISTS idx_apartment_status_view_apartment_id');
} 