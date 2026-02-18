export type UserRole = 'admin' | 'staff';

export interface StaffMember {
  id: string;
  name: string;
}

export interface Service {
  id: string;
  name: string;
  price: number;
}

export interface Customer {
  id: string;
  name: string;
  dob?: string;
  phone?: string;
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
  date: string;
  createdAt: string;
  services: VisitServiceLine[];
  products: VisitProductLine[];
  total: number;
}

export interface InventoryItem {
  id: string;
  name: string;
  quantity: number;
  minThreshold: number;
  price: number;
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
}

