import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // Get all admin users with responsible_village set
  const users = await knex('users')
    .select('id', 'responsible_village')
    .where('role', 'admin')
    .whereNotNull('responsible_village');
  
  // Insert entries into user_villages table
  if (users.length > 0) {
    const entries = users.map(user => ({
      user_id: user.id,
      village_id: user.responsible_village,
      created_at: new Date(),
      updated_at: new Date()
    }));
    
    await knex('user_villages').insert(entries);
    
    console.log(`Migration: Added ${entries.length} entries to user_villages table from existing responsible_village values`);
  }
}

export async function down(knex: Knex): Promise<void> {
  // Cannot revert this migration as it's not possible to know which entries
  // were added by this migration vs. added later
  console.log('Migration: Cannot revert population of user_villages table');
} 