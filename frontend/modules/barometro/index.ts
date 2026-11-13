import { NativeModule, requireOptionalNativeModule } from 'expo';

// Barómetro nativo de Android que sigue leyendo con la pantalla apagada (spec 004, CA-12;
// spec 011, plan D16). En iOS no existe: se usa expo-sensors.

export type LecturaBarometro = {
  presionHpa: number;
  hora: number; // ms desde 1970, tomada de la marca de tiempo del sensor
};

type Eventos = {
  onLectura(lectura: LecturaBarometro): void;
};

declare class BarometroModule extends NativeModule<Eventos> {
  disponible(): boolean;
  iniciar(intervaloMs: number): boolean;
  detener(): void;
}

// null fuera de Android o en un build sin el módulo.
export default requireOptionalNativeModule<BarometroModule>('Barometro');
