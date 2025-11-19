import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { PublicUser } from '../types/user';

interface UserContextType {
  currentUser: PublicUser | null;
  isLoading: boolean;
  login: (login: string, password: string) => Promise<{ success: boolean; error?: string; forcePasswordChange?: boolean; userData?: PublicUser }>;
  setUser: (user: PublicUser) => void;
  logout: () => void;
  isAdmin: () => boolean;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export const useUser = () => {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error('useUser must be used within UserProvider');
  }
  return context;
};

interface UserProviderProps {
  children: ReactNode;
}

export const UserProvider: React.FC<UserProviderProps> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<PublicUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // No session persistence - require login on every app launch
  useEffect(() => {
    setIsLoading(false);
  }, []);

  const login = async (login: string, password: string): Promise<{ success: boolean; error?: string; forcePasswordChange?: boolean; userData?: PublicUser }> => {
    try {
      const { ipcRenderer } = window.require('electron');
      const result = await ipcRenderer.invoke('db:login-user', { login, password });

      if (result.success) {
        const user: PublicUser = {
          id: result.data.id,
          name: result.data.name,
          surname: result.data.surname,
          login: result.data.login,
          report_language: result.data.report_language,
          role: result.data.role,
          created_at: result.data.created_at,
          last_login: result.data.last_login,
          active: result.data.active,
          force_password_change: result.data.force_password_change,
        };

        // Check if user needs to change password
        if (user.force_password_change) {
          // Don't set currentUser yet - return user data for password change modal
          return { success: true, forcePasswordChange: true, userData: user };
        }

        // Session stored in memory only - cleared when app closes
        setCurrentUser(user);

        return { success: true };
      } else {
        return { success: false, error: result.error || 'Błąd logowania' };
      }
    } catch (error: any) {
      console.error('Login error:', error);
      return { success: false, error: 'Wystąpił błąd podczas logowania' };
    }
  };

  const setUser = (user: PublicUser) => {
    setCurrentUser(user);
  };

  const logout = () => {
    setCurrentUser(null);
  };

  const isAdmin = (): boolean => {
    return currentUser?.role === 'admin';
  };

  return (
    <UserContext.Provider
      value={{
        currentUser,
        isLoading,
        login,
        setUser,
        logout,
        isAdmin,
      }}
    >
      {children}
    </UserContext.Provider>
  );
};
