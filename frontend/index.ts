import { registerRootComponent } from 'expo';

// Define la tarea de ubicación en segundo plano antes de montar la app (spec 008, T16):
// expo-task-manager lo exige en el ámbito global.
import './lib/safety/locationTask';
// "¿Estás bien?" y la alerta por inactividad, también sin pantallas montadas (spec 008, T17).
import './lib/safety/areYouOk';
// Token y telemetría de Mapbox, antes de montar el mapa de la grabación (spec 010, T5).
import './lib/map/mapbox';
import App from './App';

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(App);
