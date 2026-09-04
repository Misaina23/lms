import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';

interface User {
  id: number;
  username: string;
  matricule: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  role: string;
  teacher_type: string | null;
  status: string;
  date_of_birth: string | null;
  address: string;
  created_at: string;
  updated_at: string;
}

const TOKEN_KEY = 'auth_token';
const USER_KEY = 'auth_user';

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const loadAuth = useCallback(async () => {
    try {
      const [storedToken, storedUser] = await Promise.all([
        AsyncStorage.getItem(TOKEN_KEY),
        AsyncStorage.getItem(USER_KEY),
      ]);

      if (storedToken && storedUser) {
        setToken(storedToken);
        setUser(JSON.parse(storedUser));
      }
    } catch (err) {
      console.error('Error loading auth:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAuth();
  }, [loadAuth]);

  const login = async (email: string, password: string) => {
    try {
      const response = await fetch(`${process.env.EXPO_PUBLIC_API_URL || 'http://10.0.2.2:8000/api'}/login/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || 'Identifiants invalides');
      }

      const data = await response.json();
      
      await AsyncStorage.multiSet([
        [TOKEN_KEY, data.token],
        [USER_KEY, JSON.stringify(data.user)],
      ]);
      
      setToken(data.token);
      setUser(data.user);
      
      return { success: true, user: data.user };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : 'Erreur de connexion' };
    }
  };

  const logout = async () => {
    try {
      await AsyncStorage.multiRemove([TOKEN_KEY, USER_KEY]);
    } catch (err) {
      console.error('Logout error:', err);
    }
    setToken(null);
    setUser(null);
    router.replace('/login');
  };

  const isAuthenticated = !!token && !!user;
  const isTeacher = user?.role === 'PROFESSEUR';
  const isAdmin = user?.role === 'ADMIN';

  return {
    user,
    token,
    loading,
    isAuthenticated,
    isTeacher,
    isAdmin,
    login,
    logout,
    refresh: loadAuth,
  };
}

export type { User };