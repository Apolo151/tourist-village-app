import { Knex } from 'knex';

export async function seed(knex: Knex): Promise<void> {
  // Check if villages already exist
  const existingVillages = await knex('villages').first();

  if (existingVillages) {
    console.log('Villages already exist, skipping seed');
    return;
  }

  // Insert sample villages
  await knex('villages').insert([
    {
      name: 'Village A',
      electricity_price: 1.5,
      water_price: 2.0,
      phases: 3,
      created_by: 1, // Super admin
      created_at: new Date(),
      updated_at: new Date()
    },
    {
      name: 'Village B',
      electricity_price: 1.8,
      water_price: 2.5,
      phases: 2,
      created_by: 1, // Super admin
      created_at: new Date(),
      updated_at: new Date()
    },
    {
      name: 'Village C',
      electricity_price: 1.2,
      water_price: 1.8,
      phases: 4,
      created_by: 1, // Super admin
      created_at: new Date(),
      updated_at: new Date()
    }
  ]);

  console.log('🏘️  Sample villages created successfully!');
  console.log('📋 Created 3 sample villages: Village A, Village B, Village C');
}

export default seed; 