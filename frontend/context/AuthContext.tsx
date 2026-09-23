import { createContext, useContext, useEffect, useState } from 'react';
import { tokenStorage } from '../lib/auth/tokenStorage';

type AuthContextValue = {
  token: string | null;
  isLoading: boolean; // true mientras se lee SecureStore al arrancar
  login: (token: string) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    tokenStorage.get().then((stored) => {
      setToken(stored);
      setIsLoading(false);
    });
  }, []);

  const login = async (newToken: string) => {
    await tokenStorage.save(newToken);
    setToken(newToken);
  };

  const logout = async () => {
    await tokenStorage.clear();
    setToken(null);
  };

  return (
    <AuthContext.Provider value={{ token, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth debe usarse dentro de AuthProvider');
  return ctx;
}