import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useAuth } from './AuthContext';
import { NO_FILTERS, type ActivityFilters } from '../lib/activity/filters';

// Filtros de Mis actividades (spec 015, CA-10; plan, D3). Viven en memoria, por encima de la
// navegación: siguen al cambiar de pestaña o al abrir un resumen, y se pierden al cerrar la app.
// Al cambiar de cuenta se quitan, para que otra cuenta no herede los filtros.

type ActivityFiltersValue = {
  filters: ActivityFilters;
  setFilters: (update: (current: ActivityFilters) => ActivityFilters) => void;
  clearFilters: () => void;
};

const ActivityFiltersContext = createContext<ActivityFiltersValue | null>(null);

export function ActivityFiltersProvider({ children }: { children: React.ReactNode }) {
  const { userId } = useAuth();
  const [filters, setFiltersState] = useState<ActivityFilters>(NO_FILTERS);

  useEffect(() => {
    setFiltersState(NO_FILTERS);
  }, [userId]);

  const setFilters = useCallback(
    (update: (current: ActivityFilters) => ActivityFilters) => setFiltersState(update),
    []
  );
  const clearFilters = useCallback(() => setFiltersState(NO_FILTERS), []);

  const value = useMemo(() => ({ filters, setFilters, clearFilters }), [filters, setFilters, clearFilters]);
  return <ActivityFiltersContext.Provider value={value}>{children}</ActivityFiltersContext.Provider>;
}

export function useActivityFilters() {
  const ctx = useContext(ActivityFiltersContext);
  if (!ctx) throw new Error('useActivityFilters debe usarse dentro de ActivityFiltersProvider');
  return ctx;
}
