import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // 1. Create the paying_status_types table
  await knex.schema.createTable('paying_status_types', (table) => {
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
  await knex('paying_status_types').insert([
    { 
      name: 'transfer', 
      display_name: 'Paid By Owner', 
      description: 'Payment is handled by the owner via bank transfer',
      created_at: new Date(),
      updated_at: new Date()
    },
    { 
      name: 'rent', 
      display_name: 'Paid By Tenant', 
      description: 'Payment is handled by the tenant/renter',
      created_at: new Date(),
      updated_at: new Date()
    },
    { 
      name: 'non-payer', 
      display_name: 'Non-Payer', 
      description: 'No payment is required',
      created_at: new Date(),
      updated_at: new Date()
    }
  ]);

  // 3. Add a new column to reference the paying_status_types table
  await knex.schema.alterTable('apartments', (table) => {
    table.integer('paying_status_id').unsigned().nullable();
    table.foreign('paying_status_id').references('id').inTable('paying_status_types').onDelete('RESTRICT');
  });

  // 4. Migrate existing data
  const apartments = await knex('apartments').select('id', 'paying_status');
  const statusTypes = await knex('paying_status_types').select('id', 'name');
  
  // Create a mapping of status name to id
  const statusMap: Record<string, number> = {};
  statusTypes.forEach((status: any) => {
    statusMap[status.name] = status.id;
  });

  // Update each apartment with the corresponding status id
  for (const apartment of apartments) {
    await knex('apartments')
      .where('id', apartment.id)
      .update({
        paying_status_id: statusMap[apartment.paying_status]
      });
  }

  // 5. Make the new column required
  await knex.schema.alterTable('apartments', (table) => {
    table.integer('paying_status_id').notNullable().alter();
  });

  // 6. Drop the old enum column
  await knex.schema.alterTable('apartments', (table) => {
    table.dropColumn('paying_status');
  });
}

export async function down(knex: Knex): Promise<void> {
  // 1. Add back the enum column
  await knex.schema.alterTable('apartments', (table) => {
    table.enum('paying_status', ['transfer', 'rent', 'non-payer']).nullable();
  });

  // 2. Migrate data back to the enum column
  const apartments = await knex('apartments').select('id', 'paying_status_id');
  const statusTypes = await knex('paying_status_types').select('id', 'name');
  
  // Create a mapping of status id to name
  const statusMap: Record<number, string> = {};
  statusTypes.forEach((status: any) => {
    statusMap[status.id] = status.name;
  });

  // Update each apartment with the corresponding status name
  for (const apartment of apartments) {
    await knex('apartments')
      .where('id', apartment.id)
      .update({
        paying_status: statusMap[apartment.paying_status_id]
      });
  }

  // 3. Make the enum column required
  await knex.schema.alterTable('apartments', (table) => {
    table.enum('paying_status', ['transfer', 'rent', 'non-payer']).notNullable().alter();
  });

  // 4. Drop the foreign key column
  await knex.schema.alterTable('apartments', (table) => {
    table.dropColumn('paying_status_id');
  });

  // 5. Drop the paying_status_types table
  await knex.schema.dropTableIfExists('paying_status_types');
}

