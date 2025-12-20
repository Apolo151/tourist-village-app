import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // Update the materialized view to include 'Booked' status
  await knex.raw('DROP MATERIALIZED VIEW IF EXISTS apartment_status_view');
  
  await knex.raw(`
    CREATE MATERIALIZED VIEW apartment_status_view AS
    SELECT
      a.id AS apartment_id,
      CASE
        WHEN b.id IS NULL THEN 'Available'
        WHEN b.status = 'Booked' THEN 'Booked'
        WHEN b.user_type = 'owner' THEN 'Occupied by Owner'
        ELSE 'Occupied by Tenant'
      END AS status
    FROM apartments a
    LEFT JOIN LATERAL (
      SELECT * FROM bookings b
      WHERE b.apartment_id = a.id
        AND b.arrival_date <= NOW()
        AND b.leaving_date > NOW()
        AND b.status IN ('Booked', 'Checked In')
      ORDER BY b.arrival_date DESC
      LIMIT 1
    ) b ON TRUE;
  `);

  // Re-create indexes
  await knex.raw(`CREATE INDEX IF NOT EXISTS idx_apartment_status_view_status ON apartment_status_view (status)`);
  await knex.raw(`CREATE INDEX IF NOT EXISTS idx_apartment_status_view_apartment_id ON apartment_status_view (apartment_id)`);
}

export async function down(knex: Knex): Promise<void> {
  // Revert to original logic (no 'Booked' check, and back to >=)
  await knex.raw('DROP MATERIALIZED VIEW IF EXISTS apartment_status_view');
  
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

  await knex.raw(`CREATE INDEX IF NOT EXISTS idx_apartment_status_view_status ON apartment_status_view (status)`);
  await knex.raw(`CREATE INDEX IF NOT EXISTS idx_apartment_status_view_apartment_id ON apartment_status_view (apartment_id)`);
}

