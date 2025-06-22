import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  return knex.schema.createTable('payment_methods', (table) => {
    table.increments('id').primary();
    table.string('name').notNullable();
    table.integer('created_by').unsigned().notNullable();
    table.timestamps(true, true);

    // Foreign key constraints
    table.foreign('created_by').references('id').inTable('users');
  });
}

export async function down(knex: Knex): Promise<void> {
  return knex.schema.dropTableIfExists('payment_methods');
} 