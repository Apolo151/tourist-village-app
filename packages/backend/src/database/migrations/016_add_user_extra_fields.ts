import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  return knex.schema.alterTable('users', (table) => {
    // Passport fields
    table.string('passport_number').nullable();
    table.date('passport_expiry_date').nullable();
    
    // Address field
    table.text('address').nullable();
    
    // Next of kin fields
    table.string('next_of_kin_name').nullable();
    table.text('next_of_kin_address').nullable();
    table.string('next_of_kin_email').nullable();
    table.string('next_of_kin_phone').nullable();
  });
}

export async function down(knex: Knex): Promise<void> {
  return knex.schema.alterTable('users', (table) => {
    table.dropColumn('passport_number');
    table.dropColumn('passport_expiry_date');
    table.dropColumn('address');
    table.dropColumn('next_of_kin_name');
    table.dropColumn('next_of_kin_address');
    table.dropColumn('next_of_kin_email');
    table.dropColumn('next_of_kin_phone');
  });
} 