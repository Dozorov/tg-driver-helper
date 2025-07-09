const { readFileSync } = require('fs');
const { join } = require('path');
require('dotenv').config();

async function setupDatabase() {
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

    console.log('📄 Reading schema...');
    const schema = readFileSync(join(__dirname, '..', 'database', 'schema.sql'), 'utf8');

    console.log('🚀 Setting up database...');
    await sql.unsafe(schema);

    console.log('✅ Database setup completed successfully!');
    console.log('📋 Drivers will now have simple numeric IDs (1, 2, 3, etc.)');

    await sql.end();
  } catch (error) {
    console.error('❌ Database setup failed:', error.message);
    process.exit(1);
  }
}

setupDatabase(); 