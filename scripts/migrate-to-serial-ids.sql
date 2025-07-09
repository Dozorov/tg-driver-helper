-- Migration script to convert drivers table from UUID to SERIAL IDs
-- This will create a new table with SERIAL IDs and copy data

-- Create new drivers table with SERIAL ID
CREATE TABLE IF NOT EXISTS drivers_new (
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

-- Copy data from old table to new table (excluding the UUID id)
INSERT INTO drivers_new (
  telegram_id, full_name, phone_number, cdl_number, cdl_expiry_date,
  dot_medical_certificate, dot_medical_expiry_date, driver_photo_url,
  cdl_photo_url, dot_medical_photo_url, status, onboarding_completed,
  created_at, updated_at
)
SELECT 
  telegram_id, full_name, phone_number, cdl_number, cdl_expiry_date,
  dot_medical_certificate, dot_medical_expiry_date, driver_photo_url,
  cdl_photo_url, dot_medical_photo_url, status, onboarding_completed,
  created_at, updated_at
FROM drivers;

-- Drop the old table
DROP TABLE IF EXISTS drivers;

-- Rename new table to drivers
ALTER TABLE drivers_new RENAME TO drivers;

-- Recreate indexes
CREATE INDEX IF NOT EXISTS idx_drivers_telegram_id ON drivers(telegram_id);
CREATE INDEX IF NOT EXISTS idx_drivers_status ON drivers(status);

-- Recreate triggers
CREATE TRIGGER update_drivers_updated_at BEFORE UPDATE ON drivers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS
ALTER TABLE drivers ENABLE ROW LEVEL SECURITY;

-- Recreate policies
CREATE POLICY "Drivers can view their own data" ON drivers
    FOR SELECT USING (true);

CREATE POLICY "Service role can manage all drivers" ON drivers
    FOR ALL USING (auth.role() = 'service_role'); 