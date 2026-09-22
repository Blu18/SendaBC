import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context'
import Register from './pages/auth/register';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import Index from './pages/auth';
import Login from './pages/auth/login';
import {createStaticNavigation} from '@react-navigation/native';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import MainPage from './pages/main/mainPage';

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

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <SafeAreaView style={styles.safeArea}>

          <Navigation/>

      </SafeAreaView>
    </QueryClientProvider>
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
