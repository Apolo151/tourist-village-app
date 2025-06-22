import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  return knex.schema.createTable('emails', (table) => {
    table.increments('id').primary();
    table.integer('apartment_id').unsigned().notNullable();
    table.integer('booking_id').unsigned().nullable();
    table.date('date').notNullable();
    table.string('from').notNullable();
    table.string('to').notNullable();
    table.string('subject').notNullable();
    table.text('content').notNullable();
    table.enum('type', ['complaint', 'inquiry', 'other']).notNullable();
    table.integer('created_by').unsigned().notNullable();
    table.timestamps(true, true);

    // Foreign key constraints
    table.foreign('apartment_id').references('id').inTable('apartments');
    table.foreign('booking_id').references('id').inTable('bookings');
    table.foreign('created_by').references('id').inTable('users');
  });
}

export async function down(knex: Knex): Promise<void> {
  return knex.schema.dropTableIfExists('emails');
} 