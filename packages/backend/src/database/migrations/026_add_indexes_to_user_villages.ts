import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  return knex.schema.alterTable('user_villages', (table) => {
    // Add indexes for better query performance
    table.index('user_id');
    table.index('village_id');
  });
}

export async function down(knex: Knex): Promise<void> {
  return knex.schema.alterTable('user_villages', (table) => {
    // Remove indexes
    table.dropIndex('user_id');
    table.dropIndex('village_id');
  });
} 