import { createClient } from '@supabase/supabase-js';
import fetch from 'node-fetch';
import { Driver, AdvancePaymentRequest, VacationRequest } from '../types';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Supabase URL and Service Role Key are required');
}

// Create Supabase client with proper configuration and custom fetch
export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
    detectSessionInUrl: false
  },
  global: {
    headers: {
      'User-Agent': 'DriverBot/1.0'
    },
    fetch: fetch as any
  },
  db: {
    schema: 'public'
  }
});

// Database operations using official Supabase client
export const dbOperations = {
  // Driver operations
  async createDriver(driverData: Partial<Driver>): Promise<Driver | null> {
    try {
      const { data, error } = await supabase
        .from('drivers')
        .insert([driverData])
        .select()
        .single();
      
      if (error) {
        console.error('Error creating driver:', error);
        throw error;
      }
      
      return data;
    } catch (error: any) {
      console.error('Error creating driver:', error.message);
      throw error;
    }
  },

  async getDriverByTelegramId(telegramId: number): Promise<Driver | null> {
    try {
      const { data, error } = await supabase
        .from('drivers')
        .select('*')
        .eq('telegram_id', telegramId)
        .single();
      
      if (error && error.code !== 'PGRST116') {
        console.error('Error getting driver by telegram ID:', error);
        throw error;
      }
      
      return data;
    } catch (error: any) {
      console.error('Error getting driver by telegram ID:', error.message);
      throw error;
    }
  },

  async updateDriver(id: string, updates: Partial<Driver>): Promise<Driver | null> {
    try {
      const { data, error } = await supabase
        .from('drivers')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();
      
      if (error) {
        console.error('Error updating driver:', error);
        throw error;
      }
      
      return data;
    } catch (error: any) {
      console.error('Error updating driver:', error.message);
      throw error;
    }
  },

  async updateDriverStatus(id: string, status: string): Promise<Driver | null> {
    return this.updateDriver(id, { status: status as any });
  },

  // Request operations
  async createAdvancePaymentRequest(request: Partial<AdvancePaymentRequest>): Promise<AdvancePaymentRequest | null> {
    try {
      const { data, error } = await supabase
        .from('advance_payment_requests')
        .insert([request])
        .select()
        .single();
      
      if (error) {
        console.error('Error creating advance payment request:', error);
        throw error;
      }
      
      return data;
    } catch (error: any) {
      console.error('Error creating advance payment request:', error.message);
      throw error;
    }
  },

  async createVacationRequest(request: Partial<VacationRequest>): Promise<VacationRequest | null> {
    try {
      const { data, error } = await supabase
        .from('vacation_requests')
        .insert([request])
        .select()
        .single();
      
      if (error) {
        console.error('Error creating vacation request:', error);
        throw error;
      }
      
      return data;
    } catch (error: any) {
      console.error('Error creating vacation request:', error.message);
      throw error;
    }
  },

  async getPendingRequests(): Promise<{ advance: AdvancePaymentRequest[], vacation: VacationRequest[] }> {
    try {
      const [advanceResult, vacationResult] = await Promise.all([
        supabase.from('advance_payment_requests').select('*').eq('status', 'pending'),
        supabase.from('vacation_requests').select('*').eq('status', 'pending')
      ]);

      if (advanceResult.error) {
        console.error('Error getting pending advance requests:', advanceResult.error);
        throw advanceResult.error;
      }

      if (vacationResult.error) {
        console.error('Error getting pending vacation requests:', vacationResult.error);
        throw vacationResult.error;
      }

      return {
        advance: advanceResult.data || [],
        vacation: vacationResult.data || []
      };
    } catch (error: any) {
      console.error('Error getting pending requests:', error.message);
      throw error;
    }
  }
};

// Database setup
export const setupDatabase = async () => {
  try {
    console.log('Testing Supabase connection...');
    const { data, error } = await supabase
      .from('drivers')
      .select('*')
      .limit(1);
    
    if (error) {
      console.error('❌ Supabase connection failed:', error);
      return false;
    }
    
    console.log('✅ Supabase connection successful');
    return true;
  } catch (error: any) {
    console.error('❌ Supabase connection failed:', error.message);
    return false;
  }
}; 