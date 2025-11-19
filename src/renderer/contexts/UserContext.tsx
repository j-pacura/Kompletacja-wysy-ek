import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { PublicUser } from '../types/user';

interface UserContextType {
  currentUser: PublicUser | null;
  isLoading: boolean;
  login: (name: string, surname: string, password: string) => Promise<{ success: boolean; error?: string }>;
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

  // Check for existing session on mount
  useEffect(() => {
    const checkSession = () => {
      try {
        const savedUser = localStorage.getItem('currentUser');
        if (savedUser) {
          const user = JSON.parse(savedUser) as PublicUser;
          setCurrentUser(user);
        }
      } catch (error) {
        console.error('Error loading saved session:', error);
        localStorage.removeItem('currentUser');
      } finally {
        setIsLoading(false);
      }
    };

    checkSession();
  }, []);

  const login = async (name: string, surname: string, password: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const { ipcRenderer } = window.require('electron');
      const result = await ipcRenderer.invoke('db:login-user', { name, surname, password });

      if (result.success) {
        const user: PublicUser = {
          id: result.data.id,
          name: result.data.name,
          surname: result.data.surname,
          role: result.data.role,
          created_at: result.data.created_at,
          last_login: result.data.last_login,
          active: result.data.active,
        };

        setCurrentUser(user);
        localStorage.setItem('currentUser', JSON.stringify(user));

        return { success: true };
      } else {
        return { success: false, error: result.error || 'Błąd logowania' };
      }
    } catch (error: any) {
      console.error('Login error:', error);
      return { success: false, error: 'Wystąpił błąd podczas logowania' };
    }
  };

  const logout = () => {
    setCurrentUser(null);
    localStorage.removeItem('currentUser');
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
        logout,
        isAdmin,
      }}
    >
      {children}
    </UserContext.Provider>
  );
};
