import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '../types.ts';
import { api, setAuthToken, clearAuthToken, getAuthToken, clearPersistedSessionState } from '../services/api.ts';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (roleParam: string, payload: any) => Promise<User>;
  adminLogin: (payload: any) => Promise<User>;
  adminRegister: (payload: any) => Promise<User>;
  register: (roleParam: string, payload: any) => Promise<User>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(getAuthToken());
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const refreshUser = async () => {
    try {
      let existingToken: string | null = null;
      try {
        existingToken = getAuthToken();
      } catch {
        existingToken = null;
      }

      if (!existingToken) {
        setUser(null);
        setIsLoading(false);
        return;
      }

      const res = await api.getMe();
      if (res && res.user) {
        setUser(res.user);
      } else {
        clearAuthToken();
        setUser(null);
      }
    } catch {
      // Cleanly clear expired or invalid credentials without unhandled promise rejection
      try {
        clearAuthToken();
      } catch {}
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (import.meta.env.PROD) {
      clearPersistedSessionState();
    }

    let isMounted = true;
    const initAuth = async () => {
      try {
        await refreshUser();
      } catch {
        if (isMounted) {
          setUser(null);
          setIsLoading(false);
        }
      }
    };
    initAuth();
    return () => {
      isMounted = false;
    };
  }, []);

  const login = async (roleParam: string, payload: any): Promise<User> => {
    const res = await api.login(roleParam, payload);
    setAuthToken(res.token);
    setToken(res.token);
    setUser(res.user);
    return res.user;
  };

  const adminLogin = async (payload: any): Promise<User> => {
    const res = await api.adminLogin(payload);
    setAuthToken(res.token);
    setToken(res.token);
    setUser(res.user);
    return res.user;
  };

  const adminRegister = async (payload: any): Promise<User> => {
    const res = await api.registerAdmin(payload);
    setAuthToken(res.token);
    setToken(res.token);
    setUser(res.user);
    return res.user;
  };

  const register = async (roleParam: string, payload: any): Promise<User> => {
    const res = await api.register(roleParam, payload);
    setAuthToken(res.token);
    setToken(res.token);
    setUser(res.user);
    return res.user;
  };

  const logout = async () => {
    try {
      await api.logout();
    } catch (err) {
      // ignore
    } finally {
      clearAuthToken();
      setToken(null);
      setUser(null);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        login,
        adminLogin,
        adminRegister,
        register,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
