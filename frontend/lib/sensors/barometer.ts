import { Barometer, DeviceMotion } from 'expo-sensors';
import { Platform } from 'react-native';
import type { BarometerReadingInput } from '../db/activities';
import type { ElevationSource } from '../metrics/summary';

// Una lectura por segundo como máximo (spec 004, requisito de batería; plan D7).
const UPDATE_INTERVAL_MS = 1000;
// iOS ignora setUpdateInterval y Android lo toma como sugerencia: se descartan en JS las
// lecturas que llegan antes de tiempo. El margen evita tirar lecturas que llegan a ~1 s.
const MIN_GAP_MS = 900;

// Decide la fuente de elevación al iniciar una actividad (spec 004, CA-12, CA-13, RN-3).
// En iOS el barómetro comparte el permiso de "Movimiento y forma física"; el módulo
// Barometer no lo pide ni lo reporta, así que se pide con DeviceMotion.
export async function prepareBarometer(): Promise<ElevationSource> {
  try {
    if (!(await Barometer.isAvailableAsync())) return 'GPS';
    if (Platform.OS === 'ios') {
      const { granted } = await DeviceMotion.requestPermissionsAsync();
      if (!granted) return 'GPS';
    }
    return 'BAROMETER';
  } catch (e) {
    console.log('Error preparando el barómetro:', e);
    return 'GPS';
  }
}

// Empieza a escuchar el barómetro; devuelve la función que lo detiene.
// La hora de cada lectura se toma al recibirla: el timestamp del sensor está en segundos
// desde un origen que cambia según la plataforma.
export function startBarometer(onReading: (reading: BarometerReadingInput) => void) {
  let lastAt = 0;
  Barometer.setUpdateInterval(UPDATE_INTERVAL_MS);
  const subscription = Barometer.addListener((m) => {
    const now = Date.now();
    if (now - lastAt < MIN_GAP_MS) return;
    lastAt = now;
    onReading({
      recordedAt: new Date(now).toISOString(),
      pressureHpa: m.pressure,
      relativeAltitudeM: m.relativeAltitude ?? null,
    });
  });
  return () => subscription.remove();
}
