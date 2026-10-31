import { useMemo } from 'react';
import { useColorScheme } from 'react-native';
import { darkTheme, lightTheme, type Theme } from '../../lib/theme';

// Spec 009: el modo lo da el sistema (RN-8). useColorScheme vuelve a renderizar cuando
// cambia, así que la app cambia de modo sin reiniciarse (CA-11).
export function useTheme(): Theme {
  return useColorScheme() === 'dark' ? darkTheme : lightTheme;
}

// Estilos de una pantalla según el tema: `const makeStyles = (t: Theme) => StyleSheet.create({...})`
// al final del archivo y `const styles = useThemedStyles(makeStyles)` en el componente (plan D7).
export function useThemedStyles<T>(makeStyles: (theme: Theme) => T): T {
  const theme = useTheme();
  return useMemo(() => makeStyles(theme), [makeStyles, theme]);
}
