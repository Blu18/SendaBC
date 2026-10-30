import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import * as Network from 'expo-network';
import { useAuth } from './AuthContext';
import { syncEngine } from '../lib/sync';
import { safetySync } from '../lib/safety';
import { createReconnectDetector } from '../lib/sync/network';
import type { SyncOutcome, SyncState } from '../lib/sync/syncEngine';

type SyncContextValue = SyncState & {
  // Sincroniza ya. Por defecto es manual: también reintenta las rechazadas (spec 005, CA-16).
  // Devuelve 'offline' si no hay conexión, para avisar en pantalla.
  syncNow: (opts?: { manual?: boolean }) => Promise<SyncOutcome>;
};

const SyncContext = createContext<SyncContextValue | null>(null);

// Conecta el motor de sincronización con la app (spec 005, T15). Va dentro de Gate, así que
// arranca cuando ya se cerraron las actividades huérfanas y se calcularon sus métricas: nunca
// sube una actividad con métricas pendientes (CA-3).
export function SyncProvider({ children }: { children: React.ReactNode }) {
  const { token, userId } = useAuth();
  const [state, setState] = useState<SyncState>(syncEngine.getState());

  useEffect(
    () =>
      syncEngine.subscribe((event) => {
        if (event.type === 'state') setState(event.state);
      }),
    []
  );

  // Al abrir la app con sesión o al iniciar sesión: sube lo pendiente y recupera lo que falte
  // (CA-1, CA-20). Al cerrar sesión, el motor se detiene.
  useEffect(() => {
    const session = token && userId ? { token, userId } : null;
    syncEngine.configure(session);
    // La bandeja de seguridad comparte la sesión (spec 008, plan D6).
    safetySync.configure(session);
    if (session) {
      void syncEngine.requestSync();
      void safetySync.requestSend();
    }
  }, [token, userId]);

  // Al recuperar la conexión (CA-1, CA-9).
  useEffect(() => {
    const recuperada = createReconnectDetector();
    Network.getNetworkStateAsync()
      .then(recuperada)
      .catch(() => {});
    const subscription = Network.addNetworkStateListener((estado) => {
      if (recuperada(estado)) {
        void syncEngine.requestSync();
        // Una alerta guardada sin conexión sale en cuanto vuelve la red (spec 008, CA-15).
        void safetySync.requestSend();
      }
    });
    return () => subscription.remove();
  }, []);

  // Al volver la app al frente: cuenta como "abrir la app" (CA-1).
  const appState = useRef(AppState.currentState);
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (siguiente) => {
      const volvio = appState.current !== 'active' && siguiente === 'active';
      appState.current = siguiente;
      if (volvio) {
        void syncEngine.requestSync();
        void safetySync.requestSend();
      }
    });
    return () => subscription.remove();
  }, []);

  const syncNow = useCallback(
    ({ manual = true }: { manual?: boolean } = {}) => syncEngine.requestSync({ manual }),
    []
  );

  return <SyncContext.Provider value={{ ...state, syncNow }}>{children}</SyncContext.Provider>;
}

export function useSync() {
  const ctx = useContext(SyncContext);
  if (!ctx) throw new Error('useSync debe usarse dentro de SyncProvider');
  return ctx;
}

// Llama a onChange cada vez que la sincronización marca o guarda actividades, para que una
// pantalla recargue sus datos sin salir de ella (CA-15).
export function useSyncDataChanged(onChange: () => void) {
  const callback = useRef(onChange);
  callback.current = onChange;
  useEffect(
    () =>
      syncEngine.subscribe((event) => {
        if (event.type === 'data-changed') callback.current();
      }),
    []
  );
}
