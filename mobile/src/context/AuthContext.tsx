import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
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
  logout: () => void;
  loading: boolean;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [staffMembers, setStaffMembers] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadStaffMembers = async () => {
      try {
        const members = await supabaseService.getStaffMembers();
        setStaffMembers(members);
      } catch (error) {
        console.error('Error loading staff members:', error);
        // Fallback to default staff if Supabase fails
        setStaffMembers([
          { id: '550e8400-e29b-41d4-a716-446655440001', name: 'Alice Johnson' },
          { id: '550e8400-e29b-41d4-a716-446655440002', name: 'Bob Smith' },
        ]);
      } finally {
        setLoading(false);
      }
    };
    loadStaffMembers();
  }, []);

  const logout = () => {
    setUser(null);
  };

  const value: AuthContextValue = {
    user,
    staffMembers,
    setUser,
    logout,
    loading,
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

