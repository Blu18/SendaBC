import { useNavigation, usePreventRemove } from '@react-navigation/native';
import { Alert } from 'react-native';

// Al salir de un formulario con cambios sin guardar (botón atrás del teléfono o del encabezado),
// pregunta antes de descartarlos (spec 007, RN-12). Con `enabled` en false sale sin preguntar.
export function useConfirmDiscard(enabled: boolean) {
    const navigation = useNavigation();
    usePreventRemove(enabled, ({ data }) => {
        Alert.alert('¿Descartar los cambios?', 'Lo que escribiste no se guardará.', [
            { text: 'Seguir editando', style: 'cancel' },
            { text: 'Descartar', style: 'destructive', onPress: () => navigation.dispatch(data.action) },
        ]);
    });
}
