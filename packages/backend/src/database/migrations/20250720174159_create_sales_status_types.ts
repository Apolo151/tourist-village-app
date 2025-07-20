import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // 1. Create the sales_status_types table
  await knex.schema.createTable('sales_status_types', (table) => {
    table.increments('id').primary();
    table.string('name').notNullable().unique();
    table.string('display_name').notNullable();
    table.text('description').nullable();
    table.boolean('is_active').notNullable().defaultTo(true);
    table.integer('created_by').unsigned().nullable();
    table.timestamps(true, true);

    // Foreign key constraints
    table.foreign('created_by').references('id').inTable('users').onDelete('SET NULL');
  });

  // 2. Insert the existing enum values as records
  await knex('sales_status_types').insert([
    { 
      name: 'for_sale', 
      display_name: 'For Sale', 
      description: 'Property is available for sale',
      created_at: new Date(),
      updated_at: new Date()
    },
    { 
      name: 'not_for_sale', 
      display_name: 'Not For Sale', 
      description: 'Property is not available for sale',
      created_at: new Date(),
      updated_at: new Date()
    }
  ]);

  // 3. Add a new column to reference the sales_status_types table
  await knex.schema.alterTable('apartments', (table) => {
    table.integer('sales_status_id').unsigned().nullable();
    table.foreign('sales_status_id').references('id').inTable('sales_status_types').onDelete('RESTRICT');
  });

  // 4. Migrate existing data
  const apartments = await knex('apartments').select('id', 'sales_status');
  const statusTypes = await knex('sales_status_types').select('id', 'name');
  
  // Create a mapping of status name to id
  const statusMap: Record<string, number> = {};
  statusTypes.forEach((status: any) => {
    // Convert 'for sale' to 'for_sale' and 'not for sale' to 'not_for_sale'
    const normalizedName = status.name.replace(/-/g, '_');
    statusMap[normalizedName] = status.id;
  });

  // Update each apartment with the corresponding status id
  for (const apartment of apartments) {
    // Convert 'for sale' to 'for_sale' and 'not for sale' to 'not_for_sale'
    const normalizedStatus = apartment.sales_status ? apartment.sales_status.replace(/ /g, '_') : 'not_for_sale';
    await knex('apartments')
      .where('id', apartment.id)
      .update({
        sales_status_id: statusMap[normalizedStatus]
      });
  }

  // 5. Make the new column required
  await knex.schema.alterTable('apartments', (table) => {
    table.integer('sales_status_id').notNullable().alter();
  });

  // 6. Drop the old enum column
  await knex.schema.alterTable('apartments', (table) => {
    table.dropColumn('sales_status');
  });
}

export async function down(knex: Knex): Promise<void> {
  // 1. Add back the enum column
  await knex.schema.alterTable('apartments', (table) => {
    table.enum('sales_status', ['for sale', 'not for sale']).nullable();
  });

  // 2. Migrate data back to the enum column
  const apartments = await knex('apartments').select('id', 'sales_status_id');
  const statusTypes = await knex('sales_status_types').select('id', 'name');
  
  // Create a mapping of status id to name
  const statusMap: Record<number, string> = {};
  statusTypes.forEach((status: any) => {
    // Convert 'for_sale' back to 'for sale' and 'not_for_sale' back to 'not for sale'
    const displayName = status.name === 'for_sale' ? 'for sale' : 'not for sale';
    statusMap[status.id] = displayName;
  });

  // Update each apartment with the corresponding status name
  for (const apartment of apartments) {
    await knex('apartments')
      .where('id', apartment.id)
      .update({
        sales_status: statusMap[apartment.sales_status_id]
      });
  }

  // 3. Make the enum column required
  await knex.schema.alterTable('apartments', (table) => {
    table.enum('sales_status', ['for sale', 'not for sale']).notNullable().alter();
  });

  // 4. Drop the foreign key column
  await knex.schema.alterTable('apartments', (table) => {
    table.dropColumn('sales_status_id');
  });

  // 5. Drop the sales_status_types table
  await knex.schema.dropTableIfExists('sales_status_types');
}

