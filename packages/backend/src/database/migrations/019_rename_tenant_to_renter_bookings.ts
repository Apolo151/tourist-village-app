import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // 1. Add a temporary TEXT column for user_type
  await knex.raw(`ALTER TABLE bookings ADD COLUMN user_type_tmp TEXT`);

  // 2. Copy current values as TEXT
  await knex.raw(`UPDATE bookings SET user_type_tmp = user_type::text`);

  // 3. Normalize casing and update values: 'tenant' (any case) -> 'renter', keep 'owner' as is
  await knex.raw(`
    UPDATE bookings
    SET user_type_tmp = CASE
      WHEN LOWER(user_type_tmp) = 'tenant' THEN 'renter'
      ELSE LOWER(user_type_tmp)
    END
  `);

  // 4. Create new enum type with 'owner' and 'renter'
  await knex.raw(`CREATE TYPE booking_user_type_tmp AS ENUM ('owner', 'renter')`);

  // 5. Drop the old user_type column and rename the temp column
  await knex.raw(`ALTER TABLE bookings DROP COLUMN user_type`);
  await knex.raw(`ALTER TABLE bookings RENAME COLUMN user_type_tmp TO user_type`);

  // 6. Convert to enum
  await knex.raw(`ALTER TABLE bookings ALTER COLUMN user_type TYPE booking_user_type_tmp USING user_type::booking_user_type_tmp`);
  await knex.raw(`ALTER TABLE bookings ALTER COLUMN user_type SET DEFAULT 'renter'`);

  // 7. Drop the old enum type
  await knex.raw(`DROP TYPE IF EXISTS booking_user_type_new`);
}

export async function down(knex: Knex): Promise<void> {
  // 1. Add a temporary TEXT column for user_type
  await knex.raw(`ALTER TABLE bookings ADD COLUMN user_type_tmp TEXT`);

  // 2. Copy current values as TEXT
  await knex.raw(`UPDATE bookings SET user_type_tmp = user_type::text`);

  // 3. Normalize casing and update values: 'renter' (any case) -> 'tenant', keep 'owner' as is
  await knex.raw(`
    UPDATE bookings
    SET user_type_tmp = CASE
      WHEN LOWER(user_type_tmp) = 'renter' THEN 'tenant'
      ELSE LOWER(user_type_tmp)
    END
  `);

  // 4. Create enum type with 'owner' and 'tenant'
  await knex.raw(`CREATE TYPE booking_user_type_new AS ENUM ('owner', 'tenant')`);

  // 5. Drop the old user_type column and rename the temp column
  await knex.raw(`ALTER TABLE bookings DROP COLUMN user_type`);
  await knex.raw(`ALTER TABLE bookings RENAME COLUMN user_type_tmp TO user_type`);

  // 6. Convert to enum
  await knex.raw(`ALTER TABLE bookings ALTER COLUMN user_type TYPE booking_user_type_new USING user_type::booking_user_type_new`);
  await knex.raw(`ALTER TABLE bookings ALTER COLUMN user_type SET DEFAULT 'tenant'`);

  // 7. Drop the old enum type
  await knex.raw(`DROP TYPE IF EXISTS booking_user_type_tmp`);
}