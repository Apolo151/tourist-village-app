import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // Remove default_assignee_id column from service_types table
  await knex.schema.alterTable('service_types', (table) => {
    table.dropForeign('default_assignee_id');
    table.dropColumn('default_assignee_id');
  });
}

export async function down(knex: Knex): Promise<void> {
  // Add back default_assignee_id column to service_types table
  await knex.schema.alterTable('service_types', (table) => {
    table.integer('default_assignee_id').unsigned().nullable();
    table.foreign('default_assignee_id').references('id').inTable('users');
  });
} 