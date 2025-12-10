import { Knex } from 'knex';

/**
 * Migration: Add indexes to users table for optimized search and filtering
 * 
 * This migration adds various indexes to improve query performance for:
 * - Text search on name, email, and phone_number (with ILIKE)
 * - Filtering by is_active, role, and responsible_village
 * - Sorting by created_at
 * - Combined filters (common query patterns)
 */
export async function up(knex: Knex): Promise<void> {
  // Enable pg_trgm extension for trigram-based text search (better ILIKE performance)
  await knex.raw('CREATE EXTENSION IF NOT EXISTS pg_trgm');

  // ============================================================================
  // TEXT SEARCH INDEXES (for ILIKE queries on name, email, phone_number)
  // ============================================================================
  
  // GIN index with pg_trgm for name (supports ILIKE '%search%')
  await knex.raw(`
    CREATE INDEX IF NOT EXISTS idx_users_name_trgm 
    ON users USING gin (name gin_trgm_ops)
  `);
  
  // GIN index with pg_trgm for email (supports ILIKE '%search%')
  await knex.raw(`
    CREATE INDEX IF NOT EXISTS idx_users_email_trgm 
    ON users USING gin (email gin_trgm_ops)
  `);
  
  // GIN index with pg_trgm for phone_number (supports ILIKE '%search%')
  await knex.raw(`
    CREATE INDEX IF NOT EXISTS idx_users_phone_trgm 
    ON users USING gin (phone_number gin_trgm_ops)
  `);
  
  // ============================================================================
  // FILTER INDEXES (for exact matches and WHERE clauses)
  // ============================================================================
  
  // B-tree index for is_active filter
  await knex.raw(`
    CREATE INDEX IF NOT EXISTS idx_users_is_active 
    ON users (is_active)
  `);
  
  // B-tree index for role filter
  await knex.raw(`
    CREATE INDEX IF NOT EXISTS idx_users_role 
    ON users (role)
  `);
  
  // B-tree index for responsible_village (used in village filtering)
  await knex.raw(`
    CREATE INDEX IF NOT EXISTS idx_users_responsible_village 
    ON users (responsible_village)
  `);
  
  // B-tree index for created_at (used for sorting and date filtering)
  await knex.raw(`
    CREATE INDEX IF NOT EXISTS idx_users_created_at 
    ON users (created_at DESC)
  `);
  
  // ============================================================================
  // COMPOSITE INDEXES (for common combined queries)
  // ============================================================================
  
  // Composite index for active users by role (common filter combination)
  await knex.raw(`
    CREATE INDEX IF NOT EXISTS idx_users_is_active_role 
    ON users (is_active, role)
  `);
  
  // Composite index for village filtering with active status
  await knex.raw(`
    CREATE INDEX IF NOT EXISTS idx_users_village_active 
    ON users (responsible_village, is_active)
  `);
  
  // Composite index for role and created_at (for sorted role-based queries)
  await knex.raw(`
    CREATE INDEX IF NOT EXISTS idx_users_role_created 
    ON users (role, created_at DESC)
  `);

  // ============================================================================
  // ANALYZE TABLE (update statistics for query planner)
  // ============================================================================
  await knex.raw('ANALYZE users');
}

export async function down(knex: Knex): Promise<void> {
  // Remove all indexes created in the up migration
  await knex.raw('DROP INDEX IF EXISTS idx_users_name_trgm');
  await knex.raw('DROP INDEX IF EXISTS idx_users_email_trgm');
  await knex.raw('DROP INDEX IF EXISTS idx_users_phone_trgm');
  await knex.raw('DROP INDEX IF EXISTS idx_users_is_active');
  await knex.raw('DROP INDEX IF EXISTS idx_users_role');
  await knex.raw('DROP INDEX IF EXISTS idx_users_responsible_village');
  await knex.raw('DROP INDEX IF EXISTS idx_users_created_at');
  await knex.raw('DROP INDEX IF EXISTS idx_users_is_active_role');
  await knex.raw('DROP INDEX IF EXISTS idx_users_village_active');
  await knex.raw('DROP INDEX IF EXISTS idx_users_role_created');
  
  // Note: We don't drop the pg_trgm extension as it might be used by other tables
  // If you need to drop it, uncomment the line below:
  // await knex.raw('DROP EXTENSION IF EXISTS pg_trgm');
}

