import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  return knex.schema.createTable('villages', (table) => {
    table.increments('id').primary();
    table.string('name').notNullable();
    table.decimal('electricity_price', 10, 4).notNullable();
    table.decimal('gas_price', 10, 4).notNullable();
    table.integer('phases').notNullable();
    table.timestamps(true, true);
  });
}

export async function down(knex: Knex): Promise<void> {
  return knex.schema.dropTableIfExists('villages');
} 