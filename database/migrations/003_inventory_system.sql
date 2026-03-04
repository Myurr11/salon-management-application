-- Migration 003: Enhanced Inventory System
-- Separates retail products from salon consumables
-- Adds cost tracking and purchase history

-- 1. Add new columns to inventory_items
ALTER TABLE inventory_items 
ADD COLUMN IF NOT EXISTS item_type VARCHAR(20) DEFAULT 'retail' CHECK (item_type IN ('retail', 'consumable')),
ADD COLUMN IF NOT EXISTS cost_price DECIMAL(10, 2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS supplier VARCHAR(255),
ADD COLUMN IF NOT EXISTS sku VARCHAR(100),
ADD COLUMN IF NOT EXISTS branch_id UUID REFERENCES branches(id) ON DELETE SET NULL;

-- Update existing items to be retail by default
UPDATE inventory_items SET item_type = 'retail' WHERE item_type IS NULL;
UPDATE inventory_items SET cost_price = price * 0.7 WHERE cost_price = 0; -- Default 30% margin

-- Create index for item type
CREATE INDEX IF NOT EXISTS idx_inventory_items_type ON inventory_items(item_type);
CREATE INDEX IF NOT EXISTS idx_inventory_items_branch ON inventory_items(branch_id);

-- 2. Create Stock Purchases Table (for tracking inventory purchases)
CREATE TABLE IF NOT EXISTS stock_purchases (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  item_id UUID NOT NULL REFERENCES inventory_items(id) ON DELETE CASCADE,
  branch_id UUID REFERENCES branches(id) ON DELETE SET NULL,
  quantity INTEGER NOT NULL,
  unit_cost DECIMAL(10, 2) NOT NULL,
  total_cost DECIMAL(10, 2) NOT NULL,
  supplier VARCHAR(255),
  invoice_number VARCHAR(100),
  purchase_date DATE NOT NULL,
  notes TEXT,
  created_by UUID REFERENCES staff_members(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_stock_purchases_item ON stock_purchases(item_id);
CREATE INDEX IF NOT EXISTS idx_stock_purchases_date ON stock_purchases(purchase_date);
CREATE INDEX IF NOT EXISTS idx_stock_purchases_branch ON stock_purchases(branch_id);

-- 3. Create Service Consumables Table (track consumables used in services)
CREATE TABLE IF NOT EXISTS service_consumables (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  service_id UUID NOT NULL REFERENCES services(id) ON DELETE CASCADE,
  item_id UUID NOT NULL REFERENCES inventory_items(id) ON DELETE CASCADE,
  quantity_used DECIMAL(10, 3) NOT NULL DEFAULT 1, -- Can be fractional (e.g., 0.5 bottle)
  unit VARCHAR(50) DEFAULT 'units',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(service_id, item_id)
);

CREATE INDEX IF NOT EXISTS idx_service_consumables_service ON service_consumables(service_id);
CREATE INDEX IF NOT EXISTS idx_service_consumables_item ON service_consumables(item_id);

-- 4. Create Consumable Usage Table (track actual usage during visits)
CREATE TABLE IF NOT EXISTS consumable_usage (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  visit_id UUID NOT NULL REFERENCES visits(id) ON DELETE CASCADE,
  item_id UUID NOT NULL REFERENCES inventory_items(id) ON DELETE CASCADE,
  service_id UUID REFERENCES services(id) ON DELETE SET NULL,
  quantity_used DECIMAL(10, 3) NOT NULL,
  unit_cost DECIMAL(10, 2) NOT NULL, -- Cost at time of usage
  total_cost DECIMAL(10, 2) NOT NULL,
  used_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_consumable_usage_visit ON consumable_usage(visit_id);
CREATE INDEX IF NOT EXISTS idx_consumable_usage_item ON consumable_usage(item_id);
CREATE INDEX IF NOT EXISTS idx_consumable_usage_date ON consumable_usage(used_at);

-- 5. Enable RLS on new tables
ALTER TABLE stock_purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_consumables ENABLE ROW LEVEL SECURITY;
ALTER TABLE consumable_usage ENABLE ROW LEVEL SECURITY;

-- 6. Add RLS policies
CREATE POLICY "Allow all for authenticated users" ON stock_purchases FOR ALL USING (true);
CREATE POLICY "Allow all for authenticated users" ON service_consumables FOR ALL USING (true);
CREATE POLICY "Allow all for authenticated users" ON consumable_usage FOR ALL USING (true);

-- 7. Create view for inventory analytics
CREATE OR REPLACE VIEW inventory_analytics AS
SELECT 
  ii.id,
  ii.name,
  ii.item_type,
  ii.quantity,
  ii.price as sale_price,
  ii.cost_price,
  ii.price - ii.cost_price as profit_margin,
  CASE 
    WHEN ii.price > 0 THEN ROUND(((ii.price - ii.cost_price) / ii.price * 100), 2)
    ELSE 0
  END as margin_percent,
  ii.branch_id,
  b.name as branch_name,
  COALESCE(ps.total_sold, 0) as total_units_sold,
  COALESCE(ps.total_revenue, 0) as total_revenue,
  COALESCE(ps.total_cost, 0) as total_cost,
  COALESCE(ps.total_profit, 0) as total_profit,
  COALESCE(sp.total_purchased, 0) as total_units_purchased,
  COALESCE(sp.total_purchase_cost, 0) as total_purchase_cost
FROM inventory_items ii
LEFT JOIN branches b ON ii.branch_id = b.id
LEFT JOIN (
  SELECT 
    product_id,
    SUM(quantity) as total_sold,
    SUM(total_price) as total_revenue,
    SUM(quantity * ii2.cost_price) as total_cost,
    SUM(total_price) - SUM(quantity * ii2.cost_price) as total_profit
  FROM product_sales ps2
  JOIN inventory_items ii2 ON ps2.product_id = ii2.id
  GROUP BY product_id
) ps ON ii.id = ps.product_id
LEFT JOIN (
  SELECT 
    item_id,
    SUM(quantity) as total_purchased,
    SUM(total_cost) as total_purchase_cost
  FROM stock_purchases
  GROUP BY item_id
) sp ON ii.id = sp.item_id;

-- 8. Create view for consumable usage analytics
CREATE OR REPLACE VIEW consumable_analytics AS
SELECT 
  ii.id,
  ii.name,
  ii.cost_price,
  ii.branch_id,
  b.name as branch_name,
  COALESCE(cu.total_used, 0) as total_units_used,
  COALESCE(cu.total_cost, 0) as total_usage_cost,
  COALESCE(sc.service_count, 0) as linked_services_count
FROM inventory_items ii
LEFT JOIN branches b ON ii.branch_id = b.id
LEFT JOIN (
  SELECT 
    item_id,
    SUM(quantity_used) as total_used,
    SUM(total_cost) as total_cost
  FROM consumable_usage
  GROUP BY item_id
) cu ON ii.id = cu.item_id
LEFT JOIN (
  SELECT 
    item_id,
    COUNT(DISTINCT service_id) as service_count
  FROM service_consumables
  GROUP BY item_id
) sc ON ii.id = sc.item_id
WHERE ii.item_type = 'consumable';
