import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  return knex.schema.alterTable('bookings', (table) => {
    table.string('person_name').nullable();
  });
}

export async function down(knex: Knex): Promise<void> {
  return knex.schema.alterTable('bookings', (table) => {
    table.dropColumn('person_name');
  });
} 