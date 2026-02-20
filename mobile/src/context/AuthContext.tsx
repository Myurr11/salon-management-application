import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import bcrypt from 'bcryptjs';
import type { UserRole, StaffMember } from '../types';
import * as supabaseService from '../services/supabaseService';

interface AuthUser {
  id: string;
  name: string;
  role: UserRole;
  branchId?: string | null;
}

interface AuthContextValue {
  user: AuthUser | null;
  staffMembers: StaffMember[];
  setUser: (user: AuthUser | null) => void;
  login: (username: string, password: string) => Promise<'admin' | 'staff' | 'shared_tablet' | null>;
  logout: () => void;
  refreshStaffMembers: () => Promise<void>;
  loading: boolean;
  loginError: string | null;
  // Shared tablet mode
  selectedStaffId: string | null;
  setSelectedStaff: (staffId: string | null) => void;
  isSharedTabletMode: boolean;
  getEffectiveStaffId: () => string | null;
  // Staff password verification for shared tablet
  verifyStaffPassword: (staffId: string, password: string) => Promise<boolean>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

const DEFAULT_ADMIN_USERNAME = 'admin';
const DEFAULT_ADMIN_PASSWORD = 'admin123';
const DEFAULT_STAFF_PASSWORD_WHEN_NULL = 'staff123';

// Shared tablet credentials for salon-wide device
const SHARED_TABLET_USERNAME = 'salon';
const SHARED_TABLET_PASSWORD = 'salon123';

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [staffMembers, setStaffMembers] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [selectedStaffId, setSelectedStaffId] = useState<string | null>(null);

  useEffect(() => {
    const loadStaffMembers = async () => {
      try {
        const members = await supabaseService.getStaffMembers();
        setStaffMembers(members);
      } catch (error) {
        console.error('Error loading staff members:', error);
        setStaffMembers([]);
      } finally {
        setLoading(false);
      }
    };
    loadStaffMembers();
  }, []);

  const login = async (username: string, password: string): Promise<'admin' | 'staff' | 'shared_tablet' | null> => {
    setLoginError(null);
    const u = username.trim();
    const p = password;
    if (!u || !p) {
      setLoginError('Please enter username and password.');
      return null;
    }
    try {
      // Check for shared tablet login first
      if (u === SHARED_TABLET_USERNAME && p === SHARED_TABLET_PASSWORD) {
        setUser({ id: 'shared-tablet', name: 'Salon Tablet', role: 'staff' });
        setSelectedStaffId(null); // Will be selected on next screen
        return 'shared_tablet';
      }

      const admin = await supabaseService.getAdminByUsername(u);
      if (admin) {
        const match = await bcrypt.compare(p, admin.password_hash);
        if (match) {
          setUser({ id: admin.id, name: 'Admin', role: 'admin' });
          return 'admin';
        }
      } else if (u === DEFAULT_ADMIN_USERNAME && p === DEFAULT_ADMIN_PASSWORD) {
        const hash = bcrypt.hashSync(DEFAULT_ADMIN_PASSWORD, 10);
        await supabaseService.createAdminUser(DEFAULT_ADMIN_USERNAME, hash);
        setUser({ id: 'admin-1', name: 'Admin', role: 'admin' });
        return 'admin';
      }

      const staff = await supabaseService.getStaffByUsername(u);
      if (staff) {
        const match = staff.password_hash
          ? await bcrypt.compare(p, staff.password_hash)
          : p === DEFAULT_STAFF_PASSWORD_WHEN_NULL;
        if (match) {
          setUser({
            id: staff.id,
            name: staff.name,
            role: 'staff',
            branchId: staff.branch_id ?? undefined,
          });
          return 'staff';
        }
      }

      setLoginError('Invalid username or password.');
      return null;
    } catch (err: any) {
      console.error('Login error:', err);
      setLoginError(err.message || 'Login failed. Please try again.');
      return null;
    }
  };

  const logout = () => {
    setUser(null);
    setLoginError(null);
    setSelectedStaffId(null);
  };

  const setSelectedStaff = (staffId: string | null) => {
    setSelectedStaffId(staffId);
  };

  const verifyStaffPassword = async (staffId: string, password: string): Promise<boolean> => {
    try {
      const staff = await supabaseService.getStaffById(staffId);
      if (!staff) {
        return false;
      }
      
      const match = staff.password_hash
        ? await bcrypt.compare(password, staff.password_hash)
        : password === DEFAULT_STAFF_PASSWORD_WHEN_NULL;
      
      if (match) {
        // Set this staff as the selected staff for the session
        setSelectedStaffId(staffId);
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Password verification error:', error);
      return false;
    }
  };

  const isSharedTabletMode = user?.id === 'shared-tablet';

  const getEffectiveStaffId = (): string | null => {
    if (user?.role === 'staff' && !isSharedTabletMode) {
      return user.id;
    }
    return selectedStaffId;
  };

  const refreshStaffMembers = async () => {
    try {
      const members = await supabaseService.getStaffMembers();
      setStaffMembers(members);
    } catch (error) {
      console.error('Error refreshing staff members:', error);
    }
  };

  const value: AuthContextValue = {
    user,
    staffMembers,
    setUser,
    login,
    logout,
    refreshStaffMembers,
    loading,
    loginError,
    selectedStaffId,
    setSelectedStaff,
    isSharedTabletMode,
    getEffectiveStaffId,
    verifyStaffPassword,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextValue => {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return ctx;
};

