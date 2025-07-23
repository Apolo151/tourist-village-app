import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // Create the currency enum type if it doesn't exist
  await knex.raw(`
    DO $$ BEGIN
      CREATE TYPE service_request_currency AS ENUM ('EGP', 'GBP');
    EXCEPTION
      WHEN duplicate_object THEN null;
    END $$;
  `);

  // Add cost and currency columns to service_requests table
  await knex.schema.alterTable('service_requests', (table) => {
    table.decimal('cost', 10, 2).nullable();
    table.specificType('currency', 'service_request_currency').nullable();
  });

  // Populate existing service requests with default cost from village-specific pricing
  const serviceRequests = await knex('service_requests as sr')
    .join('apartments as a', 'sr.apartment_id', 'a.id')
    .join('service_type_village_prices as stvp', function() {
      this.on('sr.type_id', '=', 'stvp.service_type_id')
          .andOn('a.village_id', '=', 'stvp.village_id');
    })
    .select(
      'sr.id as service_request_id',
      'stvp.cost',
      'stvp.currency'
    );

  // Update each service request with its corresponding village-specific pricing
  for (const sr of serviceRequests) {
    await knex('service_requests')
      .where('id', sr.service_request_id)
      .update({
        cost: sr.cost,
        currency: sr.currency
      });
  }

  // Make the fields not nullable after populating with default values
  await knex.raw(`
    ALTER TABLE service_requests 
    ALTER COLUMN cost SET NOT NULL,
    ALTER COLUMN currency SET NOT NULL;
  `);
}

export async function down(knex: Knex): Promise<void> {
  // Remove cost and currency columns from service_requests table
  await knex.schema.alterTable('service_requests', (table) => {
    table.dropColumn('cost');
    table.dropColumn('currency');
  });

  // Drop the enum type
  await knex.raw('DROP TYPE IF EXISTS service_request_currency;');
}

