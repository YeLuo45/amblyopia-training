import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, Child, Family } from '../types';
import * as api from './api';

interface AuthContextType {
  user: User | null;
  family: Family | null;
  childList: Child[];
  selectedChild: Child | null;
  loading: boolean;
  login: (phone: string, password: string) => Promise<void>;
  register: (data: { phone: string; password: string; nickname?: string }) => Promise<void>;
  logout: () => void;
  selectChild: (child: Child | null) => void;
  refreshChildren: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children: reactChildren }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [family, setFamily] = useState<Family | null>(null);
  const [childList, setChildList] = useState<Child[]>([]);
  const [selectedChild, setSelectedChild] = useState<Child | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      loadUser();
    } else {
      setLoading(false);
    }
  }, []);

  async function loadUser() {
    try {
      const userData = await api.getMe();
      setUser(userData);
      const familyData = await api.getFamily();
      setFamily(familyData);
      const childrenData = await api.getChildren();
      setChildList(childrenData.map(c => ({
        ...c,
        age: c.birth_date ? calculateAge(c.birth_date) : undefined,
      })));
      if (childrenData.length > 0) {
        setSelectedChild(childrenData[0]);
      }
    } catch {
      localStorage.removeItem('token');
    } finally {
      setLoading(false);
    }
  }

  function calculateAge(birthDate: string): number {
    const birth = new Date(birthDate);
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
    return age;
  }

  async function login(phone: string, password: string) {
    const res = await api.login(phone, password);
    localStorage.setItem('token', res.token);
    await loadUser();
  }

  async function register(data: { phone: string; password: string; nickname?: string }) {
    const res = await api.register(data);
    localStorage.setItem('token', res.token);
    await loadUser();
  }

  function logout() {
    localStorage.removeItem('token');
    setUser(null);
    setFamily(null);
    setChildList([]);
    setSelectedChild(null);
  }

  function selectChild(child: Child | null) {
    setSelectedChild(child);
  }

  async function refreshChildren() {
    const childrenData = await api.getChildren();
    setChildList(childrenData.map(c => ({
      ...c,
      age: c.birth_date ? calculateAge(c.birth_date) : undefined,
    })));
  }

  return (
    <AuthContext.Provider value={{
      user, family, childList, selectedChild, loading,
      login, register, logout, selectChild, refreshChildren,
    }}>
      {reactChildren}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
