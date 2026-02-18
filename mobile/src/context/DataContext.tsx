import React, {
  createContext,
  useContext,
  useMemo,
  useState,
  useCallback,
  useEffect,
  ReactNode,
} from 'react';
import type {
  Appointment,
  Attendance,
  Branch,
  Customer,
  InventoryItem,
  ProductSale,
  Service,
  UdhaarBalance,
  UdhaarTransaction,
  Visit,
} from '../types';
import { useAuth } from './AuthContext';
import * as supabaseService from '../services/supabaseService';

interface DataContextValue {
  services: Service[];
  customers: Customer[];
  visits: Visit[];
  inventory: InventoryItem[];
  appointments: Appointment[];
  productSales: ProductSale[];
  branches: Branch[];
  loading: boolean;
  error: string | null;
  refreshData: () => Promise<void>;
  addOrUpdateCustomer: (payload: Omit<Customer, 'id'> & { id?: string }) => Promise<Customer>;
  recordVisit: (visit: Omit<Visit, 'id' | 'createdAt'>) => Promise<string>;
  updateInventoryItem: (itemId: string, updates: Partial<InventoryItem>) => Promise<void>;
  addInventoryItem: (item: Omit<InventoryItem, 'id'>) => Promise<void>;
  deleteInventoryItem: (itemId: string) => Promise<void>;
  getStaffTodayStats: (staffId: string, branchId?: string | null) => { totalRevenue: number; customerCount: number; visits: Visit[] };
  getAdminRevenueSummary: () => {
    todayTotal: number;
    monthlyTotal: number;
    yearlyTotal: number;
    byStaffToday: { staffId: string; staffName: string; total: number }[];
    byBranch: { branchId: string; branchName: string; todayTotal: number; monthlyTotal: number; yearlyTotal: number }[];
    paymentBreakdown: { cash: number; upi: number; card: number; udhaar: number };
  };
  getProductSales: (filters?: { staffId?: string; branchId?: string; startDate?: string; endDate?: string }) => Promise<ProductSale[]>;
  attendance: Attendance[];
  getAttendance: (filters?: { staffId?: string; branchId?: string; startDate?: string; endDate?: string; date?: string }) => Promise<Attendance[]>;
  checkIn: (staffId: string, date?: string) => Promise<Attendance>;
  checkOut: (staffId: string, date?: string) => Promise<Attendance>;
  getTodayAttendance: (staffId: string) => Promise<Attendance | null>;
  getBranches: () => Promise<Branch[]>;
  getNextBillNumber: (branchId: string, dateStr?: string) => Promise<string>;
  getUdhaarBalances: (filters?: { branchId?: string; customerId?: string }) => Promise<UdhaarBalance[]>;
  getUdhaarTransactions: (filters: { customerId: string; branchId?: string }) => Promise<UdhaarTransaction[]>;
  addUdhaarPayment: (customerId: string, branchId: string, amount: number, notes?: string) => Promise<void>;
}

const DataContext = createContext<DataContextValue | undefined>(undefined);

interface DataProviderProps {
  children: ReactNode;
}

const startOfDay = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate());

export const DataProvider = ({ children }: DataProviderProps) => {
  const { staffMembers } = useAuth();

  const [services, setServices] = useState<Service[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [visits, setVisits] = useState<Visit[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [productSales, setProductSales] = useState<ProductSale[]>([]);
  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const [
        servicesData,
        customersData,
        visitsData,
        inventoryData,
        productSalesData,
        attendanceData,
        branchesData,
      ] = await Promise.all([
        supabaseService.getServices(),
        supabaseService.getCustomers(),
        supabaseService.getVisits(),
        supabaseService.getInventoryItems(),
        supabaseService.getProductSales(),
        supabaseService.getAttendance(),
        supabaseService.getBranches().catch(() => []),
      ]);

      setServices(servicesData);
      setCustomers(customersData);
      setVisits(visitsData);
      setInventory(inventoryData);
      setProductSales(productSalesData);
      setAttendance(attendanceData);
      setBranches(branchesData);
    } catch (err: any) {
      console.error('Error loading data:', err);
      setError(err.message || 'Failed to load data');
      setServices([]);
      setCustomers([]);
      setVisits([]);
      setInventory([]);
      setProductSales([]);
      setAttendance([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const refreshData = useCallback(async () => {
    await loadData();
  }, [loadData]);

  const addOrUpdateCustomer = useCallback(
    async (payload: Omit<Customer, 'id'> & { id?: string }): Promise<Customer> => {
      try {
        let customer: Customer;
        if (payload.id) {
          customer = await supabaseService.updateCustomer(payload.id, {
            name: payload.name,
            dob: payload.dob,
            phone: payload.phone,
          });
        } else {
          customer = await supabaseService.createCustomer({
            name: payload.name,
            dob: payload.dob,
            phone: payload.phone,
          });
        }
        await refreshData();
        return customer;
      } catch (err: any) {
        console.error('Error saving customer:', err);
        throw err;
      }
    },
    [refreshData],
  );

  const recordVisit = useCallback(
    async (visit: Omit<Visit, 'id' | 'createdAt'>): Promise<string> => {
      try {
        const visitId = await supabaseService.createVisit({
          ...visit,
          products: visit.products || [],
        });
        await refreshData();
        return visitId;
      } catch (err: any) {
        console.error('Error recording visit:', err);
        throw err;
      }
    },
    [refreshData],
  );

  const updateInventoryItem = useCallback(
    async (itemId: string, updates: Partial<InventoryItem>): Promise<void> => {
      try {
        await supabaseService.updateInventoryItem(itemId, updates);
        await refreshData();
      } catch (err: any) {
        console.error('Error updating inventory:', err);
        throw err;
      }
    },
    [refreshData],
  );

  const addInventoryItem = useCallback(
    async (item: Omit<InventoryItem, 'id'>): Promise<void> => {
      try {
        await supabaseService.createInventoryItem(item);
        await refreshData();
      } catch (err: any) {
        console.error('Error adding inventory:', err);
        throw err;
      }
    },
    [refreshData],
  );

  const deleteInventoryItem = useCallback(
    async (itemId: string): Promise<void> => {
      try {
        await supabaseService.deleteInventoryItem(itemId);
        await refreshData();
      } catch (err: any) {
        console.error('Error deleting inventory:', err);
        throw err;
      }
    },
    [refreshData],
  );

  const getProductSales = useCallback(
    async (filters?: {
      staffId?: string;
      branchId?: string;
      startDate?: string;
      endDate?: string;
    }) => {
      try {
        return await supabaseService.getProductSales(filters);
      } catch (err: any) {
        console.error('Error fetching product sales:', err);
        return [];
      }
    },
    [],
  );

  const getBranches = useCallback(async () => {
    try {
      return await supabaseService.getBranches();
    } catch (err: any) {
      console.error('Error fetching branches:', err);
      return [];
    }
  }, []);

  const getNextBillNumber = useCallback(
    (branchId: string, dateStr?: string) => supabaseService.getNextBillNumber(branchId, dateStr),
    [],
  );

  const getUdhaarBalances = useCallback(
    async (filters?: { branchId?: string; customerId?: string }) => {
      try {
        return await supabaseService.getUdhaarBalances(filters);
      } catch (err: any) {
        console.error('Error fetching udhaar balances:', err);
        return [];
      }
    },
    [],
  );

  const getUdhaarTransactions = useCallback(
    async (filters: { customerId: string; branchId?: string }) => {
      try {
        return await supabaseService.getUdhaarTransactions(filters);
      } catch (err: any) {
        console.error('Error fetching udhaar transactions:', err);
        return [];
      }
    },
    [],
  );

  const addUdhaarPayment = useCallback(
    async (customerId: string, branchId: string, amount: number, notes?: string) => {
      await supabaseService.addUdhaarPayment(customerId, branchId, amount, notes);
      await refreshData();
    },
    [refreshData],
  );

  const getAttendance = useCallback(
    async (filters?: { staffId?: string; startDate?: string; endDate?: string; date?: string }) => {
      try {
        const data = await supabaseService.getAttendance(filters);
        if (!filters) {
          setAttendance(data);
        }
        return data;
      } catch (err: any) {
        console.error('Error fetching attendance:', err);
        return [];
      }
    },
    [],
  );

  const checkIn = useCallback(
    async (staffId: string, date?: string): Promise<Attendance> => {
      try {
        const result = await supabaseService.checkIn(staffId, date);
        await refreshData();
        return result;
      } catch (err: any) {
        console.error('Error checking in:', err);
        throw err;
      }
    },
    [refreshData],
  );

  const checkOut = useCallback(
    async (staffId: string, date?: string): Promise<Attendance> => {
      try {
        const result = await supabaseService.checkOut(staffId, date);
        await refreshData();
        return result;
      } catch (err: any) {
        console.error('Error checking out:', err);
        throw err;
      }
    },
    [refreshData],
  );

  const getTodayAttendance = useCallback(
    async (staffId: string): Promise<Attendance | null> => {
      try {
        return await supabaseService.getTodayAttendance(staffId);
      } catch (err: any) {
        console.error('Error fetching today attendance:', err);
        return null;
      }
    },
    [],
  );

  const getStaffTodayStats = useCallback(
    (staffId: string, branchId?: string | null) => {
      const today = startOfDay(new Date());
      const todayStr = today.toISOString().split('T')[0];
      const todayVisits = visits.filter(v => {
        const visitDate = v.date.split('T')[0];
        const matchStaff = v.staffId === staffId && visitDate === todayStr;
        if (branchId) {
          return matchStaff && (v.branchId === branchId || !v.branchId);
        }
        return matchStaff;
      });
      const totalRevenue = todayVisits.reduce((sum, v) => sum + v.total, 0);
      const customerCount = todayVisits.length;
      return { totalRevenue, customerCount, visits: todayVisits };
    },
    [visits],
  );

  const getAdminRevenueSummary = useCallback(() => {
    const now = new Date();
    const today = startOfDay(now);
    const todayStr = today.toISOString().split('T')[0];
    const month = now.getMonth();
    const year = now.getFullYear();

    let todayTotal = 0;
    let monthlyTotal = 0;
    let yearlyTotal = 0;
    const todayByStaff: Record<string, number> = {};
    const byBranchMap: Record<
      string,
      { todayTotal: number; monthlyTotal: number; yearlyTotal: number }
    > = {};
    const paymentBreakdown = { cash: 0, upi: 0, card: 0, udhaar: 0 };

    visits.forEach(v => {
      const visitDate = new Date(v.date);
      const visitDateStr = v.date.split('T')[0];
      const mode = v.paymentMode || 'cash';

      if (visitDate.getFullYear() === year) {
        yearlyTotal += v.total;
        if (visitDate.getMonth() === month) {
          monthlyTotal += v.total;
        }
      }
      if (visitDateStr === todayStr) {
        todayTotal += v.total;
        paymentBreakdown[mode] = (paymentBreakdown[mode] || 0) + v.total;
        todayByStaff[v.staffId] = (todayByStaff[v.staffId] || 0) + v.total;
        const bid = v.branchId || 'default';
        if (!byBranchMap[bid]) byBranchMap[bid] = { todayTotal: 0, monthlyTotal: 0, yearlyTotal: 0 };
        byBranchMap[bid].todayTotal += v.total;
      }
      const bid = v.branchId || 'default';
      if (!byBranchMap[bid]) byBranchMap[bid] = { todayTotal: 0, monthlyTotal: 0, yearlyTotal: 0 };
      if (visitDate.getFullYear() === year) {
        byBranchMap[bid].yearlyTotal += v.total;
        if (visitDate.getMonth() === month) byBranchMap[bid].monthlyTotal += v.total;
      }
    });

    const byStaffToday = staffMembers.map(s => ({
      staffId: s.id,
      staffName: s.name,
      total: todayByStaff[s.id] || 0,
    }));

    const branchIdToName: Record<string, string> = {};
    branches.forEach(b => {
      branchIdToName[b.id] = b.name;
    });
    const byBranch = Object.entries(byBranchMap).map(([branchId, totals]) => ({
      branchId,
      branchName: branchIdToName[branchId] || (branchId === 'default' ? 'All / Unassigned' : branchId),
      ...totals,
    }));

    return {
      todayTotal,
      monthlyTotal,
      yearlyTotal,
      byStaffToday,
      byBranch,
      paymentBreakdown,
    };
  }, [visits, staffMembers, branches]);

  const value: DataContextValue = useMemo(
    () => ({
      services,
      customers,
      visits,
      inventory,
      appointments,
      productSales,
      branches,
      attendance,
      loading,
      error,
      refreshData,
      addOrUpdateCustomer,
      recordVisit,
      updateInventoryItem,
      addInventoryItem,
      deleteInventoryItem,
      getStaffTodayStats,
      getAdminRevenueSummary,
      getProductSales,
      getAttendance,
      checkIn,
      checkOut,
      getTodayAttendance,
      getBranches,
      getNextBillNumber,
      getUdhaarBalances,
      getUdhaarTransactions,
      addUdhaarPayment,
    }),
    [
      services,
      customers,
      visits,
      inventory,
      appointments,
      productSales,
      branches,
      attendance,
      loading,
      error,
      refreshData,
      addOrUpdateCustomer,
      recordVisit,
      updateInventoryItem,
      addInventoryItem,
      deleteInventoryItem,
      getStaffTodayStats,
      getAdminRevenueSummary,
      getProductSales,
      getAttendance,
      checkIn,
      checkOut,
      getTodayAttendance,
      getBranches,
      getNextBillNumber,
      getUdhaarBalances,
      getUdhaarTransactions,
      addUdhaarPayment,
    ],
  );

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
};

export const useData = (): DataContextValue => {
  const ctx = useContext(DataContext);
  if (!ctx) {
    throw new Error('useData must be used within DataProvider');
  }
  return ctx;
};
