-- Migration: Add service offers table for special occasion combos
-- Allows admins to create service bundles at discounted prices

CREATE TABLE IF NOT EXISTS service_offers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  combo_price DECIMAL(10, 2) NOT NULL,
  original_price DECIMAL(10, 2) NOT NULL,
  discount_percentage DECIMAL(5, 2) DEFAULT 0,
  service_ids UUID[] NOT NULL, -- Array of service IDs in the combo
  service_names TEXT[] NOT NULL, -- Array of service names for display
  is_active BOOLEAN DEFAULT true,
  valid_from DATE,
  valid_until DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for active offers
CREATE INDEX IF NOT EXISTS idx_service_offers_is_active ON service_offers(is_active);
CREATE INDEX IF NOT EXISTS idx_service_offers_validity ON service_offers(valid_from, valid_until);

-- Enable RLS
ALTER TABLE service_offers ENABLE ROW LEVEL SECURITY;

-- Allow all operations for authenticated users
CREATE POLICY "Allow all for authenticated users" ON service_offers
  FOR ALL USING (true);

-- Add updated_at trigger
CREATE TRIGGER update_service_offers_updated_at BEFORE UPDATE ON service_offers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Add comment
COMMENT ON TABLE service_offers IS 'Special occasion service combo offers with discounted pricing';
COMMENT ON COLUMN service_offers.service_ids IS 'Array of service UUIDs included in this offer';
COMMENT ON COLUMN service_offers.service_names IS 'Array of service names for quick display';
COMMENT ON COLUMN service_offers.combo_price IS 'Special discounted price for the combo';
COMMENT ON COLUMN service_offers.original_price IS 'Sum of individual service prices';
COMMENT ON COLUMN service_offers.discount_percentage IS 'Percentage saved by purchasing this combo';
