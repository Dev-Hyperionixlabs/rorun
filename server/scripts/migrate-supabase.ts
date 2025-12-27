#!/usr/bin/env ts-node

/**
 * Unified Supabase Migration System
 * 
 * This script applies SQL migrations directly to Supabase, bypassing Prisma's
 * migration system when it fails. It tracks applied migrations to prevent duplicates.
 * 
 * Usage:
 *   npm run migrate:supabase                    # Apply all pending migrations
 *   npm run migrate:supabase -- --file path.sql # Apply specific file
 *   npm run migrate:supabase -- --dry-run       # Preview without applying
 */

import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

const prisma = new PrismaClient();

interface MigrationRecord {
  id: string;
  name: string;
  applied_at: Date;
  checksum: string;
}

/**
 * Ensure migration tracking table exists
 */
async function ensureMigrationTable() {
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS _supabase_migrations (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      applied_at TIMESTAMP NOT NULL DEFAULT NOW(),
      checksum TEXT NOT NULL
    );
  `);
}

/**
 * Get checksum of SQL file
 */
function getChecksum(content: string): string {
  return crypto.createHash('sha256').update(content).digest('hex');
}

/**
 * Get all applied migrations
 */
async function getAppliedMigrations(): Promise<Map<string, MigrationRecord>> {
  try {
    const records = await prisma.$queryRawUnsafe<MigrationRecord[]>(
      `SELECT id, name, applied_at, checksum FROM _supabase_migrations ORDER BY applied_at`
    );
    return new Map(records.map(r => [r.name, r]));
  } catch (error: any) {
    // Table doesn't exist yet
    if (error.message?.includes('does not exist')) {
      await ensureMigrationTable();
      return new Map();
    }
    throw error;
  }
}

/**
 * Record a migration as applied
 */
async function recordMigration(name: string, checksum: string) {
  const id = crypto.randomUUID();
  await prisma.$executeRawUnsafe(
    `INSERT INTO _supabase_migrations (id, name, checksum) VALUES ($1, $2, $3)`,
    id,
    name,
    checksum
  );
}

/**
 * Apply SQL migration file
 */
async function applyMigration(filePath: string, dryRun: boolean = false): Promise<boolean> {
  const fileName = path.basename(filePath);
  const content = fs.readFileSync(filePath, 'utf-8');
  const checksum = getChecksum(content);
  
  const applied = await getAppliedMigrations();
  const existing = applied.get(fileName);
  
  if (existing) {
    if (existing.checksum === checksum) {
      console.log(`✓ ${fileName} already applied (checksum matches)`);
      return false;
    } else {
      console.warn(`⚠ ${fileName} was modified after being applied!`);
      console.warn(`  Original checksum: ${existing.checksum.substring(0, 8)}...`);
      console.warn(`  New checksum: ${checksum.substring(0, 8)}...`);
      console.warn(`  Applied at: ${existing.applied_at}`);
      console.warn(`  Skipping to prevent data loss.`);
      return false;
    }
  }
  
  if (dryRun) {
    console.log(`[DRY RUN] Would apply: ${fileName}`);
    console.log(`[DRY RUN] Checksum: ${checksum.substring(0, 8)}...`);
    return false;
  }
  
  console.log(`Applying migration: ${fileName}...`);
  
  try {
    // Split SQL by semicolons and execute each statement
    // This handles multi-statement migrations better
    const statements = content
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));
    
    for (const statement of statements) {
      if (statement.trim()) {
        await prisma.$executeRawUnsafe(statement);
      }
    }
    
    // Record migration
    await recordMigration(fileName, checksum);
    console.log(`✓ ${fileName} applied successfully`);
    return true;
  } catch (error: any) {
    console.error(`✗ Failed to apply ${fileName}:`);
    console.error(`  ${error.message}`);
    throw error;
  }
}

/**
 * Find all migration SQL files
 */
function findMigrationFiles(): string[] {
  const migrationsDir = path.join(__dirname, '..', 'prisma', 'migrations');
  const files: string[] = [];
  
  if (!fs.existsSync(migrationsDir)) {
    return files;
  }
  
  const dirs = fs.readdirSync(migrationsDir, { withFileTypes: true });
  
  for (const dir of dirs) {
    if (dir.isDirectory()) {
      const migrationFile = path.join(migrationsDir, dir.name, 'migration.sql');
      if (fs.existsSync(migrationFile)) {
        files.push(migrationFile);
      }
    }
  }
  
  // Also check for standalone SQL files
  const standaloneFiles = [
    path.join(__dirname, '..', 'supabase-migration.sql'),
  ];
  
  for (const file of standaloneFiles) {
    if (fs.existsSync(file)) {
      files.push(file);
    }
  }
  
  return files.sort();
}

/**
 * Main function
 */
async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const fileArg = args.find(arg => arg.startsWith('--file='));
  const specificFile = fileArg ? fileArg.split('=')[1] : null;
  
  console.log('🚀 Supabase Migration System\n');
  
  if (dryRun) {
    console.log('⚠️  DRY RUN MODE - No changes will be applied\n');
  }
  
  try {
    // Ensure migration table exists
    await ensureMigrationTable();
    console.log('✓ Migration tracking table ready\n');
    
    // Get applied migrations
    const applied = await getAppliedMigrations();
    console.log(`Found ${applied.size} previously applied migration(s)\n`);
    
    // Find migration files
    let files: string[];
    if (specificFile) {
      if (!fs.existsSync(specificFile)) {
        console.error(`✗ File not found: ${specificFile}`);
        process.exit(1);
      }
      files = [specificFile];
    } else {
      files = findMigrationFiles();
    }
    
    if (files.length === 0) {
      console.log('No migration files found.');
      return;
    }
    
    console.log(`Found ${files.length} migration file(s):\n`);
    files.forEach(f => console.log(`  - ${path.basename(f)}`));
    console.log();
    
    // Apply migrations
    let appliedCount = 0;
    for (const file of files) {
      const wasApplied = await applyMigration(file, dryRun);
      if (wasApplied) {
        appliedCount++;
      }
    }
    
    console.log(`\n✅ Migration complete!`);
    if (!dryRun) {
      console.log(`   Applied ${appliedCount} new migration(s)`);
    }
    
  } catch (error: any) {
    console.error(`\n✗ Migration failed:`);
    console.error(`  ${error.message}`);
    if (error.stack) {
      console.error(`\n${error.stack}`);
    }
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run if called directly
if (require.main === module) {
  main().catch(console.error);
}

