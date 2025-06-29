import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('emails', (table) => {
    table.enum('status', ['pending', 'completed']).notNullable().defaultTo('pending');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('emails', (table) => {
    table.dropColumn('status');
  });
} 