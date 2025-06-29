import { Knex } from 'knex';

// New enum values
const NEW_STATUS = ['Booked', 'Checked In', 'Checked Out', 'Cancelled'];
const NEW_USER_TYPE = ['owner', 'tenant'];

// Old enum values and their mapping
const OLD_STATUS = ['not_arrived', 'in_village', 'left'];
const OLD_USER_TYPE = ['owner', 'renter'];

const STATUS_MAP: Record<string, string> = {
  'not_arrived': 'Booked',
  'in_village': 'Checked In',
  'left': 'Checked Out',
};

const USER_TYPE_MAP: Record<string, string> = {
  'owner': 'owner',
  'renter': 'tenant',
};

export async function up(knex: Knex): Promise<void> {
  // 1. Change status enum - using temporary column approach
  await knex.raw(`ALTER TABLE bookings ADD COLUMN status_new TEXT`);
  await knex.raw(`
    UPDATE bookings 
    SET status_new = CASE
      WHEN status = 'not_arrived' THEN 'Booked'
      WHEN status = 'in_village' THEN 'Checked In'
      WHEN status = 'left' THEN 'Checked Out'
      WHEN status = 'Cancelled' THEN 'Cancelled'
      ELSE 'Booked'
    END
  `);
  
  // Create new enum type
  await knex.raw(`CREATE TYPE booking_status_new AS ENUM ('Booked', 'Checked In', 'Checked Out', 'Cancelled')`);
  
  // Drop old column and rename new one
  await knex.raw(`ALTER TABLE bookings DROP COLUMN status`);
  await knex.raw(`ALTER TABLE bookings RENAME COLUMN status_new TO status`);
  
  // Convert to enum
  await knex.raw(`ALTER TABLE bookings ALTER COLUMN status TYPE booking_status_new USING status::booking_status_new`);
  await knex.raw(`ALTER TABLE bookings ALTER COLUMN status SET DEFAULT 'Booked'`);
  
  // Drop old enum type
  await knex.raw(`DROP TYPE booking_status`);

  // 2. Change user_type enum - using temporary column approach
  await knex.raw(`ALTER TABLE bookings ADD COLUMN user_type_new TEXT`);
  await knex.raw(`
    UPDATE bookings 
    SET user_type_new = CASE
      WHEN user_type = 'owner' THEN 'owner'
      WHEN user_type = 'renter' THEN 'tenant'
      ELSE 'tenant'
    END
  `);
  
  // Create new enum type
  await knex.raw(`CREATE TYPE booking_user_type_new AS ENUM ('owner', 'tenant')`);
  
  // Drop old column and rename new one
  await knex.raw(`ALTER TABLE bookings DROP COLUMN user_type`);
  await knex.raw(`ALTER TABLE bookings RENAME COLUMN user_type_new TO user_type`);
  
  // Convert to enum
  await knex.raw(`ALTER TABLE bookings ALTER COLUMN user_type TYPE booking_user_type_new USING user_type::booking_user_type_new`);
  await knex.raw(`ALTER TABLE bookings ALTER COLUMN user_type SET DEFAULT 'tenant'`);
  
  // Drop old enum type
  await knex.raw(`DROP TYPE booking_user_type`);
}

export async function down(knex: Knex): Promise<void> {
  // 1. Revert status enum
  await knex.raw(`ALTER TABLE bookings ADD COLUMN status_old TEXT`);
  await knex.raw(`
    UPDATE bookings 
    SET status_old = CASE
      WHEN status = 'Booked' THEN 'not_arrived'
      WHEN status = 'Checked In' THEN 'in_village'
      WHEN status = 'Checked Out' THEN 'left'
      WHEN status = 'Cancelled' THEN 'Cancelled'
      ELSE 'not_arrived'
    END
  `);
  
  // Create old enum type
  await knex.raw(`CREATE TYPE booking_status_old AS ENUM ('not_arrived', 'in_village', 'left', 'Cancelled')`);
  
  // Drop new column and rename old one
  await knex.raw(`ALTER TABLE bookings DROP COLUMN status`);
  await knex.raw(`ALTER TABLE bookings RENAME COLUMN status_old TO status`);
  
  // Convert to enum
  await knex.raw(`ALTER TABLE bookings ALTER COLUMN status TYPE booking_status_old USING status::booking_status_old`);
  await knex.raw(`ALTER TABLE bookings ALTER COLUMN status SET DEFAULT 'not_arrived'`);
  
  // Drop new enum type
  await knex.raw(`DROP TYPE booking_status_new`);

  // 2. Revert user_type enum
  await knex.raw(`ALTER TABLE bookings ADD COLUMN user_type_old TEXT`);
  await knex.raw(`
    UPDATE bookings 
    SET user_type_old = CASE
      WHEN user_type = 'owner' THEN 'owner'
      WHEN user_type = 'tenant' THEN 'renter'
      ELSE 'renter'
    END
  `);
  
  // Create old enum type
  await knex.raw(`CREATE TYPE booking_user_type_old AS ENUM ('owner', 'renter')`);
  
  // Drop new column and rename old one
  await knex.raw(`ALTER TABLE bookings DROP COLUMN user_type`);
  await knex.raw(`ALTER TABLE bookings RENAME COLUMN user_type_old TO user_type`);
  
  // Convert to enum
  await knex.raw(`ALTER TABLE bookings ALTER COLUMN user_type TYPE booking_user_type_old USING user_type::booking_user_type_old`);
  await knex.raw(`ALTER TABLE bookings ALTER COLUMN user_type SET DEFAULT 'renter'`);
  
  // Drop new enum type
  await knex.raw(`DROP TYPE booking_user_type_new`);
} 