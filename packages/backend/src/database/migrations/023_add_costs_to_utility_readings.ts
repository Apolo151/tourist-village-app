import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  return knex.schema.alterTable('utility_readings', table => {
    table.decimal('water_cost', 10, 2).nullable().comment('Calculated water cost in project currency');
    table.decimal('electricity_cost', 10, 2).nullable().comment('Calculated electricity cost in project currency');
  });
}

export async function down(knex: Knex): Promise<void> {
  return knex.schema.alterTable('utility_readings', table => {
    table.dropColumn('water_cost');
    table.dropColumn('electricity_cost');
  });
}
