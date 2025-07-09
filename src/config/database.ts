import { Driver, AdvancePaymentRequest, VacationRequest } from '../types';
import { dbOperations as postgresDbOperations, setupDatabase as postgresSetupDatabase, closeDatabase } from './postgres-client';

const databaseUrl = process.env.DATABASE_URL;

// Database schema setup
export const setupDatabase = async () => {
  if (!databaseUrl) {
    console.error('❌ DATABASE_URL is required!');
    console.error('Please check your .env file and ensure DATABASE_URL is set.');
    console.error('Format: postgresql://username:password@host:port/database');
    process.exit(1);
  }

  try {
    console.log('🔧 Testing PostgreSQL connection...');
    const isConnected = await postgresSetupDatabase();
    if (isConnected) {
      console.log('✅ PostgreSQL database connected successfully');
    } else {
      console.error('❌ PostgreSQL connection failed');
      process.exit(1);
    }
  } catch (error) {
    console.error('❌ Database setup error:', error);
    process.exit(1);
  }
};

// Database operations - using PostgreSQL
export const dbOperations = postgresDbOperations;

// Graceful shutdown
export const closeDatabaseConnection = closeDatabase; 