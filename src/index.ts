import dotenv from 'dotenv';
dotenv.config();

// Add fetch polyfill for Node.js
import 'isomorphic-fetch';

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { telegramService } from './services/telegram';
import { setupDatabase, closeDatabaseConnection } from './config/database';

// Debug: Check if environment variables are loaded
console.log('🔍 Environment Debug:');
console.log('TELEGRAM_BOT_TOKEN:', process.env.TELEGRAM_BOT_TOKEN ? 'SET' : 'NOT SET');
console.log('TELEGRAM_BOT_TOKEN VALUE:', process.env.TELEGRAM_BOT_TOKEN);
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('DATABASE_URL:', process.env.DATABASE_URL ? 'SET' : 'NOT SET');
console.log('OPENAI_API_KEY:', process.env.OPENAI_API_KEY ? 'SET' : 'NOT SET');

// Check if we have all required environment variables
const hasAllRequiredEnvVars = process.env.TELEGRAM_BOT_TOKEN && 
                             process.env.OPENAI_API_KEY && 
                             process.env.DATABASE_URL;

if (!hasAllRequiredEnvVars) {
  console.log('⚠️  Missing required environment variables. Please check your .env file.');
  console.log('Required: TELEGRAM_BOT_TOKEN, OPENAI_API_KEY, DATABASE_URL');
}

// Validate required environment variables
const requiredEnvVars = [
  'TELEGRAM_BOT_TOKEN',
  'TELEGRAM_HR_GROUP_ID',
  'OPENAI_API_KEY',
  'DATABASE_URL',
  'DO_SPACES_ENDPOINT',
  'DO_SPACES_KEY',
  'DO_SPACES_SECRET',
  'DO_SPACES_BUCKET',
  'DO_SPACES_REGION'
];

const missingEnvVars = requiredEnvVars.filter(varName => !process.env[varName]);
if (missingEnvVars.length > 0) {
  console.error('Missing required environment variables:', missingEnvVars);
  process.exit(1);
}

// Initialize Express app for webhook (optional)
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    services: {
      telegram: 'running',
      database: 'connected',
      storage: 'configured'
    }
  });
});

// Start the application
async function startApp() {
  try {
    console.log('🚀 Starting Driver Helper Bot with hot reloading enabled!');

    // Setup database
    console.log('📊 Setting up database...');
    await setupDatabase();

    // Start Telegram bot
    console.log('🤖 Starting Telegram bot...');
    telegramService.start();

    // Start Express server
    app.listen(PORT, () => {
      console.log(`🌐 Server running on port ${PORT}`);
      console.log(`📊 Health check: http://localhost:${PORT}/health`);
    });

    console.log('✅ Application started successfully!');
  } catch (error) {
    console.error('❌ Failed to start application:', error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🛑 Shutting down gracefully...');
  try {
    await closeDatabaseConnection();
    console.log('✅ Database connection closed');
  } catch (error) {
    console.error('❌ Error closing database connection:', error);
  }
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n🛑 Shutting down gracefully...');
  try {
    await closeDatabaseConnection();
    console.log('✅ Database connection closed');
  } catch (error) {
    console.error('❌ Error closing database connection:', error);
  }
  process.exit(0);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Start the application
startApp(); 