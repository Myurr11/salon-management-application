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
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  refreshStaffMembers: () => Promise<void>;
  loading: boolean;
  loginError: string | null;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

const DEFAULT_ADMIN_USERNAME = 'admin';
const DEFAULT_ADMIN_PASSWORD = 'admin123';
const DEFAULT_STAFF_PASSWORD_WHEN_NULL = 'staff123';

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [staffMembers, setStaffMembers] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [loginError, setLoginError] = useState<string | null>(null);

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

  const login = async (username: string, password: string) => {
    setLoginError(null);
    const u = username.trim();
    const p = password;
    if (!u || !p) {
      setLoginError('Please enter username and password.');
      return;
    }
    try {
      const admin = await supabaseService.getAdminByUsername(u);
      if (admin) {
        const match = await bcrypt.compare(p, admin.password_hash);
        if (match) {
          setUser({ id: admin.id, name: 'Admin', role: 'admin' });
          return;
        }
      } else if (u === DEFAULT_ADMIN_USERNAME && p === DEFAULT_ADMIN_PASSWORD) {
        const hash = bcrypt.hashSync(DEFAULT_ADMIN_PASSWORD, 10);
        await supabaseService.createAdminUser(DEFAULT_ADMIN_USERNAME, hash);
        setUser({ id: 'admin-1', name: 'Admin', role: 'admin' });
        return;
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
          return;
        }
      }

      setLoginError('Invalid username or password.');
    } catch (err: any) {
      console.error('Login error:', err);
      setLoginError(err.message || 'Login failed. Please try again.');
    }
  };

  const logout = () => {
    setUser(null);
    setLoginError(null);
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

