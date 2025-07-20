import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  return knex.schema.createTable('user_villages', (table) => {
    table.increments('id').primary();
    table.integer('user_id').unsigned().notNullable();
    table.integer('village_id').unsigned().notNullable();
    table.timestamps(true, true);

    // Foreign key constraints
    table.foreign('user_id').references('id').inTable('users');
    table.foreign('village_id').references('id').inTable('villages');

    // Composite unique constraint
    table.unique(['user_id', 'village_id']);
  });
}

export async function down(knex: Knex): Promise<void> {
  return knex.schema.dropTableIfExists('user_villages');
} 