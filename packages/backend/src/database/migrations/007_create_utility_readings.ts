import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  return knex.schema.createTable('utility_readings', (table) => {
    table.increments('id').primary();
    table.integer('booking_id').unsigned().nullable();
    table.integer('apartment_id').unsigned().notNullable();
    table.decimal('water_start_reading', 10, 2).nullable();
    table.decimal('water_end_reading', 10, 2).nullable();
    table.decimal('electricity_start_reading', 10, 2).nullable();
    table.decimal('electricity_end_reading', 10, 2).nullable();
    table.date('start_date').notNullable();
    table.date('end_date').notNullable();
    table.enum('who_pays', ['owner', 'renter', 'company']).notNullable();
    table.integer('created_by').unsigned().notNullable();
    table.timestamps(true, true);

    // Foreign key constraints
    table.foreign('booking_id').references('id').inTable('bookings');
    table.foreign('apartment_id').references('id').inTable('apartments');
    table.foreign('created_by').references('id').inTable('users');
  });
}

export async function down(knex: Knex): Promise<void> {
  return knex.schema.dropTableIfExists('utility_readings');
} 