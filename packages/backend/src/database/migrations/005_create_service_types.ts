import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  return knex.schema.createTable('service_types', (table) => {
    table.increments('id').primary();
    table.string('name').notNullable();
    table.decimal('cost', 10, 2).notNullable();
    table.enum('currency', ['EGP', 'GBP']).notNullable();
    table.text('description').nullable();
    table.integer('default_assignee_id').unsigned().nullable();
    table.timestamps(true, true);

    // Foreign key constraints
    table.foreign('default_assignee_id').references('id').inTable('users');
  });
}

export async function down(knex: Knex): Promise<void> {
  return knex.schema.dropTableIfExists('service_types');
} 