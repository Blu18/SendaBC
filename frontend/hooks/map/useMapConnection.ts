import { useNetworkState } from 'expo-network';
import { hayConexion } from '../../lib/sync/network';

// ¿Hay red para el mapa de fondo? Se pregunta a expo-network porque una zona ya vista carga de la
// caché sin ningún error del mapa (spec 010, T4). Mientras no se conoce el estado se asume que sí,
// para no mostrar el aviso sin conexión al abrir.
export function useMapConnection() {
  const estado = useNetworkState();
  return estado.isConnected === undefined || hayConexion(estado);
}
