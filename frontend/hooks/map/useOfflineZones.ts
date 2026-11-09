import { useEffect, useMemo, useRef, useSyncExternalStore } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  borrarZona,
  descargarZona,
  escucharPaquetes,
  listarPaquetes,
  paquetesVivos,
  reintentarZona,
} from '../../lib/map/offlinePacks';
import { agruparZonas, type ZoneBounds, type ZoneItem } from '../../lib/map/offlineZones';

// Zonas del mapa descargadas en el teléfono (spec 011, CA-32, CA-33). No dependen de la cuenta
// (D2), así que la clave no lleva el usuario.
const ZONES_KEY = ['map', 'offline-zones'] as const;

export function useOfflineZones() {
  const queryClient = useQueryClient();
  const vivos = useSyncExternalStore(escucharPaquetes, paquetesVivos);

  const query = useQuery({ queryKey: ZONES_KEY, queryFn: listarPaquetes });

  // Al terminar o fallar un paquete se vuelve a leer la lista, para tener el tamaño real.
  const terminados = useRef(new Set<string>());
  useEffect(() => {
    let cambio = false;
    for (const [name, live] of Object.entries(vivos)) {
      const fin = live.state !== 'active';
      if (fin && !terminados.current.has(name)) cambio = true;
      if (fin) terminados.current.add(name);
      else terminados.current.delete(name);
    }
    if (cambio) void queryClient.invalidateQueries({ queryKey: ZONES_KEY });
  }, [vivos, queryClient]);

  const zones = useMemo(() => agruparZonas(query.data ?? [], vivos), [query.data, vivos]);

  const refrescar = () => queryClient.invalidateQueries({ queryKey: ZONES_KEY });

  const descargar = useMutation({
    mutationFn: (bounds: ZoneBounds) => descargarZona(bounds),
    onSettled: refrescar,
  });
  const reintentar = useMutation({
    mutationFn: (zone: ZoneItem) =>
      reintentarZona({
        zoneId: zone.id,
        bounds: zone.bounds,
        createdAt: zone.createdAt,
        missingStyles: zone.missingStyles,
      }),
    onSettled: refrescar,
  });
  const borrar = useMutation({
    mutationFn: (zoneId: string) => borrarZona(zoneId),
    onSettled: refrescar,
  });

  return {
    zones,
    isLoading: query.isLoading,
    isError: query.isError,
    refetch: query.refetch,
    descargar,
    reintentar,
    borrar,
  };
}
