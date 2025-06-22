import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  return knex.schema.createTable('apartments', (table) => {
    table.increments('id').primary();
    table.string('name').notNullable();
    table.integer('village_id').unsigned().notNullable();
    table.integer('phase').notNullable();
    table.integer('owner_id').unsigned().notNullable();
    table.date('purchase_date').nullable();
    table.enum('paying_status', ['transfer', 'rent', 'non-payer']).notNullable();
    table.timestamps(true, true);

    // Foreign key constraints
    table.foreign('village_id').references('id').inTable('villages');
    table.foreign('owner_id').references('id').inTable('users');
  });
}

export async function down(knex: Knex): Promise<void> {
  return knex.schema.dropTableIfExists('apartments');
} 