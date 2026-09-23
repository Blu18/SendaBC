import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context'
import Register from './pages/auth/register';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import Index from './pages/auth';
import Login from './pages/auth/login';
import {createStaticNavigation} from '@react-navigation/native';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import MainPage from './pages/main/mainPage';
import { AuthProvider, useAuth } from './context/AuthContext';

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
    }
  }
})

type RootStackType = typeof RootStack;

declare module '@react-navigation/native' {
  interface RootNavigator extends RootStackType {}
}

const Navigation = createStaticNavigation(RootStack)

function Gate({ children }: { children: React.ReactNode }) {
  const { isLoading } = useAuth();

  if (isLoading) {
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
            <Navigation/>
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
