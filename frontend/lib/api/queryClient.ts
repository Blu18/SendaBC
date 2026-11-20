import { crearQueryClient } from "./reconexion"

// Instancia compartida de React Query; vive aquí y no en App.tsx para evitar ciclos de imports.
// La conexión con la red y con el estado de la app se hace en App.tsx (spec 011, F7).
export const queryClient = crearQueryClient()
