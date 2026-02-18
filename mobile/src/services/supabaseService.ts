import { supabase } from '../config/supabase';
import type {
  Attendance,
  Customer,
  InventoryItem,
  ProductSale,
  Service,
  StaffMember,
  Visit,
  VisitProductLine,
  VisitServiceLine,
} from '../types';

// Staff Members
export const getStaffMembers = async (): Promise<StaffMember[]> => {
  const { data, error } = await supabase.from('staff_members').select('*').order('name');
  if (error) throw error;
  return data.map(item => ({ id: item.id, name: item.name }));
};

// Customers
export const getCustomers = async (): Promise<Customer[]> => {
  const { data, error } = await supabase.from('customers').select('*').order('name');
  if (error) throw error;
  return data.map(item => ({
    id: item.id,
    name: item.name,
    dob: item.dob || undefined,
    phone: item.phone || undefined,
  }));
};

export const createCustomer = async (customer: Omit<Customer, 'id'>): Promise<Customer> => {
  const { data, error } = await supabase.from('customers').insert(customer).select().single();
  if (error) throw error;
  return {
    id: data.id,
    name: data.name,
    dob: data.dob || undefined,
    phone: data.phone || undefined,
  };
};

export const updateCustomer = async (
  id: string,
  updates: Partial<Omit<Customer, 'id'>>,
): Promise<Customer> => {
  const { data, error } = await supabase
    .from('customers')
    .update(updates)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return {
    id: data.id,
    name: data.name,
    dob: data.dob || undefined,
    phone: data.phone || undefined,
  };
};

// Services
export const getServices = async (): Promise<Service[]> => {
  const { data, error } = await supabase
    .from('services')
    .select('*')
    .eq('is_active', true)
    .order('name');
  if (error) throw error;
  return data.map(item => ({
    id: item.id,
    name: item.name,
    price: parseFloat(item.price),
  }));
};

// Inventory
export const getInventoryItems = async (): Promise<InventoryItem[]> => {
  const { data, error } = await supabase.from('inventory_items').select('*').order('name');
  if (error) throw error;
  return data.map(item => ({
    id: item.id,
    name: item.name,
    quantity: item.quantity,
    minThreshold: item.min_threshold,
    price: parseFloat(item.price),
  }));
};

export const createInventoryItem = async (
  item: Omit<InventoryItem, 'id'>,
): Promise<InventoryItem> => {
  const { data, error } = await supabase
    .from('inventory_items')
    .insert({
      name: item.name,
      quantity: item.quantity,
      min_threshold: item.minThreshold,
      price: item.price,
    })
    .select()
    .single();
  if (error) throw error;
  return {
    id: data.id,
    name: data.name,
    quantity: data.quantity,
    minThreshold: data.min_threshold,
    price: parseFloat(data.price),
  };
};

export const updateInventoryItem = async (
  id: string,
  updates: Partial<Omit<InventoryItem, 'id'>>,
): Promise<InventoryItem> => {
  const updateData: any = {};
  if (updates.name !== undefined) updateData.name = updates.name;
  if (updates.quantity !== undefined) updateData.quantity = updates.quantity;
  if (updates.minThreshold !== undefined) updateData.min_threshold = updates.minThreshold;
  if (updates.price !== undefined) updateData.price = updates.price;

  const { data, error } = await supabase
    .from('inventory_items')
    .update(updateData)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return {
    id: data.id,
    name: data.name,
    quantity: data.quantity,
    minThreshold: data.min_threshold,
    price: parseFloat(data.price),
  };
};

export const deleteInventoryItem = async (id: string): Promise<void> => {
  const { error } = await supabase.from('inventory_items').delete().eq('id', id);
  if (error) throw error;
};

// Visits
export const getVisits = async (filters?: {
  staffId?: string;
  customerId?: string;
  startDate?: string;
  endDate?: string;
}): Promise<Visit[]> => {
  let query = supabase
    .from('visits')
    .select(
      `
      *,
      staff_members(name),
      customers(name)
    `,
    )
    .order('created_at', { ascending: false });

  if (filters?.staffId) {
    query = query.eq('staff_id', filters.staffId);
  }
  if (filters?.customerId) {
    query = query.eq('customer_id', filters.customerId);
  }
  if (filters?.startDate) {
    query = query.gte('visit_date', filters.startDate);
  }
  if (filters?.endDate) {
    query = query.lte('visit_date', filters.endDate);
  }

  const { data, error } = await query;
  if (error) throw error;

  // Fetch services and products for each visit
  const visitsWithDetails = await Promise.all(
    data.map(async visit => {
      const [servicesData, productsData] = await Promise.all([
        supabase
          .from('visit_services')
          .select(
            `
            *,
            services(id, name, price)
          `,
          )
          .eq('visit_id', visit.id),
        supabase
          .from('visit_products')
          .select(
            `
            *,
            inventory_items(id, name, price)
          `,
          )
          .eq('visit_id', visit.id),
      ]);

      const services: VisitServiceLine[] =
        servicesData.data?.map(s => ({
          id: s.id,
          serviceId: s.service_id,
          serviceName: s.services?.name || 'Unknown',
          basePrice: parseFloat(s.base_price),
          finalPrice: parseFloat(s.final_price),
        })) || [];

      const products: VisitProductLine[] =
        productsData.data?.map(p => ({
          id: p.id,
          productId: p.product_id,
          productName: p.inventory_items?.name || 'Unknown',
          quantity: p.quantity,
          unitPrice: parseFloat(p.unit_price),
          totalPrice: parseFloat(p.total_price),
        })) || [];

      return {
        id: visit.id,
        staffId: visit.staff_id,
        staffName: visit.staff_members?.name || 'Unknown',
        customerId: visit.customer_id,
        customerName: visit.customers?.name || 'Unknown',
        date: visit.visit_date,
        createdAt: visit.created_at,
        services,
        products,
        total: parseFloat(visit.total_amount),
      };
    }),
  );

  return visitsWithDetails;
};

export const createVisit = async (visit: Omit<Visit, 'id' | 'createdAt'>): Promise<string> => {
  // Create the visit
  const { data: visitData, error: visitError } = await supabase
    .from('visits')
    .insert({
      staff_id: visit.staffId,
      customer_id: visit.customerId,
      visit_date: visit.date,
      total_amount: visit.total,
    })
    .select()
    .single();

  if (visitError) throw visitError;
  const visitId = visitData.id;

  // Create visit services
  if (visit.services && visit.services.length > 0) {
    const servicesToInsert = visit.services.map(s => ({
      visit_id: visitId,
      service_id: s.serviceId,
      base_price: s.basePrice,
      final_price: s.finalPrice,
    }));

    const { error: servicesError } = await supabase
      .from('visit_services')
      .insert(servicesToInsert);
    if (servicesError) throw servicesError;
  }

  // Create visit products and update inventory
  if (visit.products && visit.products.length > 0) {
    const productsToInsert = visit.products.map(p => ({
      visit_id: visitId,
      product_id: p.productId,
      quantity: p.quantity,
      unit_price: p.unitPrice,
      total_price: p.totalPrice,
    }));

    const { error: productsError } = await supabase
      .from('visit_products')
      .insert(productsToInsert);
    if (productsError) throw productsError;

    // Update inventory quantities
    for (const product of visit.products) {
      const { data: currentItem } = await supabase
        .from('inventory_items')
        .select('quantity')
        .eq('id', product.productId)
        .single();

      if (currentItem) {
        const newQuantity = Math.max(0, currentItem.quantity - product.quantity);
        await supabase
          .from('inventory_items')
          .update({ quantity: newQuantity })
          .eq('id', product.productId);
      }
    }

    // Create product sales records
    const salesToInsert = visit.products.map(p => ({
      visit_id: visitId,
      product_id: p.productId,
      staff_id: visit.staffId,
      customer_id: visit.customerId,
      quantity: p.quantity,
      unit_price: p.unitPrice,
      total_price: p.totalPrice,
      sale_date: visit.date,
    }));

    const { error: salesError } = await supabase.from('product_sales').insert(salesToInsert);
    if (salesError) throw salesError;
  }

  return visitId;
};

// Product Sales
export const getProductSales = async (filters?: {
  staffId?: string;
  startDate?: string;
  endDate?: string;
}): Promise<ProductSale[]> => {
  let query = supabase
    .from('product_sales')
    .select(
      `
      *,
      staff_members(name),
      customers(name),
      inventory_items(name)
    `,
    )
    .order('created_at', { ascending: false });

  if (filters?.staffId) {
    query = query.eq('staff_id', filters.staffId);
  }
  if (filters?.startDate) {
    query = query.gte('sale_date', filters.startDate);
  }
  if (filters?.endDate) {
    query = query.lte('sale_date', filters.endDate);
  }

  const { data, error } = await query;
  if (error) throw error;

  return data.map(item => ({
    id: item.id,
    visitId: item.visit_id,
    productId: item.product_id,
    productName: item.inventory_items?.name || 'Unknown',
    quantity: item.quantity,
    unitPrice: parseFloat(item.unit_price),
    totalPrice: parseFloat(item.total_price),
    staffId: item.staff_id,
    staffName: item.staff_members?.name || 'Unknown',
    customerId: item.customer_id,
    customerName: item.customers?.name || 'Unknown',
    date: item.sale_date,
  }));
};

// Attendance
export const getAttendance = async (filters?: {
  staffId?: string;
  startDate?: string;
  endDate?: string;
  date?: string;
}): Promise<Attendance[]> => {
  let query = supabase
    .from('attendance')
    .select(
      `
      *,
      staff_members(name)
    `,
    )
    .order('attendance_date', { ascending: false });

  if (filters?.staffId) {
    query = query.eq('staff_id', filters.staffId);
  }
  if (filters?.date) {
    query = query.eq('attendance_date', filters.date);
  }
  if (filters?.startDate) {
    query = query.gte('attendance_date', filters.startDate);
  }
  if (filters?.endDate) {
    query = query.lte('attendance_date', filters.endDate);
  }

  const { data, error } = await query;
  if (error) throw error;

  return data.map(item => ({
    id: item.id,
    staffId: item.staff_id,
    staffName: item.staff_members?.name || 'Unknown',
    attendanceDate: item.attendance_date,
    checkInTime: item.check_in_time || undefined,
    checkOutTime: item.check_out_time || undefined,
    status: item.status,
    notes: item.notes || undefined,
    createdAt: item.created_at,
    updatedAt: item.updated_at,
  }));
};

export const checkIn = async (staffId: string, date?: string): Promise<Attendance> => {
  const attendanceDate = date || new Date().toISOString().split('T')[0];
  const checkInTime = new Date().toISOString();

  // Check if attendance record already exists for today
  const { data: existing } = await supabase
    .from('attendance')
    .select('*')
    .eq('staff_id', staffId)
    .eq('attendance_date', attendanceDate)
    .single();

  let result;
  if (existing) {
    // Update existing record
    const { data, error } = await supabase
      .from('attendance')
      .update({
        check_in_time: checkInTime,
        status: 'present',
        updated_at: checkInTime,
      })
      .eq('id', existing.id)
      .select(
        `
        *,
        staff_members(name)
      `,
      )
      .single();
    if (error) throw error;
    result = data;
  } else {
    // Create new record
    const { data, error } = await supabase
      .from('attendance')
      .insert({
        staff_id: staffId,
        attendance_date: attendanceDate,
        check_in_time: checkInTime,
        status: 'present',
      })
      .select(
        `
        *,
        staff_members(name)
      `,
      )
      .single();
    if (error) throw error;
    result = data;
  }

  return {
    id: result.id,
    staffId: result.staff_id,
    staffName: result.staff_members?.name || 'Unknown',
    attendanceDate: result.attendance_date,
    checkInTime: result.check_in_time || undefined,
    checkOutTime: result.check_out_time || undefined,
    status: result.status,
    notes: result.notes || undefined,
    createdAt: result.created_at,
    updatedAt: result.updated_at,
  };
};

export const checkOut = async (staffId: string, date?: string): Promise<Attendance> => {
  const attendanceDate = date || new Date().toISOString().split('T')[0];
  const checkOutTime = new Date().toISOString();

  // Find today's attendance record
  const { data: existing, error: findError } = await supabase
    .from('attendance')
    .select('*')
    .eq('staff_id', staffId)
    .eq('attendance_date', attendanceDate)
    .single();

  if (findError || !existing) {
    throw new Error('No check-in record found. Please check in first.');
  }

  const { data, error } = await supabase
    .from('attendance')
    .update({
      check_out_time: checkOutTime,
      updated_at: checkOutTime,
    })
    .eq('id', existing.id)
    .select(
      `
      *,
      staff_members(name)
    `,
    )
    .single();

  if (error) throw error;

  return {
    id: data.id,
    staffId: data.staff_id,
    staffName: data.staff_members?.name || 'Unknown',
    attendanceDate: data.attendance_date,
    checkInTime: data.check_in_time || undefined,
    checkOutTime: data.check_out_time || undefined,
    status: data.status,
    notes: data.notes || undefined,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  };
};

export const getTodayAttendance = async (staffId: string): Promise<Attendance | null> => {
  const today = new Date().toISOString().split('T')[0];
  const { data, error } = await supabase
    .from('attendance')
    .select(
      `
      *,
      staff_members(name)
    `,
    )
    .eq('staff_id', staffId)
    .eq('attendance_date', today)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      // No record found
      return null;
    }
    throw error;
  }

  return {
    id: data.id,
    staffId: data.staff_id,
    staffName: data.staff_members?.name || 'Unknown',
    attendanceDate: data.attendance_date,
    checkInTime: data.check_in_time || undefined,
    checkOutTime: data.check_out_time || undefined,
    status: data.status,
    notes: data.notes || undefined,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  };
};
