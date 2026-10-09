import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { tokenStorage, userIdStorage } from '../lib/auth/tokenStorage';

type AuthContextValue = {
  token: string | null;
  userId: string | null;
  isLoading: boolean; // true mientras se lee SecureStore al arrancar
  login: (token: string, userId: string) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    Promise.all([tokenStorage.get(), userIdStorage.get()]).then(async ([storedToken, storedUserId]) => {
      // Sesiones guardadas antes de spec 003 no tienen userId: se cierran para volver a iniciar sesión.
      if (storedToken && !storedUserId) {
        await tokenStorage.clear();
        storedToken = null;
      }
      setToken(storedToken);
      setUserId(storedToken ? storedUserId : null);
      setIsLoading(false);
    });
  }, []);

  const login = async (newToken: string, newUserId: string) => {
    await tokenStorage.save(newToken);
    await userIdStorage.save(newUserId);
    setToken(newToken);
    setUserId(newUserId);
  };

  // Estable entre renders: App.tsx lo usa para cerrar la sesión ante un 401 (spec 002, CA-5).
  const logout = useCallback(async () => {
    await tokenStorage.clear();
    await userIdStorage.clear();
    setToken(null);
    setUserId(null);
  }, []);

  return (
    <AuthContext.Provider value={{ token, userId, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth debe usarse dentro de AuthProvider');
  return ctx;
}
