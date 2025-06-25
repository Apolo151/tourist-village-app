import { Knex } from 'knex';
import bcrypt from 'bcrypt';

export async function seed(knex: Knex): Promise<void> {
  // Check if super admin already exists
  const existingAdmin = await knex('users')
    .where('email', 'admin@touristvillage.com')
    .first();

  if (existingAdmin) {
    console.log('Super admin already exists, skipping seed');
    return;
  }

  // Hash the default password
  const defaultPassword = 'superadmin';
  const passwordHash = await bcrypt.hash(defaultPassword, 12);

  // Insert the super admin user
  await knex('users').insert({
    name: 'Super Administrator',
    email: 'admin@touristvillage.com',
    phone_number: '+1234567890',
    role: 'super_admin',
    password_hash: passwordHash,
    is_active: true,
    created_at: new Date(),
    updated_at: new Date()
  });

  console.log('🔑 Super admin user created successfully!');
  console.log('📧 Email: admin@touristvillage.com');
  console.log('🔒 Password: superadmin');
  console.log('⚠️  IMPORTANT: Change this password immediately after first login!');
} 