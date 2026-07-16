import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User } from '@/types/api.types';
import { authService } from '@/services';
import { API_BASE_URL } from '@/config/api.config';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string, role?: string, category?: string) => Promise<void>;
  logout: () => Promise<void>;
  setUser: (user: User | null) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const initAuth = () => {
      try {
        const storedUser = authService.getCurrentUser();
        const token = authService.getToken();

        if (storedUser && token && !authService.isTokenExpired(token)) {
          setUser(storedUser);
        } else {
          authService.clearAuthData();
        }
      } catch (error) {
        console.error('Failed to initialize auth:', error);
        authService.clearAuthData();
      } finally {
        setIsLoading(false);
      }
    };

    initAuth();
  }, []);

  const login = async (email: string, password: string, role?: string, category?: string) => {
    try {
      const credentials: any = { password };
      
      // Add email or mobile
      if (email.includes('@')) {
        credentials.email = email;
      } else {
        credentials.mobile = email;
      }
      
      // Add role and category for validation
      if (role) credentials.role = role;
      if (category) credentials.category = category;
      
      const response = await authService.login(credentials);
      
      if (response.success && response.user) {
        setUser(response.user);
        
        // Check if location exists in localStorage and save to backend
        const savedLocation = localStorage.getItem('user_location');
        if (savedLocation) {
          try {
            const locationData = JSON.parse(savedLocation);
            // Save location to user's database record
              await fetch(`${API_BASE_URL}/auth/update-location`, {
              method: 'PUT',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authService.getToken()}`,
              },
              body: JSON.stringify({
                latitude: locationData.latitude,
                longitude: locationData.longitude,
                address: locationData.address,
              }),
            });
            console.log('Location saved to database after login');
          } catch (error) {
            console.error('Failed to save location to database:', error);
          }
        }
      } else {
        throw new Error(response.message || 'Login failed');
      }
    } catch (error: any) {
      throw error;
    }
  };

  const logout = async () => {
    try {
      await authService.logout();
    } finally {
      setUser(null);
    }
  };

  const value = {
    user,
    isAuthenticated: !!user && !!authService.getToken(),
    isLoading,
    login,
    logout,
    setUser,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
