// Estado de la red como lo entrega expo-network (todos sus campos son opcionales).
export type EstadoRed = { isConnected?: boolean; isInternetReachable?: boolean | null };

// Hay conexión si el sistema dice que la hay. isInternetReachable puede venir indefinido; en
// ese caso se intenta y, si falla, el reintento lo resuelve (spec 005, D2).
export function hayConexion(estado: EstadoRed) {
  return estado.isConnected === true && estado.isInternetReachable !== false;
}

// Detecta cuándo se recupera la conexión (de sin red a con red) para sincronizar en ese
// momento (spec 005, CA-1). El primer estado solo se registra: al abrir la app ya se
// sincroniza por otro lado y no se debe disparar dos veces.
export function createReconnectDetector() {
  let anterior: boolean | null = null;
  return (estado: EstadoRed) => {
    const ahora = hayConexion(estado);
    const recuperada = anterior === false && ahora;
    anterior = ahora;
    return recuperada;
  };
}
