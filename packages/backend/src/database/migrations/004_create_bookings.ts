import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  return knex.schema.createTable('bookings', (table) => {
    table.increments('id').primary();
    table.integer('apartment_id').unsigned().notNullable();
    table.integer('user_id').unsigned().notNullable();
    table.enum('user_type', ['owner', 'renter']).notNullable();
    table.timestamp('arrival').notNullable();
    table.timestamp('leaving').notNullable();
    table.enum('status', ['not_arrived', 'in_village', 'left']).notNullable().defaultTo('not_arrived');
    table.text('notes').nullable();
    table.timestamps(true, true);

    // Foreign key constraints
    table.foreign('apartment_id').references('id').inTable('apartments');
    table.foreign('user_id').references('id').inTable('users');
  });
}

export async function down(knex: Knex): Promise<void> {
  return knex.schema.dropTableIfExists('bookings');
} 