import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // Update the service_requests table to use specific status values
  await knex.schema.alterTable('service_requests', (table) => {
    table.dropColumn('status');
  });
  
  await knex.schema.alterTable('service_requests', (table) => {
    table.enum('status', ['Created', 'In Progress', 'Done']).notNullable().defaultTo('Created');
  });
}

export async function down(knex: Knex): Promise<void> {
  // Revert to the previous status column
  await knex.schema.alterTable('service_requests', (table) => {
    table.dropColumn('status');
  });
  
  await knex.schema.alterTable('service_requests', (table) => {
    table.string('status').notNullable().defaultTo('pending');
  });
} 