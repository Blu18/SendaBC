import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context'
import Register from './pages/auth/register';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import Index from './pages/auth';
import Login from './pages/auth/login';
import {createNavigationContainerRef, createStaticNavigation} from '@react-navigation/native';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import MainPage from './pages/main/mainPage';
import ActivityPage from './pages/activity/activityPage';
import ActivitySummaryPage from './pages/activity/activitySummaryPage';
import ActivityHistoryPage from './pages/activity/activityHistoryPage';
import { AuthProvider, useAuth } from './context/AuthContext';
import { closeOrphanActivities } from './lib/db/activities';
import { computeMissingMetrics } from './lib/db/activityMetrics';
import { setUnauthorizedHandler } from './lib/api/client';

export const queryClient = new QueryClient()

const RootStack = createNativeStackNavigator({
  initialRouteName: 'Index',
  screenOptions: {
    headerShown: false,
  },
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
    MainPage: {
      screen: MainPage
    },
    Activity: {
      screen: ActivityPage
    },
    ActivitySummary: {
      screen: ActivitySummaryPage
    },
    ActivityHistory: {
      screen: ActivityHistoryPage
    }
  }
})

type RootStackType = typeof RootStack;

declare module '@react-navigation/native' {
  interface RootNavigator extends RootStackType {}
}

const Navigation = createStaticNavigation(RootStack)
const navigationRef = createNavigationContainerRef()

function Gate({ children }: { children: React.ReactNode }) {
  const { isLoading, logout } = useAuth();
  const [localDataReady, setLocalDataReady] = useState(false);

  // Al abrir la app, cerrar las actividades que quedaron en RECORDING (spec 003, CA-10) y
  // calcular las métricas de las que no las tienen, incluidas esas (spec 004, CA-19).
  // Se espera antes de mostrar la navegación para que no se cruce con una grabación nueva
  // y para que el historial ya muestre sus métricas.
  useEffect(() => {
    closeOrphanActivities()
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
        <ActivityIndicator size="large" color="#5C6B49" />
      </View>
    );
  }

  return <>{children}</>;
}

export default function App() {
  return (
    <AuthProvider>
      <QueryClientProvider client={queryClient}>
        <SafeAreaView style={styles.safeArea}>
          <Gate>
            <Navigation ref={navigationRef}/>
          </Gate>
        </SafeAreaView>
      </QueryClientProvider>
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#5C6B49",
  },
  container: {
    flex: 1,
    backgroundColor: "#EDEAE1",
    alignItems: 'center',
    justifyContent: 'center',
  },
});
