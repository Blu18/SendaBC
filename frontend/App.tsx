import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context'
import Register from './pages/auth/register';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

export const queryClient = new QueryClient()

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.container}>
          <Register></Register>
        </View>
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
