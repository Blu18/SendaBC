import { Barometer, DeviceMotion } from 'expo-sensors';
import { Platform } from 'react-native';
import BarometroNativo from '../../modules/barometro';
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
    if (BarometroNativo) return BarometroNativo.disponible() ? 'BAROMETER' : 'GPS';
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
// En Android usa el módulo nativo, que sigue leyendo con la pantalla apagada y da la hora de
// cada lectura desde el sensor (spec 004, CA-12; spec 011, F3 y plan D16). En iOS, expo-sensors:
// la hora se toma al recibirla, porque su timestamp tiene un origen que cambia por plataforma.
export function startBarometer(onReading: (reading: BarometerReadingInput) => void) {
  if (BarometroNativo) {
    const subscription = BarometroNativo.addListener('onLectura', (lectura) =>
      onReading({
        recordedAt: new Date(Math.round(lectura.hora)).toISOString(),
        pressureHpa: lectura.presionHpa,
        relativeAltitudeM: null,
      })
    );
    BarometroNativo.iniciar(UPDATE_INTERVAL_MS);
    return () => {
      BarometroNativo!.detener();
      subscription.remove();
    };
  }

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
