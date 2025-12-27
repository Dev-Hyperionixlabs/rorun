#!/usr/bin/env ts-node

/**
 * Generate SQL migration from Prisma schema changes
 * 
 * This script generates SQL that can be applied directly to Supabase,
 * handling common Prisma-to-PostgreSQL conversions.
 * 
 * Usage:
 *   npm run migrate:generate-sql -- add_import_fingerprint
 */

import * as fs from 'fs';
import * as path from 'path';

const MIGRATIONS_DIR = path.join(__dirname, '..', 'prisma', 'migrations');

interface MigrationConfig {
  name: string;
  sql: string;
}

const MIGRATIONS: Record<string, MigrationConfig> = {
  add_import_fingerprint: {
    name: 'add_import_fingerprint',
    sql: `
-- Migration: Add importFingerprint to Transaction model
-- Generated: ${new Date().toISOString()}

-- AddColumn
ALTER TABLE "transactions" ADD COLUMN IF NOT EXISTS "importFingerprint" TEXT;

-- CreateIndex (unique constraint)
CREATE UNIQUE INDEX IF NOT EXISTS "transactions_importFingerprint_key" 
ON "transactions"("importFingerprint") 
WHERE "importFingerprint" IS NOT NULL;

-- Verify column exists
SELECT 'importFingerprint column added successfully' AS status;
    `.trim(),
  },
  
  init_migration_tracking: {
    name: 'init_migration_tracking',
    sql: `
-- Migration: Initialize migration tracking table
-- Generated: ${new Date().toISOString()}

-- Create migration tracking table
CREATE TABLE IF NOT EXISTS "_supabase_migrations" (
  "id" TEXT PRIMARY KEY,
  "name" TEXT NOT NULL UNIQUE,
  "applied_at" TIMESTAMP NOT NULL DEFAULT NOW(),
  "checksum" TEXT NOT NULL
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS "_supabase_migrations_name_idx" 
ON "_supabase_migrations"("name");

SELECT 'Migration tracking table initialized' AS status;
    `.trim(),
  },
};

function main() {
  const migrationName = process.argv[2];
  
  if (!migrationName) {
    console.error('Usage: npm run migrate:generate-sql -- <migration_name>');
    console.error('\nAvailable migrations:');
    Object.keys(MIGRATIONS).forEach(name => {
      console.error(`  - ${name}`);
    });
    process.exit(1);
  }
  
  const migration = MIGRATIONS[migrationName];
  
  if (!migration) {
    console.error(`✗ Migration "${migrationName}" not found`);
    console.error('\nAvailable migrations:');
    Object.keys(MIGRATIONS).forEach(name => {
      console.error(`  - ${name}`);
    });
    process.exit(1);
  }
  
  // Create migration directory
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
  const migrationDir = path.join(MIGRATIONS_DIR, `${timestamp}_${migration.name}`);
  
  if (!fs.existsSync(MIGRATIONS_DIR)) {
    fs.mkdirSync(MIGRATIONS_DIR, { recursive: true });
  }
  
  if (!fs.existsSync(migrationDir)) {
    fs.mkdirSync(migrationDir, { recursive: true });
  }
  
  // Write migration SQL
  const sqlFile = path.join(migrationDir, 'migration.sql');
  fs.writeFileSync(sqlFile, migration.sql);
  
  // Also write to supabase-migration.sql for easy access
  const supabaseFile = path.join(__dirname, '..', 'supabase-migration.sql');
  fs.writeFileSync(supabaseFile, migration.sql);
  
  console.log(`✓ Generated migration: ${migration.name}`);
  console.log(`  SQL file: ${sqlFile}`);
  console.log(`  Supabase file: ${supabaseFile}`);
  console.log(`\nTo apply:`);
  console.log(`  npm run migrate:supabase`);
}

main();
