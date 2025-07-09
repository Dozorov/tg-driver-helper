const { readFileSync } = require('fs');
const { join } = require('path');
require('dotenv').config();

// Simple script to run the migration
async function runMigration() {
  try {
    const postgres = require('postgres');
    
    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) {
      console.error('❌ DATABASE_URL is required');
      process.exit(1);
    }

    console.log('🔧 Connecting to database...');
    const sql = postgres(databaseUrl, {
      ssl: 'require',
      onnotice: () => {}
    });

    console.log('📄 Reading migration script...');
    const migrationScript = readFileSync(join(__dirname, 'migrate-to-serial-ids.sql'), 'utf8');

    console.log('🚀 Running migration...');
    await sql.unsafe(migrationScript);

    console.log('✅ Migration completed successfully!');
    console.log('📋 Drivers now have simple numeric IDs (1, 2, 3, etc.)');

    await sql.end();
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  }
}

runMigration(); 