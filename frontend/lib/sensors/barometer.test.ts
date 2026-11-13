import { beforeEach, describe, expect, it, vi } from 'vitest';

// Spec 004, CA-12 y CA-14; spec 011, F3 y plan D16: en Android las lecturas salen del módulo
// nativo, que sigue leyendo con la pantalla apagada. Que de verdad lea así se comprueba en el
// S9+ (T65); aquí, que se use y que la hora sea la del sensor.

const estado = vi.hoisted(() => ({ nativo: null as unknown }));
const expoSensors = vi.hoisted(() => ({
  Barometer: {
    isAvailableAsync: vi.fn(async () => true),
    setUpdateInterval: vi.fn(),
    addListener: vi.fn(() => ({ remove: vi.fn() })),
  },
  DeviceMotion: { requestPermissionsAsync: vi.fn() },
}));

vi.mock('react-native', () => ({ Platform: { OS: 'android' } }));
vi.mock('expo-sensors', () => expoSensors);
vi.mock('../../modules/barometro', () => ({
  get default() {
    return estado.nativo;
  },
}));

function nativoSimulado(disponible = true) {
  let alLeer: ((l: { presionHpa: number; hora: number }) => void) | null = null;
  const quitar = vi.fn();
  return {
    disponible: vi.fn(() => disponible),
    iniciar: vi.fn(() => disponible),
    detener: vi.fn(),
    addListener: vi.fn((_: string, f: typeof alLeer) => {
      alLeer = f;
      return { remove: quitar };
    }),
    leer: (l: { presionHpa: number; hora: number }) => alLeer?.(l),
    quitar,
  };
}

async function cargar() {
  vi.resetModules();
  return import('./barometer');
}

beforeEach(() => {
  vi.clearAllMocks();
  estado.nativo = null;
});

describe('barómetro en Android (módulo nativo)', () => {
  it('prepareBarometer usa el módulo nativo para decidir la fuente', async () => {
    estado.nativo = nativoSimulado(true);
    expect(await (await cargar()).prepareBarometer()).toBe('BAROMETER');
    estado.nativo = nativoSimulado(false);
    expect(await (await cargar()).prepareBarometer()).toBe('GPS');
    expect(expoSensors.Barometer.isAvailableAsync).not.toHaveBeenCalled();
  });

  it('cada lectura lleva la hora del sensor, no la de llegada', async () => {
    const nativo = nativoSimulado();
    estado.nativo = nativo;
    const { startBarometer } = await cargar();
    const lecturas: unknown[] = [];

    const detener = startBarometer((l) => lecturas.push(l));
    // Dos lecturas que llegan juntas con la pantalla apagada, tomadas con 1 s de diferencia.
    nativo.leer({ presionHpa: 1001.5, hora: Date.parse('2026-11-11T19:40:00.000Z') });
    nativo.leer({ presionHpa: 1001.4, hora: Date.parse('2026-11-11T19:40:01.000Z') + 0.4 });

    expect(nativo.iniciar).toHaveBeenCalledWith(1000);
    expect(lecturas).toEqual([
      { recordedAt: '2026-11-11T19:40:00.000Z', pressureHpa: 1001.5, relativeAltitudeM: null },
      { recordedAt: '2026-11-11T19:40:01.000Z', pressureHpa: 1001.4, relativeAltitudeM: null },
    ]);
    expect(expoSensors.Barometer.addListener).not.toHaveBeenCalled();

    detener();
    expect(nativo.detener).toHaveBeenCalled();
    expect(nativo.quitar).toHaveBeenCalled();
  });

  it('sin el módulo nativo (iOS) sigue con expo-sensors', async () => {
    const { prepareBarometer, startBarometer } = await cargar();

    expect(await prepareBarometer()).toBe('BAROMETER');
    startBarometer(() => {});
    expect(expoSensors.Barometer.addListener).toHaveBeenCalled();
  });
});
