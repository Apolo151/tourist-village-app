import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  return knex.schema.createTable('payments', (table) => {
    table.increments('id').primary();
    table.integer('apartment_id').unsigned().notNullable();
    table.integer('booking_id').unsigned().nullable();
    table.integer('created_by').unsigned().notNullable();
    table.decimal('amount', 10, 2).notNullable();
    table.string('currency').notNullable();
    table.integer('method_id').unsigned().notNullable();
    table.enum('user_type', ['owner', 'renter']).notNullable();
    table.date('date').notNullable();
    table.text('description').nullable();
    table.timestamps(true, true);

    // Foreign key constraints
    table.foreign('apartment_id').references('id').inTable('apartments');
    table.foreign('booking_id').references('id').inTable('bookings');
    table.foreign('created_by').references('id').inTable('users');
    table.foreign('method_id').references('id').inTable('payment_methods');
  });
}

export async function down(knex: Knex): Promise<void> {
  return knex.schema.dropTableIfExists('payments');
} 