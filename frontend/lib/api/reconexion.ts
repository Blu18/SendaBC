import { focusManager, onlineManager, QueryClient } from '@tanstack/react-query';
import { hayConexion, type EstadoRed } from '../sync/network';

// Spec 011, F7: una consulta que falló (por ejemplo, el perfil al abrir la app sin servidor) se
// quedaba con el error hasta reabrir la app. En React Native, TanStack Query no sabe cuándo
// vuelve la red ni cuándo la app regresa al frente: hay que avisarle.

type Desuscribir = () => void;

export type FuentesDeEstado = {
  /** Cambios de red, como Network.addNetworkStateListener de expo-network. */
  suscribirRed: (oyente: (estado: EstadoRed) => void) => Desuscribir;
  /** Cambios de la app, como AppState.addEventListener('change') de React Native. */
  suscribirApp: (oyente: (estado: string) => void) => Desuscribir;
};

/**
 * Las consultas se ejecutan aunque no haya red (`networkMode: 'always'`): cada una decide qué
 * hacer sin conexión, como los contactos, que muestran la copia del teléfono (spec 008, CA-8).
 * Con el modo por defecto, al marcar la red como caída, TanStack las pausaría.
 */
export function crearQueryClient() {
  return new QueryClient({
    defaultOptions: {
      // Con 'always', TanStack apaga refetchOnReconnect por defecto: se vuelve a encender.
      queries: { networkMode: 'always', refetchOnReconnect: true },
      mutations: { networkMode: 'always' },
    },
  });
}

/**
 * Conecta TanStack Query con la red y con el estado de la app. Al volver la red o la app al
 * frente, repite las consultas en pantalla que fallaron o están viejas (`refetchOnReconnect` y
 * `refetchOnWindowFocus`, activos por defecto).
 */
export function conectarConsultas({ suscribirRed, suscribirApp }: FuentesDeEstado) {
  onlineManager.setEventListener((setOnline) =>
    suscribirRed((estado) => setOnline(hayConexion(estado)))
  );
  focusManager.setEventListener((setFocused) =>
    suscribirApp((estado) => setFocused(estado === 'active'))
  );
}
