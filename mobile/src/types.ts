export type UserRole = 'admin' | 'staff';

export type PaymentMode = 'cash' | 'upi' | 'card' | 'udhaar';

export interface Branch {
  id: string;
  name: string;
}

export interface StaffMember {
  id: string;
  name: string;
  branchId?: string | null;
  branchName?: string | null;
  username?: string | null;
}

export interface Service {
  id: string;
  name: string;
  price: number;
}

export type Gender = 'male' | 'female' | 'other';

export interface Customer {
  id: string;
  name: string;
  dob?: string;
  phone?: string;
  email?: string;
  address?: string;
  gender?: Gender | null;
}

export interface VisitServiceLine {
  id: string;
  serviceId: string;
  serviceName: string;
  basePrice: number;
  finalPrice: number;
}

export interface VisitProductLine {
  id: string;
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

export interface Visit {
  id: string;
  staffId: string;
  staffName: string;
  customerId: string;
  customerName: string;
  branchId?: string | null;
  branchName?: string | null;
  date: string;
  createdAt: string;
  services: VisitServiceLine[];
  products: VisitProductLine[];
  total: number;
  paymentMode?: PaymentMode;
  discountAmount?: number;
  discountPercent?: number;
  amountOverride?: number | null;
  overrideReason?: string | null;
  billNumber?: string | null;
}

export interface InventoryItem {
  id: string;
  name: string;
  quantity: number;
  minThreshold: number;
  price: number;
  costPrice?: number | null;
  branchId?: string | null;
  branchName?: string | null;
}

export interface ProductSale {
  id: string;
  visitId: string;
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  staffId: string;
  staffName: string;
  customerId: string;
  customerName: string;
  date: string;
}

export type AppointmentStatus = 'scheduled' | 'completed' | 'cancelled';

export interface Appointment {
  id: string;
  customerId: string;
  customerName: string;
  staffId: string;
  staffName: string;
  time: string;
  status: AppointmentStatus;
  serviceIds: string[];
}

export type AttendanceStatus = 'present' | 'absent' | 'late' | 'half_day';

export interface Attendance {
  id: string;
  staffId: string;
  staffName: string;
  attendanceDate: string;
  checkInTime?: string;
  checkOutTime?: string;
  status: AttendanceStatus;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  branchId?: string | null;
  branchName?: string | null;
}

// Udhaar (credit) management
export interface UdhaarBalance {
  id: string;
  customerId: string;
  customerName?: string;
  branchId: string;
  branchName?: string;
  outstandingAmount: number;
  dueDate?: string | null;
  reminderSentAt?: string | null;
  updatedAt: string;
}

export interface UdhaarTransaction {
  id: string;
  customerId: string;
  branchId: string;
  type: 'sale' | 'payment';
  amount: number;
  visitId?: string | null;
  paymentDate?: string | null;
  notes?: string | null;
  createdAt: string;
}

