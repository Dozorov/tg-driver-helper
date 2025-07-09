const postgres = require('postgres');

const sql = postgres(process.env.DATABASE_URL);

async function migrateSessions() {
  try {
    console.log('🔄 Migrating session types...');
    
    // Drop the old constraint
    await sql`ALTER TABLE user_sessions DROP CONSTRAINT IF EXISTS user_sessions_session_type_check`;
    
    // Add the new constraint with all session types
    await sql`ALTER TABLE user_sessions ADD CONSTRAINT user_sessions_session_type_check CHECK (session_type IN ('onboarding', 'advance_request', 'vacation_request', 'hr_message', 'driver_reply'))`;
    
    console.log('✅ Session types migrated successfully!');
  } catch (error) {
    console.error('❌ Migration failed:', error);
  } finally {
    await sql.end();
  }
}

migrateSessions(); 