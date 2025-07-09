#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const question = (query) => new Promise((resolve) => rl.question(query, resolve));

async function setup() {
  console.log('🚀 Telegram Driver Helper Bot Setup\n');
  console.log('This script will help you configure your environment variables.\n');

  const envPath = path.join(process.cwd(), '.env');
  const envExamplePath = path.join(process.cwd(), 'env.example');

  // Check if .env already exists
  if (fs.existsSync(envPath)) {
    const overwrite = await question('⚠️  .env file already exists. Overwrite? (y/N): ');
    if (overwrite.toLowerCase() !== 'y') {
      console.log('Setup cancelled.');
      rl.close();
      return;
    }
  }

  console.log('\n📋 Please provide the following information:\n');

  // Telegram Configuration
  console.log('🤖 Telegram Bot Configuration:');
  const telegramBotToken = await question('Telegram Bot Token (from @BotFather): ');
  const telegramHrGroupId = await question('HR Group Chat ID: ');

  // OpenAI Configuration
  console.log('\n🧠 OpenAI Configuration:');
  const openaiApiKey = await question('OpenAI API Key: ');

  // Supabase Configuration
  console.log('\n🗄️  Supabase Configuration:');
  const supabaseUrl = await question('Supabase Project URL: ');
  const supabaseAnonKey = await question('Supabase Anon Key: ');
  const supabaseServiceRoleKey = await question('Supabase Service Role Key: ');

  // Digital Ocean Spaces Configuration
  console.log('\n☁️  Digital Ocean Spaces Configuration:');
  const doSpacesEndpoint = await question('DO Spaces Endpoint (e.g., nyc3.digitaloceanspaces.com): ');
  const doSpacesKey = await question('DO Spaces Access Key: ');
  const doSpacesSecret = await question('DO Spaces Secret Key: ');
  const doSpacesBucket = await question('DO Spaces Bucket Name: ');
  const doSpacesRegion = await question('DO Spaces Region (e.g., nyc3): ');

  // Application Configuration
  console.log('\n⚙️  Application Configuration:');
  const nodeEnv = await question('Node Environment (development/production) [development]: ') || 'development';
  const port = await question('Port [3000]: ') || '3000';

  // Generate .env content
  const envContent = `# Telegram Bot Configuration
TELEGRAM_BOT_TOKEN=${telegramBotToken}
TELEGRAM_HR_GROUP_ID=${telegramHrGroupId}

# OpenAI Configuration
OPENAI_API_KEY=${openaiApiKey}

# Supabase Configuration
SUPABASE_URL=${supabaseUrl}
SUPABASE_ANON_KEY=${supabaseAnonKey}
SUPABASE_SERVICE_ROLE_KEY=${supabaseServiceRoleKey}

# Digital Ocean Spaces (S3) Configuration
DO_SPACES_ENDPOINT=${doSpacesEndpoint}
DO_SPACES_KEY=${doSpacesKey}
DO_SPACES_SECRET=${doSpacesSecret}
DO_SPACES_BUCKET=${doSpacesBucket}
DO_SPACES_REGION=${doSpacesRegion}

# Application Configuration
NODE_ENV=${nodeEnv}
PORT=${port}
LOG_LEVEL=info
`;

  // Write .env file
  try {
    fs.writeFileSync(envPath, envContent);
    console.log('\n✅ .env file created successfully!');
  } catch (error) {
    console.error('\n❌ Error creating .env file:', error.message);
    rl.close();
    return;
  }

  // Next steps
  console.log('\n📋 Next Steps:');
  console.log('1. Install dependencies: npm install');
  console.log('2. Set up your Supabase database using the schema in database/schema.sql');
  console.log('3. Configure your Digital Ocean Spaces bucket');
  console.log('4. Start the application: npm run dev');
  console.log('\n📚 For detailed setup instructions, see README.md');

  rl.close();
}

// Handle errors
process.on('SIGINT', () => {
  console.log('\n\nSetup cancelled.');
  rl.close();
  process.exit(0);
});

setup().catch((error) => {
  console.error('Setup failed:', error);
  rl.close();
  process.exit(1);
}); 