import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  return knex.schema.createTable('service_requests', (table) => {
    table.increments('id').primary();
    table.integer('type_id').unsigned().notNullable();
    table.integer('apartment_id').unsigned().notNullable();
    table.integer('booking_id').unsigned().nullable();
    table.integer('requester_id').unsigned().notNullable();
    table.timestamp('date_action').nullable();
    table.timestamp('date_created').notNullable().defaultTo(knex.fn.now());
    table.string('status').notNullable().defaultTo('pending');
    table.enum('who_pays', ['owner', 'renter', 'company']).notNullable();
    table.text('notes').nullable();
    table.integer('assignee_id').unsigned().nullable();
    table.integer('created_by').unsigned().notNullable();
    table.timestamps(true, true);

    // Foreign key constraints
    table.foreign('type_id').references('id').inTable('service_types');
    table.foreign('apartment_id').references('id').inTable('apartments');
    table.foreign('booking_id').references('id').inTable('bookings');
    table.foreign('requester_id').references('id').inTable('users');
    table.foreign('assignee_id').references('id').inTable('users');
    table.foreign('created_by').references('id').inTable('users');
  });
}

export async function down(knex: Knex): Promise<void> {
  return knex.schema.dropTableIfExists('service_requests');
} 