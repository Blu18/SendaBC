import { useCallback } from 'react';
import { Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../../context/AuthContext';
import { countPendingUploads } from '../../lib/db/activities';
import { pendingUploadsWarning } from '../../lib/format/activity';

// Cerrar sesión desde el perfil (spec 013, CA-24, CA-25). Con actividades sin subir, primero
// avisa (spec 005, CA-24): no se borran y se suben cuando esa cuenta vuelva a iniciar sesión
// (RN-4). Al cerrar se regresa a la bienvenida sin poder volver atrás (spec 002, CA-6).
// Antes vivía en la pantalla de Inicio.
export function useLogout() {
  const navigation = useNavigation();
  const { logout, userId } = useAuth();

  const cerrarSesion = useCallback(async () => {
    await logout();
    navigation.reset({ index: 0, routes: [{ name: 'Index' }] });
  }, [logout, navigation]);

  return useCallback(async () => {
    let pendientes = 0;
    try {
      if (userId) pendientes = await countPendingUploads(userId);
    } catch (e) {
      // Sin el conteo se cierra sesión igual: los datos se conservan en el teléfono.
      console.log('Error contando actividades sin subir:', e);
    }

    const aviso = pendingUploadsWarning(pendientes);
    if (!aviso) {
      await cerrarSesion();
      return;
    }
    Alert.alert('Actividades sin subir', aviso, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Cerrar sesión', style: 'destructive', onPress: () => void cerrarSesion() },
    ]);
  }, [userId, cerrarSesion]);
}
