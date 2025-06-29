import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('apartments', (table) => {
    table.enum('sales_status', ['for sale', 'not for sale']).notNullable().defaultTo('not for sale');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('apartments', (table) => {
    table.dropColumn('sales_status');
  });
} 