import postgres from 'postgres';
import { Driver, AdvancePaymentRequest, VacationRequest } from '../types';

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error('DATABASE_URL is required');
}

// Create PostgreSQL client with connection pooling
export const sql = postgres(databaseUrl, {
  max: 10, // Maximum number of connections
  idle_timeout: 20, // Close idle connections after 20 seconds
  connect_timeout: 10, // Connection timeout
  ssl: 'require', // Require SSL for Supabase
  onnotice: () => {}, // Suppress notice messages
});

// Database operations using direct PostgreSQL connection
export const dbOperations = {
  // Driver operations
  async createDriver(driverData: Partial<Driver>): Promise<Driver | null> {
    try {
      const [driver] = await sql`
        INSERT INTO drivers (
          telegram_id, full_name, phone_number, 
          cdl_number, cdl_expiry_date, dot_medical_certificate, 
          dot_medical_expiry_date, driver_photo_url, cdl_photo_url, 
          dot_medical_photo_url, status, onboarding_completed, 
          created_at, updated_at
        ) VALUES (
          ${driverData.telegram_id || null}, ${driverData.full_name || null}, 
          ${driverData.phone_number || null}, ${driverData.cdl_number || null}, 
          ${driverData.cdl_expiry_date || null}, ${driverData.dot_medical_certificate || null}, 
          ${driverData.dot_medical_expiry_date || null}, ${driverData.driver_photo_url || null}, 
          ${driverData.cdl_photo_url || null}, ${driverData.dot_medical_photo_url || null}, 
          ${driverData.status || 'pending'}, ${driverData.onboarding_completed || false}, 
          NOW(), NOW()
        )
        RETURNING *
      `;
      
      return driver as Driver;
    } catch (error: any) {
      console.error('Error creating driver:', error.message);
      throw error;
    }
  },

  async getDriverByTelegramId(telegramId: number): Promise<Driver | null> {
    try {
      const [driver] = await sql`
        SELECT * FROM drivers 
        WHERE telegram_id = ${telegramId}
      `;
      
      return driver as Driver || null;
    } catch (error: any) {
      console.error('Error getting driver by telegram ID:', error.message);
      throw error;
    }
  },

  async getDriverById(id: number): Promise<Driver | null> {
    try {
      const [driver] = await sql`
        SELECT * FROM drivers 
        WHERE id = ${id}
      `;
      
      return driver as Driver || null;
    } catch (error: any) {
      console.error('Error getting driver by ID:', error.message);
      throw error;
    }
  },

  async getAllDrivers(): Promise<Driver[]> {
    try {
      const drivers = await sql`
        SELECT * FROM drivers 
        ORDER BY created_at DESC
      `;
      
      return drivers as unknown as Driver[];
    } catch (error: any) {
      console.error('Error getting all drivers:', error.message);
      throw error;
    }
  },

  async updateDriver(id: number, updates: Partial<Driver>): Promise<Driver | null> {
    try {
      const [driver] = await sql`
        UPDATE drivers 
        SET 
          full_name = COALESCE(${updates.full_name || null}, full_name),
          phone_number = COALESCE(${updates.phone_number || null}, phone_number),
          cdl_number = COALESCE(${updates.cdl_number || null}, cdl_number),
          cdl_expiry_date = COALESCE(${updates.cdl_expiry_date || null}, cdl_expiry_date),
          dot_medical_certificate = COALESCE(${updates.dot_medical_certificate || null}, dot_medical_certificate),
          dot_medical_expiry_date = COALESCE(${updates.dot_medical_expiry_date || null}, dot_medical_expiry_date),
          driver_photo_url = COALESCE(${updates.driver_photo_url || null}, driver_photo_url),
          cdl_photo_url = COALESCE(${updates.cdl_photo_url || null}, cdl_photo_url),
          dot_medical_photo_url = COALESCE(${updates.dot_medical_photo_url || null}, dot_medical_photo_url),
          status = COALESCE(${updates.status || null}, status),
          onboarding_completed = COALESCE(${updates.onboarding_completed || null}, onboarding_completed),
          updated_at = NOW()
        WHERE id = ${id}
        RETURNING *
      `;
      
      return driver as Driver;
    } catch (error: any) {
      console.error('Error updating driver:', error.message);
      throw error;
    }
  },

  async updateDriverStatus(id: number, status: string): Promise<Driver | null> {
    try {
      const [driver] = await sql`
        UPDATE drivers 
        SET status = ${status}, updated_at = NOW()
        WHERE id = ${id}
        RETURNING *
      `;
      
      return driver as Driver;
    } catch (error: any) {
      console.error('Error updating driver status:', error.message);
      throw error;
    }
  },

  // Request operations
  async createAdvancePaymentRequest(request: Partial<AdvancePaymentRequest>): Promise<AdvancePaymentRequest | null> {
    try {
      const [advanceRequest] = await sql`
        INSERT INTO advance_payment_requests (
          driver_id, amount, reason, status, created_at, updated_at
        ) VALUES (
          ${request.driver_id || null}, ${request.amount || null}, ${request.reason || null}, 
          ${request.status || 'pending'}, NOW(), NOW()
        )
        RETURNING *
      `;
      
      return advanceRequest as AdvancePaymentRequest;
    } catch (error: any) {
      console.error('Error creating advance payment request:', error.message);
      throw error;
    }
  },

  async createVacationRequest(request: Partial<VacationRequest>): Promise<VacationRequest | null> {
    try {
      const [vacationRequest] = await sql`
        INSERT INTO vacation_requests (
          driver_id, start_date, end_date, reason, status, created_at, updated_at
        ) VALUES (
          ${request.driver_id || null}, ${request.start_date || null}, ${request.end_date || null}, 
          ${request.reason || null}, ${request.status || 'pending'}, NOW(), NOW()
        )
        RETURNING *
      `;
      
      return vacationRequest as VacationRequest;
    } catch (error: any) {
      console.error('Error creating vacation request:', error.message);
      throw error;
    }
  },

  async getPendingRequests(): Promise<{ advance: AdvancePaymentRequest[], vacation: VacationRequest[] }> {
    try {
      const [advanceRequests, vacationRequests] = await Promise.all([
        sql`SELECT * FROM advance_payment_requests WHERE status = 'pending'`,
        sql`SELECT * FROM vacation_requests WHERE status = 'pending'`
      ]);

      return {
        advance: (advanceRequests || []) as unknown as AdvancePaymentRequest[],
        vacation: (vacationRequests || []) as unknown as VacationRequest[]
      };
    } catch (error: any) {
      console.error('Error getting pending requests:', error.message);
      throw error;
    }
  },

  // Session Management Methods
  async createUserSession(telegramId: number, sessionType: string, step: number = 1, data: any = {}): Promise<any> {
    try {
      const [session] = await sql`
        INSERT INTO user_sessions (telegram_id, session_type, step, data)
        VALUES (${telegramId}, ${sessionType}, ${step}, ${JSON.stringify(data)})
        RETURNING *
      `;
      return session;
    } catch (error: any) {
      console.error('Error creating user session:', error.message);
      throw error;
    }
  },

  async getUserSession(telegramId: number, sessionType: string): Promise<any> {
    try {
      const [session] = await sql`
        SELECT * FROM user_sessions 
        WHERE telegram_id = ${telegramId} 
        AND session_type = ${sessionType} 
        AND expires_at > NOW() 
        ORDER BY created_at DESC 
        LIMIT 1
      `;
      if (session) {
        session.data = JSON.parse(session.data);
      }
      return session || null;
    } catch (error: any) {
      console.error('Error getting user session:', error.message);
      throw error;
    }
  },

  async updateUserSession(telegramId: number, sessionType: string, step: number, data: any): Promise<any> {
    try {
      const [session] = await sql`
        UPDATE user_sessions 
        SET step = ${step}, data = ${JSON.stringify(data)}, updated_at = NOW()
        WHERE telegram_id = ${telegramId} 
        AND session_type = ${sessionType} 
        AND expires_at > NOW()
        RETURNING *
      `;
      if (session) {
        session.data = JSON.parse(session.data);
      }
      return session || null;
    } catch (error: any) {
      console.error('Error updating user session:', error.message);
      throw error;
    }
  },

  async deleteUserSession(telegramId: number, sessionType: string): Promise<void> {
    try {
      await sql`
        DELETE FROM user_sessions 
        WHERE telegram_id = ${telegramId} 
        AND session_type = ${sessionType}
      `;
    } catch (error: any) {
      console.error('Error deleting user session:', error.message);
      throw error;
    }
  },

  async createHRMessageSession(hrTelegramId: number, targetDriverId: number, targetDriverName: string): Promise<any> {
    try {
      const [session] = await sql`
        INSERT INTO hr_message_sessions (hr_telegram_id, target_driver_id, target_driver_name)
        VALUES (${hrTelegramId}, ${targetDriverId}, ${targetDriverName})
        RETURNING *
      `;
      return session;
    } catch (error: any) {
      console.error('Error creating HR message session:', error.message);
      throw error;
    }
  },

  async getHRMessageSession(hrTelegramId: number): Promise<any> {
    try {
      const [session] = await sql`
        SELECT * FROM hr_message_sessions 
        WHERE hr_telegram_id = ${hrTelegramId} 
        AND expires_at > NOW() 
        ORDER BY created_at DESC 
        LIMIT 1
      `;
      return session || null;
    } catch (error: any) {
      console.error('Error getting HR message session:', error.message);
      throw error;
    }
  },

  async deleteHRMessageSession(hrTelegramId: number): Promise<void> {
    try {
      await sql`
        DELETE FROM hr_message_sessions 
        WHERE hr_telegram_id = ${hrTelegramId}
      `;
    } catch (error: any) {
      console.error('Error deleting HR message session:', error.message);
      throw error;
    }
  },

  async createDriverReplySession(driverTelegramId: number, hrGroupId: string, hrUserId: number): Promise<any> {
    try {
      const [session] = await sql`
        INSERT INTO driver_reply_sessions (driver_telegram_id, hr_group_id, hr_user_id)
        VALUES (${driverTelegramId}, ${hrGroupId}, ${hrUserId})
        RETURNING *
      `;
      return session;
    } catch (error: any) {
      console.error('Error creating driver reply session:', error.message);
      throw error;
    }
  },

  async getDriverReplySession(driverTelegramId: number): Promise<any> {
    try {
      const [session] = await sql`
        SELECT * FROM driver_reply_sessions 
        WHERE driver_telegram_id = ${driverTelegramId} 
        AND expires_at > NOW() 
        ORDER BY created_at DESC 
        LIMIT 1
      `;
      return session || null;
    } catch (error: any) {
      console.error('Error getting driver reply session:', error.message);
      throw error;
    }
  },

  async deleteDriverReplySession(driverTelegramId: number): Promise<void> {
    try {
      await sql`
        DELETE FROM driver_reply_sessions 
        WHERE driver_telegram_id = ${driverTelegramId}
      `;
    } catch (error: any) {
      console.error('Error deleting driver reply session:', error.message);
      throw error;
    }
  },

  async cleanupExpiredSessions(): Promise<void> {
    try {
      await sql`DELETE FROM user_sessions WHERE expires_at <= NOW()`;
      await sql`DELETE FROM hr_message_sessions WHERE expires_at <= NOW()`;
      await sql`DELETE FROM driver_reply_sessions WHERE expires_at <= NOW()`;
      console.log('✅ Expired sessions cleaned up');
    } catch (error: any) {
      console.error('Error cleaning up expired sessions:', error.message);
      throw error;
    }
  }
};

// Database setup and connection test
export const setupDatabase = async () => {
  try {
    console.log('Testing PostgreSQL connection...');
    
    // Test the connection with a simple query
    const result = await sql`SELECT 1 as test`;
    
    if (result && result.length > 0) {
      console.log('✅ PostgreSQL connection successful');
      return true;
    } else {
      console.error('❌ PostgreSQL connection failed: No response from database');
      return false;
    }
  } catch (error: any) {
    console.error('❌ PostgreSQL connection failed:', {
      message: error.message,
      details: error.stack,
      hint: 'Check your DATABASE_URL and network connectivity',
      code: error.code
    });
    return false;
  }
};

// Close database connection on app shutdown
export const closeDatabase = async () => {
  try {
    await sql.end();
    console.log('✅ Database connection closed');
  } catch (error: any) {
    console.error('Error closing database connection:', error.message);
  }
}; 