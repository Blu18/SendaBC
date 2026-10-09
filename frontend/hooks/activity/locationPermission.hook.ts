import { useCallback, useEffect, useState } from 'react';
import { getForegroundPermissionsAsync, requestForegroundPermissionsAsync } from 'expo-location';

export function useLocationPermission() {
  const [granted, setGranted] = useState<boolean | null>(null);
  const [canAskAgain, setCanAskAgain] = useState(true);

  // Al montar: leer el estado actual del permiso SIN mostrar ningún diálogo
  useEffect(() => {
    getForegroundPermissionsAsync().then((res) => {
      setGranted(res.granted);
      setCanAskAgain(res.canAskAgain);
    });
  }, []);

  // Mostrar el diálogo del sistema y devolver si el usuario aceptó y si se puede volver a preguntar
  const request = useCallback(async () => {
    const res = await requestForegroundPermissionsAsync();
    setGranted(res.granted);
    setCanAskAgain(res.canAskAgain);
    return { granted: res.granted, canAskAgain: res.canAskAgain };
  }, []);

  return { granted, canAskAgain, request };
}