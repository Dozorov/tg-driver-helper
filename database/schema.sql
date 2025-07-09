-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create drivers table
CREATE TABLE IF NOT EXISTS drivers (
  id SERIAL PRIMARY KEY,
  telegram_id BIGINT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  phone_number TEXT,
  cdl_number TEXT,
  cdl_expiry_date DATE,
  dot_medical_certificate TEXT,
  dot_medical_expiry_date DATE,
  driver_photo_url TEXT,
  cdl_photo_url TEXT,
  dot_medical_photo_url TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'inactive', 'suspended')),
  onboarding_completed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create advance_payment_requests table
CREATE TABLE IF NOT EXISTS advance_payment_requests (
  id SERIAL PRIMARY KEY,
  driver_id INTEGER REFERENCES drivers(id) ON DELETE CASCADE,
  amount DECIMAL(10,2) NOT NULL,
  reason TEXT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create vacation_requests table
CREATE TABLE IF NOT EXISTS vacation_requests (
  id SERIAL PRIMARY KEY,
  driver_id INTEGER REFERENCES drivers(id) ON DELETE CASCADE,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  reason TEXT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create session management tables
CREATE TABLE IF NOT EXISTS user_sessions (
  id SERIAL PRIMARY KEY,
  telegram_id BIGINT NOT NULL,
  session_type TEXT NOT NULL CHECK (session_type IN ('onboarding', 'advance_request', 'vacation_request', 'hr_message', 'driver_reply', 'advance_payment', 'vacation_request')),
  step INTEGER NOT NULL DEFAULT 1,
  data JSONB DEFAULT '{}',
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '1 hour'),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS hr_message_sessions (
  id SERIAL PRIMARY KEY,
  hr_telegram_id BIGINT NOT NULL,
  target_driver_id INTEGER REFERENCES drivers(id) ON DELETE CASCADE,
  target_driver_name TEXT NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '30 minutes'),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS driver_reply_sessions (
  id SERIAL PRIMARY KEY,
  driver_telegram_id BIGINT NOT NULL,
  hr_group_id TEXT NOT NULL,
  hr_user_id BIGINT NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '30 minutes'),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_drivers_telegram_id ON drivers(telegram_id);
CREATE INDEX IF NOT EXISTS idx_drivers_status ON drivers(status);
CREATE INDEX IF NOT EXISTS idx_advance_payment_requests_driver_id ON advance_payment_requests(driver_id);
CREATE INDEX IF NOT EXISTS idx_advance_payment_requests_status ON advance_payment_requests(status);
CREATE INDEX IF NOT EXISTS idx_vacation_requests_driver_id ON vacation_requests(driver_id);
CREATE INDEX IF NOT EXISTS idx_vacation_requests_status ON vacation_requests(status);
CREATE INDEX IF NOT EXISTS idx_user_sessions_telegram_id ON user_sessions(telegram_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_expires_at ON user_sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_hr_message_sessions_hr_telegram_id ON hr_message_sessions(hr_telegram_id);
CREATE INDEX IF NOT EXISTS idx_hr_message_sessions_expires_at ON hr_message_sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_driver_reply_sessions_driver_telegram_id ON driver_reply_sessions(driver_telegram_id);
CREATE INDEX IF NOT EXISTS idx_driver_reply_sessions_expires_at ON driver_reply_sessions(expires_at);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_drivers_updated_at BEFORE UPDATE ON drivers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_advance_payment_requests_updated_at BEFORE UPDATE ON advance_payment_requests
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_vacation_requests_updated_at BEFORE UPDATE ON vacation_requests
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_sessions_updated_at BEFORE UPDATE ON user_sessions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_hr_message_sessions_updated_at BEFORE UPDATE ON hr_message_sessions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_driver_reply_sessions_updated_at BEFORE UPDATE ON driver_reply_sessions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security (RLS) policies
ALTER TABLE drivers ENABLE ROW LEVEL SECURITY;
ALTER TABLE advance_payment_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE vacation_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE hr_message_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE driver_reply_sessions ENABLE ROW LEVEL SECURITY;

-- Drivers policies
CREATE POLICY "Drivers can view their own data" ON drivers
    FOR SELECT USING (true);

CREATE POLICY "Service role can manage all drivers" ON drivers
    FOR ALL USING (auth.role() = 'service_role');

-- Advance payment requests policies
CREATE POLICY "Drivers can view their own advance requests" ON advance_payment_requests
    FOR SELECT USING (true);

CREATE POLICY "Service role can manage all advance requests" ON advance_payment_requests
    FOR ALL USING (auth.role() = 'service_role');

-- Vacation requests policies
CREATE POLICY "Drivers can view their own vacation requests" ON vacation_requests
    FOR SELECT USING (true);

CREATE POLICY "Service role can manage all vacation requests" ON vacation_requests
    FOR ALL USING (auth.role() = 'service_role');

-- Session management policies
CREATE POLICY "Service role can manage all user sessions" ON user_sessions
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role can manage all HR message sessions" ON hr_message_sessions
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role can manage all driver reply sessions" ON driver_reply_sessions
    FOR ALL USING (auth.role() = 'service_role'); 