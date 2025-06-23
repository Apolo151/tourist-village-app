import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  return knex.schema.alterTable('users', (table) => {
    table.string('password_hash').notNullable();
    table.timestamp('last_login').nullable();
    table.boolean('is_active').defaultTo(true).notNullable();
    table.string('refresh_token_hash').nullable();
    table.timestamp('refresh_token_expires_at').nullable();
  });
}

export async function down(knex: Knex): Promise<void> {
  return knex.schema.alterTable('users', (table) => {
    table.dropColumn('password_hash');
    table.dropColumn('last_login');
    table.dropColumn('is_active');
    table.dropColumn('refresh_token_hash');
    table.dropColumn('refresh_token_expires_at');
  });
} 