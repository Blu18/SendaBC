import { QueryClient } from "@tanstack/react-query"

// Instancia compartida de React Query; vive aquí y no en App.tsx para evitar ciclos de imports
export const queryClient = new QueryClient()
