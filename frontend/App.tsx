import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context'
import { StatusBar } from 'expo-status-bar';
import Register from './pages/auth/register';
import { QueryClientProvider } from '@tanstack/react-query'
import Index from './pages/auth';
import Login from './pages/auth/login';
import {createNavigationContainerRef, createStaticNavigation, DarkTheme, DefaultTheme, type Theme as NavigationTheme} from '@react-navigation/native';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import TabBar from './components/navigation/TabBar';
import MainPage from './pages/main/mainPage';
import ActivityPage from './pages/activity/activityPage';
import ActivitySummaryPage from './pages/activity/activitySummaryPage';
import ActivityHistoryPage from './pages/activity/activityHistoryPage';
import ExploreRoutesPage from './pages/routes/exploreRoutesPage';
import PublishRoutePage from './pages/routes/publishRoutePage';
import RouteDetailPage from './pages/routes/routeDetailPage';
import EditRoutePage from './pages/routes/editRoutePage';
import MyRoutesPage from './pages/routes/myRoutesPage';
import FavoritesPage from './pages/routes/favoritesPage';
import EmergencyContactsPage from './pages/safety/emergencyContactsPage';
import ProfilePage from './pages/account/profilePage';
import ChangeEmailPage from './pages/account/changeEmailPage';
import ChangePasswordPage from './pages/account/changePasswordPage';
import DeleteAccountPage from './pages/account/deleteAccountPage';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SyncProvider } from './context/SyncContext';
import { closeOrphanActivities } from './lib/db/activities';
import { sessionActions } from './lib/safety';
import { computeMissingMetrics } from './lib/db/activityMetrics';
import { setUnauthorizedHandler } from './lib/api/client';
import { queryClient } from './lib/api/queryClient';
import { fontFamilies, type Theme } from './lib/theme';
import { getReducedMotion } from './hooks/theme/useReducedMotion';
import { useTheme, useThemedStyles } from './hooks/theme/useTheme';

// Barra de 4 pestañas (spec 009, plan D1). Cada ícono tiene su versión rellena para la
// pestaña activa y de contorno para las demás, como en Figma.
const HomeTabs = createBottomTabNavigator({
  tabBar: (props) => <TabBar {...props} />,
  screenOptions: () => ({
    headerShown: false,
    animation: getReducedMotion() ? 'none' : 'fade',
  }),
  screens: {
    MainPage: {
      screen: MainPage,
      options: {
        title: 'Inicio',
        tabBarIcon: ({ focused, color, size }) => (
          <MaterialCommunityIcons name={focused ? 'home' : 'home-outline'} color={color} size={size} />
        ),
      },
    },
    ActivityHistory: {
      screen: ActivityHistoryPage,
      options: {
        title: 'Actividades',
        tabBarIcon: ({ color, size }) => <MaterialCommunityIcons name="hiking" color={color} size={size} />,
      },
    },
    ExploreRoutes: {
      screen: ExploreRoutesPage,
      options: {
        title: 'Rutas',
        tabBarIcon: ({ focused, color, size }) => (
          <MaterialCommunityIcons name={focused ? 'map-marker-path' : 'map-outline'} color={color} size={size} />
        ),
      },
    },
    Safety: {
      screen: EmergencyContactsPage,
      options: {
        title: 'Seguridad',
        tabBarIcon: ({ focused, color, size }) => (
          <MaterialCommunityIcons name={focused ? 'shield-check' : 'shield-check-outline'} color={color} size={size} />
        ),
      },
    },
  },
})

const RootStack = createNativeStackNavigator({
  initialRouteName: 'Index',
  // En Android, ios_from_right dura 200 ms y slide_from_right 400, más que el límite (spec 010, RN-5).
  screenOptions: () => ({
    headerShown: false,
    animation: getReducedMotion() ? 'none' : 'ios_from_right',
  }),
  screens: {
    Index: {
      screen: Index,
    },
    Login: {
      screen: Login
    },
    Register: {
      screen: Register
    },
    // Inicio, Actividades, Rutas y Seguridad (spec 009)
    Home: {
      screen: HomeTabs
    },
    Activity: {
      screen: ActivityPage
    },
    ActivitySummary: {
      screen: ActivitySummaryPage
    },
    PublishRoute: {
      screen: PublishRoutePage
    },
    RouteDetail: {
      screen: RouteDetailPage
    },
    EditRoute: {
      screen: EditRoutePage
    },
    MyRoutes: {
      screen: MyRoutesPage
    },
    Favorites: {
      screen: FavoritesPage
    },
    // Contactos de emergencia (spec 008, CA-1 a CA-7). También es la pestaña Seguridad; aquí
    // se abre encima de la grabación desde "Configurar" y se vuelve a ella (spec 009, plan).
    EmergencyContacts: {
      screen: EmergencyContactsPage
    },
    // Perfil y cuenta (spec 011, CA-41 a CA-46). Se abre desde el avatar de Inicio.
    Profile: {
      screen: ProfilePage
    },
    ChangeEmail: {
      screen: ChangeEmailPage
    },
    ChangePassword: {
      screen: ChangePasswordPage
    },
    DeleteAccount: {
      screen: DeleteAccountPage
    }
  }
})

type RootStackType = typeof RootStack;

declare module '@react-navigation/native' {
  interface RootNavigator extends RootStackType {}
}

const Navigation = createStaticNavigation(RootStack)
const navigationRef = createNavigationContainerRef()

// Tema de React Navigation con los tokens (spec 009): fondo de pantallas, encabezados y
// barra de pestañas. La familia ya lleva el peso, así que fontWeight queda en normal.
function navigationTheme(t: Theme): NavigationTheme {
  const base = t.scheme === 'dark' ? DarkTheme : DefaultTheme;
  return {
    ...base,
    dark: t.scheme === 'dark',
    colors: {
      primary: t.colors.primary,
      background: t.colors.background,
      card: t.colors.surface,
      text: t.colors.text,
      border: t.colors.border,
      notification: t.colors.error,
    },
    fonts: {
      regular: { fontFamily: fontFamilies.regular, fontWeight: 'normal' },
      medium: { fontFamily: fontFamilies.semibold, fontWeight: 'normal' },
      bold: { fontFamily: fontFamilies.bold, fontWeight: 'normal' },
      heavy: { fontFamily: fontFamilies.bold, fontWeight: 'normal' },
    },
  };
}

function Gate({ children }: { children: React.ReactNode }) {
  const { isLoading, logout } = useAuth();
  const theme = useTheme();
  const styles = useThemedStyles(makeStyles);
  const [localDataReady, setLocalDataReady] = useState(false);

  // Al abrir la app, cerrar las actividades que quedaron en RECORDING (spec 003, CA-10) y
  // calcular las métricas de las que no las tienen, incluidas esas (spec 004, CA-19).
  // Se espera antes de mostrar la navegación para que no se cruce con una grabación nueva
  // y para que el historial ya muestre sus métricas.
  useEffect(() => {
    // Sus sesiones de seguridad también se terminan (spec 008, CA-19).
    sessionActions
      .cerrarHuerfanas(closeOrphanActivities)
      .catch((e) => console.log('Error cerrando actividades huérfanas:', e))
      .then(() => computeMissingMetrics())
      .catch((e) => console.log('Error calculando métricas pendientes:', e))
      .finally(() => setLocalDataReady(true));
  }, []);

  // Spec 002, CA-5: si una petición con token responde 401 (expirado o inválido), se cierra la
  // sesión local y se regresa a la pantalla de inicio sin poder volver atrás, desde cualquier pantalla.
  useEffect(() => {
    setUnauthorizedHandler(() => {
      logout()
        .catch((e) => console.log('Error cerrando la sesión:', e))
        .finally(() => {
          if (navigationRef.isReady()) {
            navigationRef.reset({ index: 0, routes: [{ name: 'Index' }] });
          }
        });
    });
    return () => setUnauthorizedHandler(null);
  }, [logout]);

  if (isLoading || !localDataReady) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  return <>{children}</>;
}

export default function App() {
  const theme = useTheme();
  const styles = useThemedStyles(makeStyles);
  const navTheme = useMemo(() => navigationTheme(theme), [theme]);

  return (
    <AuthProvider>
      <QueryClientProvider client={queryClient}>
        <SafeAreaView style={styles.safeArea}>
          <StatusBar style="auto" />
          <Gate>
            {/* Dentro de Gate: la sincronización arranca con los datos locales listos (spec 005) */}
            <SyncProvider>
              <Navigation ref={navigationRef} theme={navTheme}/>
            </SyncProvider>
          </Gate>
        </SafeAreaView>
      </QueryClientProvider>
    </AuthProvider>
  );
}

const makeStyles = (t: Theme) => StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: t.colors.background,
  },
  container: {
    flex: 1,
    backgroundColor: t.colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
