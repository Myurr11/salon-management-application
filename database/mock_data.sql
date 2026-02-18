-- Mock Data for Salon Manager Application

-- Insert Staff Members
INSERT INTO staff_members (id, name, email, phone) VALUES
  ('550e8400-e29b-41d4-a716-446655440001', 'Alice Johnson', 'alice@salon.com', '+91 98765 43210'),
  ('550e8400-e29b-41d4-a716-446655440002', 'Bob Smith', 'bob@salon.com', '+91 98765 43211'),
  ('550e8400-e29b-41d4-a716-446655440003', 'Carol Williams', 'carol@salon.com', '+91 98765 43212')
ON CONFLICT DO NOTHING;

-- Insert Services
INSERT INTO services (id, name, price, description, duration_minutes) VALUES
  ('660e8400-e29b-41d4-a716-446655440001', 'Haircut', 500.00, 'Professional haircut service', 30),
  ('660e8400-e29b-41d4-a716-446655440002', 'Hair Coloring', 1500.00, 'Full hair coloring service', 120),
  ('660e8400-e29b-41d4-a716-446655440003', 'Hair Spa', 1200.00, 'Relaxing hair spa treatment', 60),
  ('660e8400-e29b-41d4-a716-446655440004', 'Manicure', 700.00, 'Nail care and polish', 45),
  ('660e8400-e29b-41d4-a716-446655440005', 'Pedicure', 800.00, 'Foot care and polish', 45),
  ('660e8400-e29b-41d4-a716-446655440006', 'Facial', 1000.00, 'Deep cleansing facial', 60)
ON CONFLICT DO NOTHING;

-- Insert Inventory Items
INSERT INTO inventory_items (id, name, quantity, min_threshold, price, description, unit) VALUES
  ('770e8400-e29b-41d4-a716-446655440001', 'Premium Shampoo', 30, 10, 250.00, 'High-quality shampoo for all hair types', 'bottles'),
  ('770e8400-e29b-41d4-a716-446655440002', 'Hair Color Pack', 20, 5, 800.00, 'Professional hair coloring kit', 'packs'),
  ('770e8400-e29b-41d4-a716-446655440003', 'Deep Conditioner', 25, 8, 300.00, 'Nourishing hair conditioner', 'bottles'),
  ('770e8400-e29b-41d4-a716-446655440004', 'Hair Serum', 15, 5, 450.00, 'Smoothing hair serum', 'bottles'),
  ('770e8400-e29b-41d4-a716-446655440005', 'Nail Polish Set', 40, 10, 200.00, 'Set of 5 nail polish colors', 'sets'),
  ('770e8400-e29b-41d4-a716-446655440006', 'Face Mask', 18, 5, 350.00, 'Hydrating face mask', 'packs'),
  ('770e8400-e29b-41d4-a716-446655440007', 'Hair Oil', 22, 8, 400.00, 'Natural hair oil', 'bottles')
ON CONFLICT DO NOTHING;

-- Insert Sample Customers
INSERT INTO customers (id, name, dob, phone, email) VALUES
  ('880e8400-e29b-41d4-a716-446655440001', 'John Doe', '1990-05-15', '+91 98765 12345', 'john@example.com'),
  ('880e8400-e29b-41d4-a716-446655440002', 'Jane Smith', '1985-08-22', '+91 98765 12346', 'jane@example.com'),
  ('880e8400-e29b-41d4-a716-446655440003', 'Mike Johnson', '1992-12-10', '+91 98765 12347', 'mike@example.com'),
  ('880e8400-e29b-41d4-a716-446655440004', 'Sarah Williams', '1988-03-25', '+91 98765 12348', 'sarah@example.com'),
  ('880e8400-e29b-41d4-a716-446655440005', 'David Brown', '1995-07-08', '+91 98765 12349', 'david@example.com')
ON CONFLICT DO NOTHING;

-- Insert Sample Visits (Today's visits for testing)
INSERT INTO visits (id, staff_id, customer_id, visit_date, total_amount, created_at) VALUES
  ('990e8400-e29b-41d4-a716-446655440001', 
   '550e8400-e29b-41d4-a716-446655440001', 
   '880e8400-e29b-41d4-a716-446655440001', 
   CURRENT_DATE, 
   750.00, 
   NOW()),
  ('990e8400-e29b-41d4-a716-446655440002', 
   '550e8400-e29b-41d4-a716-446655440001', 
   '880e8400-e29b-41d4-a716-446655440002', 
   CURRENT_DATE, 
   2000.00, 
   NOW()),
  ('990e8400-e29b-41d4-a716-446655440003', 
   '550e8400-e29b-41d4-a716-446655440002', 
   '880e8400-e29b-41d4-a716-446655440003', 
   CURRENT_DATE, 
   1200.00, 
   NOW())
ON CONFLICT DO NOTHING;

-- Insert Visit Services
INSERT INTO visit_services (id, visit_id, service_id, base_price, final_price) VALUES
  ('aa0e8400-e29b-41d4-a716-446655440001', '990e8400-e29b-41d4-a716-446655440001', '660e8400-e29b-41d4-a716-446655440001', 500.00, 500.00),
  ('aa0e8400-e29b-41d4-a716-446655440002', '990e8400-e29b-41d4-a716-446655440001', '660e8400-e29b-41d4-a716-446655440004', 700.00, 700.00),
  ('aa0e8400-e29b-41d4-a716-446655440003', '990e8400-e29b-41d4-a716-446655440002', '660e8400-e29b-41d4-a716-446655440002', 1500.00, 1500.00),
  ('aa0e8400-e29b-41d4-a716-446655440004', '990e8400-e29b-41d4-a716-446655440002', '660e8400-e29b-41d4-a716-446655440003', 1200.00, 1200.00),
  ('aa0e8400-e29b-41d4-a716-446655440005', '990e8400-e29b-41d4-a716-446655440003', '660e8400-e29b-41d4-a716-446655440003', 1200.00, 1200.00)
ON CONFLICT DO NOTHING;

-- Insert Visit Products
INSERT INTO visit_products (id, visit_id, product_id, quantity, unit_price, total_price) VALUES
  ('bb0e8400-e29b-41d4-a716-446655440001', '990e8400-e29b-41d4-a716-446655440001', '770e8400-e29b-41d4-a716-446655440001', 1, 250.00, 250.00),
  ('bb0e8400-e29b-41d4-a716-446655440002', '990e8400-e29b-41d4-a716-446655440002', '770e8400-e29b-41d4-a716-446655440002', 1, 800.00, 800.00),
  ('bb0e8400-e29b-41d4-a716-446655440003', '990e8400-e29b-41d4-a716-446655440003', '770e8400-e29b-41d4-a716-446655440003', 2, 300.00, 600.00)
ON CONFLICT DO NOTHING;

-- Insert Product Sales
INSERT INTO product_sales (id, visit_id, product_id, staff_id, customer_id, quantity, unit_price, total_price, sale_date) VALUES
  ('cc0e8400-e29b-41d4-a716-446655440001', '990e8400-e29b-41d4-a716-446655440001', '770e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440001', '880e8400-e29b-41d4-a716-446655440001', 1, 250.00, 250.00, CURRENT_DATE),
  ('cc0e8400-e29b-41d4-a716-446655440002', '990e8400-e29b-41d4-a716-446655440002', '770e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440001', '880e8400-e29b-41d4-a716-446655440002', 1, 800.00, 800.00, CURRENT_DATE),
  ('cc0e8400-e29b-41d4-a716-446655440003', '990e8400-e29b-41d4-a716-446655440003', '770e8400-e29b-41d4-a716-446655440003', '550e8400-e29b-41d4-a716-446655440002', '880e8400-e29b-41d4-a716-446655440003', 2, 300.00, 600.00, CURRENT_DATE)
ON CONFLICT DO NOTHING;
