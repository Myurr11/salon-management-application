import { supabase } from '../config/supabase';
import type {
  Attendance,
  Branch,
  Customer,
  InventoryItem,
  ProductSale,
  Service,
  StaffMember,
  UdhaarBalance,
  UdhaarTransaction,
  Visit,
  VisitProductLine,
  VisitServiceLine,
} from '../types';

// Branches
export const getBranches = async (): Promise<Branch[]> => {
  const { data, error } = await supabase.from('branches').select('*').order('name');
  if (error) throw error;
  return (data || []).map(item => ({ id: item.id, name: item.name }));
};

// Staff Members (with optional branch filter)
export const getStaffMembers = async (branchId?: string | null): Promise<StaffMember[]> => {
  let query = supabase.from('staff_members').select('id, name, branch_id').order('name');
  if (branchId) {
    query = query.eq('branch_id', branchId);
  }
  const { data, error } = await query;
  if (error) throw error;
  return (data || []).map((item: any) => ({
    id: item.id,
    name: item.name,
    branchId: item.branch_id ?? undefined,
  }));
};

// Customers
export const getCustomers = async (): Promise<Customer[]> => {
  const { data, error } = await supabase.from('customers').select('*').order('name');
  if (error) throw error;
  return (data || []).map((item: any) => ({
    id: item.id,
    name: item.name,
    dob: item.dob || undefined,
    phone: item.phone || undefined,
    email: item.email || undefined,
    address: item.address || undefined,
    gender: item.gender || undefined,
  }));
};

export const createCustomer = async (customer: Omit<Customer, 'id'>): Promise<Customer> => {
  const payload: any = {
    name: customer.name,
    dob: customer.dob || null,
    phone: customer.phone || null,
    email: customer.email || null,
    address: customer.address || null,
    gender: customer.gender || null,
  };
  const { data, error } = await supabase.from('customers').insert(payload).select().single();
  if (error) throw error;
  return {
    id: data.id,
    name: data.name,
    dob: data.dob || undefined,
    phone: data.phone || undefined,
    email: data.email || undefined,
    address: data.address || undefined,
    gender: data.gender || undefined,
  };
};

export const updateCustomer = async (
  id: string,
  updates: Partial<Omit<Customer, 'id'>>,
): Promise<Customer> => {
  const payload: any = {};
  if (updates.name !== undefined) payload.name = updates.name;
  if (updates.dob !== undefined) payload.dob = updates.dob;
  if (updates.phone !== undefined) payload.phone = updates.phone;
  if (updates.email !== undefined) payload.email = updates.email;
  if (updates.address !== undefined) payload.address = updates.address;
  if (updates.gender !== undefined) payload.gender = updates.gender;
  const { data, error } = await supabase
    .from('customers')
    .update(payload)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return {
    id: data.id,
    name: data.name,
    dob: data.dob || undefined,
    phone: data.phone || undefined,
    email: data.email || undefined,
    address: data.address || undefined,
    gender: data.gender || undefined,
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

// Inventory (optional branchId filter for branch-level inventory)
export const getInventoryItems = async (branchId?: string | null): Promise<InventoryItem[]> => {
  let query = supabase.from('inventory_items').select('*').order('name');
  if (branchId) {
    query = query.eq('branch_id', branchId);
  }
  const { data, error } = await query;
  if (error) throw error;
  return (data || []).map((item: any) => ({
    id: item.id,
    name: item.name,
    quantity: item.quantity,
    minThreshold: item.min_threshold,
    price: parseFloat(item.price),
    costPrice: item.cost_price != null ? parseFloat(item.cost_price) : undefined,
    branchId: item.branch_id || undefined,
  }));
};

export const createInventoryItem = async (
  item: Omit<InventoryItem, 'id' | 'branchName'>,
): Promise<InventoryItem> => {
  const payload: any = {
    name: item.name,
    quantity: item.quantity,
    min_threshold: item.minThreshold,
    price: item.price,
    cost_price: item.costPrice ?? item.price,
    branch_id: item.branchId || null,
  };
  const { data, error } = await supabase.from('inventory_items').insert(payload).select().single();
  if (error) throw error;
  return {
    id: data.id,
    name: data.name,
    quantity: data.quantity,
    minThreshold: data.min_threshold,
    price: parseFloat(data.price),
    costPrice: data.cost_price != null ? parseFloat(data.cost_price) : undefined,
    branchId: data.branch_id || undefined,
  };
};

export const updateInventoryItem = async (
  id: string,
  updates: Partial<Omit<InventoryItem, 'id' | 'branchName'>>,
): Promise<InventoryItem> => {
  const updateData: any = {};
  if (updates.name !== undefined) updateData.name = updates.name;
  if (updates.quantity !== undefined) updateData.quantity = updates.quantity;
  if (updates.minThreshold !== undefined) updateData.min_threshold = updates.minThreshold;
  if (updates.price !== undefined) updateData.price = updates.price;
  if (updates.costPrice !== undefined) updateData.cost_price = updates.costPrice;
  if (updates.branchId !== undefined) updateData.branch_id = updates.branchId;

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
    costPrice: data.cost_price != null ? parseFloat(data.cost_price) : undefined,
    branchId: data.branch_id || undefined,
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
  branchId?: string;
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
  if (filters?.branchId) {
    query = query.eq('branch_id', filters.branchId);
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
        branchId: visit.branch_id || undefined,
        branchName: undefined,
        date: visit.visit_date,
        createdAt: visit.created_at,
        services,
        products,
        total: parseFloat(visit.total_amount),
        paymentMode: visit.payment_mode || 'cash',
        discountAmount: visit.discount_amount != null ? parseFloat(visit.discount_amount) : 0,
        discountPercent: visit.discount_percent != null ? parseFloat(visit.discount_percent) : 0,
        amountOverride: visit.amount_override != null ? parseFloat(visit.amount_override) : undefined,
        overrideReason: visit.override_reason || undefined,
        billNumber: visit.bill_number || undefined,
      };
    }),
  );

  return visitsWithDetails;
};

export const getNextBillNumber = async (
  branchId: string,
  dateStr?: string,
): Promise<string> => {
  const date = (dateStr || new Date().toISOString().split('T')[0]).replace(/-/g, '');
  const prefix = `INV-${date}-`;
  const { data, error } = await supabase
    .from('visits')
    .select('bill_number')
    .eq('branch_id', branchId)
    .like('bill_number', `${prefix}%`)
    .order('bill_number', { ascending: false })
    .limit(1);
  if (error) throw error;
  const last = data?.[0]?.bill_number;
  const nextNum = last ? parseInt(last.replace(prefix, ''), 10) + 1 : 1;
  return `${prefix}${String(nextNum).padStart(3, '0')}`;
};

export const createVisit = async (visit: Omit<Visit, 'id' | 'createdAt'>): Promise<string> => {
  const branchId = visit.branchId || '00000000-0000-0000-0000-000000000001';
  let billNumber = visit.billNumber;
  if (!billNumber) {
    billNumber = await getNextBillNumber(branchId, visit.date);
  }

  const insertPayload: any = {
    staff_id: visit.staffId,
    customer_id: visit.customerId,
    visit_date: visit.date,
    total_amount: visit.total,
    branch_id: branchId,
    payment_mode: visit.paymentMode || 'cash',
    discount_amount: visit.discountAmount ?? 0,
    discount_percent: visit.discountPercent ?? 0,
    amount_override: visit.amountOverride ?? null,
    override_reason: visit.overrideReason || null,
    bill_number: billNumber,
  };

  const { data: visitData, error: visitError } = await supabase
    .from('visits')
    .insert(insertPayload)
    .select()
    .single();

  if (visitError) throw visitError;
  const visitId = visitData.id;

  // If payment mode is udhaar, add to customer's credit balance
  if ((visit.paymentMode || 'cash') === 'udhaar' && visit.total > 0) {
    await addUdhaarSale(visit.customerId, branchId, visit.total, visitId);
  }

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

    // Create product sales records (with branch_id for analytics)
    const salesToInsert = visit.products.map(p => ({
      visit_id: visitId,
      product_id: p.productId,
      staff_id: visit.staffId,
      customer_id: visit.customerId,
      quantity: p.quantity,
      unit_price: p.unitPrice,
      total_price: p.totalPrice,
      sale_date: visit.date,
      branch_id: branchId,
    }));

    const { error: salesError } = await supabase.from('product_sales').insert(salesToInsert);
    if (salesError) throw salesError;
  }

  return visitId;
};

// Product Sales
export const getProductSales = async (filters?: {
  staffId?: string;
  branchId?: string;
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
  if (filters?.branchId) {
    query = query.eq('branch_id', filters.branchId);
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
  branchId?: string;
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
  if (filters?.branchId) {
    query = query.eq('branch_id', filters.branchId);
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

  const { data: staffRow } = await supabase
    .from('staff_members')
    .select('branch_id')
    .eq('id', staffId)
    .single();
  const branchId = staffRow?.branch_id || null;

  const { data: existing } = await supabase
    .from('attendance')
    .select('*')
    .eq('staff_id', staffId)
    .eq('attendance_date', attendanceDate)
    .single();

  let result;
  if (existing) {
    const { data, error } = await supabase
      .from('attendance')
      .update({
        check_in_time: checkInTime,
        status: 'present',
        updated_at: checkInTime,
        ...(branchId && { branch_id: branchId }),
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
    const { data, error } = await supabase
      .from('attendance')
      .insert({
        staff_id: staffId,
        attendance_date: attendanceDate,
        check_in_time: checkInTime,
        status: 'present',
        branch_id: branchId,
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
    branchId: data.branch_id || undefined,
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
    branchId: data.branch_id || undefined,
  };
};

// Udhaar (credit) management
export const getUdhaarBalances = async (filters?: {
  branchId?: string;
  customerId?: string;
}): Promise<UdhaarBalance[]> => {
  let query = supabase
    .from('udhaar_balance')
    .select('*, customers(name), branches(name)')
    .gte('outstanding_amount', 0.01)
    .order('outstanding_amount', { ascending: false });
  if (filters?.branchId) query = query.eq('branch_id', filters.branchId);
  if (filters?.customerId) query = query.eq('customer_id', filters.customerId);
  const { data, error } = await query;
  if (error) throw error;
  return (data || []).map((row: any) => ({
    id: row.id,
    customerId: row.customer_id,
    customerName: row.customers?.name,
    branchId: row.branch_id,
    branchName: row.branches?.name,
    outstandingAmount: parseFloat(row.outstanding_amount),
    dueDate: row.due_date || undefined,
    reminderSentAt: row.reminder_sent_at || undefined,
    updatedAt: row.updated_at,
  }));
};

export const getUdhaarTransactions = async (filters: {
  customerId: string;
  branchId?: string;
}): Promise<UdhaarTransaction[]> => {
  let query = supabase
    .from('udhaar_transactions')
    .select('*')
    .eq('customer_id', filters.customerId)
    .order('created_at', { ascending: false });
  if (filters.branchId) query = query.eq('branch_id', filters.branchId);
  const { data, error } = await query;
  if (error) throw error;
  return (data || []).map((row: any) => ({
    id: row.id,
    customerId: row.customer_id,
    branchId: row.branch_id,
    type: row.type,
    amount: parseFloat(row.amount),
    visitId: row.visit_id || undefined,
    paymentDate: row.payment_date || undefined,
    notes: row.notes || undefined,
    createdAt: row.created_at,
  }));
};

export const addUdhaarSale = async (
  customerId: string,
  branchId: string,
  amount: number,
  visitId: string,
): Promise<void> => {
  const { data: existing } = await supabase
    .from('udhaar_balance')
    .select('*')
    .eq('customer_id', customerId)
    .eq('branch_id', branchId)
    .single();

  const newOutstanding = (existing ? parseFloat(existing.outstanding_amount) : 0) + amount;
  const now = new Date().toISOString();

  if (existing) {
    await supabase
      .from('udhaar_balance')
      .update({ outstanding_amount: newOutstanding, updated_at: now })
      .eq('id', existing.id);
  } else {
    await supabase.from('udhaar_balance').insert({
      customer_id: customerId,
      branch_id: branchId,
      outstanding_amount: newOutstanding,
      updated_at: now,
    });
  }

  await supabase.from('udhaar_transactions').insert({
    customer_id: customerId,
    branch_id: branchId,
    type: 'sale',
    amount,
    visit_id: visitId,
  });
};

export const addUdhaarPayment = async (
  customerId: string,
  branchId: string,
  amount: number,
  notes?: string,
): Promise<void> => {
  const { data: balance } = await supabase
    .from('udhaar_balance')
    .select('*')
    .eq('customer_id', customerId)
    .eq('branch_id', branchId)
    .single();
  if (!balance) throw new Error('No udhaar balance found for this customer and branch');
  const newOutstanding = Math.max(0, parseFloat(balance.outstanding_amount) - amount);
  const now = new Date().toISOString();
  const today = now.split('T')[0];

  await supabase
    .from('udhaar_balance')
    .update({ outstanding_amount: newOutstanding, updated_at: now })
    .eq('id', balance.id);

  await supabase.from('udhaar_transactions').insert({
    customer_id: customerId,
    branch_id: branchId,
    type: 'payment',
    amount,
    payment_date: today,
    notes: notes || null,
  });
};
