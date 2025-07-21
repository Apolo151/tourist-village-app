import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // Add color column to paying_status_types
  await knex.schema.alterTable('paying_status_types', (table) => {
    table.string('color').nullable().defaultTo('default');
  });

  // Add color column to sales_status_types
  await knex.schema.alterTable('sales_status_types', (table) => {
    table.string('color').nullable().defaultTo('default');
  });

  // Set default colors for existing status types
  await knex('paying_status_types').where('name', 'transfer').update({ color: 'success' });
  await knex('paying_status_types').where('name', 'rent').update({ color: 'info' });
  await knex('paying_status_types').where('name', 'non-payer').update({ color: 'error' });
  
  await knex('sales_status_types').where('name', 'for_sale').update({ color: 'warning' });
  await knex('sales_status_types').where('name', 'not_for_sale').update({ color: 'default' });
}

export async function down(knex: Knex): Promise<void> {
  // Remove color column from both tables
  await knex.schema.alterTable('paying_status_types', (table) => {
    table.dropColumn('color');
  });

  await knex.schema.alterTable('sales_status_types', (table) => {
    table.dropColumn('color');
  });
} 