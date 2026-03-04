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
  login: (username: string, password: string) => Promise<'admin' | 'staff' | null>;
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

// Shared tablet credentials for salon-wide device
const SHARED_TABLET_USERNAME = 'salon';
const SHARED_TABLET_PASSWORD = 'salon123';



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

  const login = async (username: string, password: string): Promise<'admin' | 'staff' | null> => {
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
        return 'staff';
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

      // Individual staff logins are disabled. Staff should use the shared tablet
      // credentials (salon / salon123) for accessing the common salon dashboard.
      setLoginError('Only admin and shared tablet logins are allowed. Staff must use the shared "salon" login.');
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

