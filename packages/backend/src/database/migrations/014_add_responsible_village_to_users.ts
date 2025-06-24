import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  return knex.schema.alterTable('users', (table) => {
    table.integer('responsible_village').unsigned().nullable();
    table.foreign('responsible_village').references('id').inTable('villages');
  });
}

export async function down(knex: Knex): Promise<void> {
  return knex.schema.alterTable('users', (table) => {
    table.dropForeign(['responsible_village']);
    table.dropColumn('responsible_village');
  });
} 