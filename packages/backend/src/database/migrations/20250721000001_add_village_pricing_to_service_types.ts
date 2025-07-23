import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // Create service_type_village_prices table for village-specific pricing
  await knex.schema.createTable('service_type_village_prices', (table) => {
    table.increments('id').primary();
    table.integer('service_type_id').unsigned().notNullable();
    table.integer('village_id').unsigned().notNullable();
    table.decimal('cost', 10, 2).notNullable();
    table.enum('currency', ['EGP', 'GBP']).notNullable();
    table.timestamps(true, true);

    // Foreign key constraints
    table.foreign('service_type_id').references('id').inTable('service_types').onDelete('CASCADE');
    table.foreign('village_id').references('id').inTable('villages').onDelete('CASCADE');
    
    // Unique constraint to prevent duplicate pricing for same service type and village
    table.unique(['service_type_id', 'village_id']);
  });

  // Migrate existing service types to have village-specific pricing
  // First, get all existing service types and villages
  const serviceTypes = await knex('service_types').select('*');
  const villages = await knex('villages').select('*');

  // Create village-specific pricing for each service type in each village
  for (const serviceType of serviceTypes) {
    for (const village of villages) {
      await knex('service_type_village_prices').insert({
        service_type_id: serviceType.id,
        village_id: village.id,
        cost: serviceType.cost,
        currency: serviceType.currency,
        created_at: new Date(),
        updated_at: new Date()
      });
    }
  }

  // Remove cost and currency columns from service_types table (they're now in the junction table)
  await knex.schema.alterTable('service_types', (table) => {
    table.dropColumn('cost');
    table.dropColumn('currency');
  });
}

export async function down(knex: Knex): Promise<void> {
  // Add back cost and currency columns to service_types
  await knex.schema.alterTable('service_types', (table) => {
    table.decimal('cost', 10, 2).nullable();
    table.enum('currency', ['EGP', 'GBP']).nullable();
  });

  // Migrate data back from junction table to service_types (use first village's pricing as default)
  const serviceTypes = await knex('service_types').select('*');
  
  for (const serviceType of serviceTypes) {
    const firstPrice = await knex('service_type_village_prices')
      .where('service_type_id', serviceType.id)
      .first();
    
    if (firstPrice) {
      await knex('service_types')
        .where('id', serviceType.id)
        .update({
          cost: firstPrice.cost,
          currency: firstPrice.currency
        });
    }
  }

  // Drop the junction table
  await knex.schema.dropTableIfExists('service_type_village_prices');
} 