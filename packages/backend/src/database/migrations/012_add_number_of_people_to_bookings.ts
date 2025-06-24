import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  return knex.schema.alterTable('bookings', (table) => {
    table.integer('number_of_people').unsigned().notNullable().defaultTo(1);
  });
}

export async function down(knex: Knex): Promise<void> {
  return knex.schema.alterTable('bookings', (table) => {
    table.dropColumn('number_of_people');
  });
} 