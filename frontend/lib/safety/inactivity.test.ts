import { describe, expect, it } from 'vitest';
import {
  detener,
  evaluar,
  iniciarDetector,
  reiniciar,
  restanteMs,
  UMBRALES,
  umbralesDe,
  type EstadoDetector,
  type PuntoDetector,
} from './inactivity';

const MIN = 60_000;
const T0 = Date.UTC(2026, 9, 22, 16, 0);
const BASE = { latitude: 32.0471, longitude: -115.4614 };

// `metros` al norte de BASE (~111 195 m por grado de latitud).
function punto(metros = 0, accuracy: number | null = 5): PuntoDetector {
  return { latitude: BASE.latitude + metros / 111_195, longitude: BASE.longitude, accuracy };
}

// Evalúa una serie de [minuto, punto] y devuelve el estado final y las acciones distintas de 'nada'.
function correr(pasos: [number, PuntoDetector | null][], inicial = iniciarDetector(T0)) {
  let estado: EstadoDetector = inicial;
  const acciones: [number, string][] = [];
  for (const [minuto, p] of pasos) {
    const r = evaluar(estado, p, T0 + minuto * MIN);
    estado = r.estado;
    if (r.accion !== 'nada') acciones.push([minuto, r.accion]);
  }
  return { estado, acciones };
}

// Un punto cada 10 s en el mismo lugar, de `desde` a `hasta` minutos.
function quieto(desde: number, hasta: number, p: PuntoDetector | null = punto()) {
  const pasos: [number, PuntoDetector | null][] = [];
  for (let s = desde * 60; s <= hasta * 60; s += 10) pasos.push([s / 60, p]);
  return pasos;
}

describe('evaluar (spec 008, RN-4)', () => {
  it('quieto 10 min pregunta "¿Estás bien?" y a los 12 alerta (CA-11, CA-14)', () => {
    const { estado, acciones } = correr(quieto(0, 13));

    expect(acciones).toEqual([
      [0, 'programar-pregunta'],
      [10, 'preguntar'],
      [12, 'alertar'],
    ]);
    expect(estado.fase).toBe('alertada');
  });

  it('a los 9:50 todavía no pregunta y a las 11:50 todavía no alerta', () => {
    expect(correr(quieto(0, 9 + 50 / 60)).acciones).toEqual([[0, 'programar-pregunta']]);
    expect(correr(quieto(0, 11 + 50 / 60)).acciones.map(([, a]) => a)).toEqual([
      'programar-pregunta',
      'preguntar',
    ]);
  });

  it('programa la notificación de respaldo para el inicio + 10 min (plan D5)', () => {
    const { estado } = correr([[0, punto()]]);
    expect(estado.programadaPara).toBe(T0 + 10 * MIN);
  });

  it('pregunta aunque no lleguen puntos: basta con que pase el tiempo', () => {
    const { acciones } = correr([
      [0, null],
      [10, null],
      [12, null],
    ]);
    expect(acciones.map(([, a]) => a)).toEqual(['programar-pregunta', 'preguntar', 'alertar']);
  });

  it('la cuenta regresiva empieza al preguntar, aunque la evaluación llegue tarde', () => {
    // La tarea no corrió entre el minuto 3 y el 15 (p. ej. el sistema la retrasó).
    const { acciones } = correr([
      [3, punto()],
      [15, punto()],
      [16, punto()],
      [17, punto()],
    ]);
    expect(acciones).toEqual([
      [3, 'programar-pregunta'],
      [15, 'preguntar'],
      [17, 'alertar'],
    ]);
  });

  it('alejarse más de 30 m reinicia el tiempo y reprograma la notificación', () => {
    const { estado, acciones } = correr([
      ...quieto(0, 8),
      [8.5, punto(35)],
      ...quieto(9, 15, punto(35)),
    ]);
    expect(acciones).toEqual([
      [0, 'programar-pregunta'],
      [8.5, 'programar-pregunta'],
    ]);
    expect(estado.fase).toBe('vigilando');
    expect(estado.quietoDesde).toBe(T0 + 8.5 * MIN);
    expect(estado.programadaPara).toBe(T0 + 18.5 * MIN);
  });

  it('moverse 30 m o menos no cuenta como moverse', () => {
    const { acciones } = correr([...quieto(0, 5), ...quieto(5 + 1 / 6, 10, punto(29))]);
    expect(acciones).toEqual([
      [0, 'programar-pregunta'],
      [10, 'preguntar'],
    ]);
  });

  it('un punto con precisión peor que 30 m no mueve el ancla (D8)', () => {
    const { acciones } = correr([
      ...quieto(0, 5),
      [6, punto(80, 45)],
      [7, punto(80, null)],
      ...quieto(8, 10),
    ]);
    expect(acciones.map(([, a]) => a)).toEqual(['programar-pregunta', 'preguntar']);
  });

  it('el primer punto preciso fija el ancla sin reiniciar el tiempo', () => {
    const { estado } = correr([
      [0, punto(0, 60)],
      [4, punto(500)],
    ]);
    expect(estado.ancla).toEqual({ latitude: punto(500).latitude, longitude: BASE.longitude });
    expect(estado.quietoDesde).toBe(T0);
  });

  it('reprograma como mucho una vez por minuto al caminar', () => {
    const pasos: [number, PuntoDetector][] = [];
    // Camina 40 m cada 10 s durante 3 min.
    for (let i = 0; i <= 18; i++) pasos.push([i / 6, punto(i * 40)]);
    const { acciones } = correr(pasos);
    expect(acciones.map(([m]) => m)).toEqual([0, 1, 2, 3]);
  });

  it('moverse durante la cuenta regresiva cuenta como respuesta: no alerta', () => {
    const { estado, acciones } = correr([...quieto(0, 10.5), [11, punto(50)], [12.5, punto(50)]]);
    expect(acciones.map(([, a]) => a)).toEqual([
      'programar-pregunta',
      'preguntar',
      'programar-pregunta',
    ]);
    expect(estado.fase).toBe('vigilando');
  });

  it('con la alerta generada no vuelve a preguntar ni a alertar, aunque se mueva', () => {
    const { estado, acciones } = correr([...quieto(0, 13), [14, punto(300)], ...quieto(15, 40, punto(300))]);
    expect(acciones.map(([, a]) => a)).toEqual(['programar-pregunta', 'preguntar', 'alertar']);
    expect(estado.fase).toBe('alertada');
  });

  it('acepta umbrales cortos para los casos manuales (T17)', () => {
    const umbrales = { ...UMBRALES, quietoMs: MIN, respuestaMs: 30_000 };
    let estado = iniciarDetector(T0);
    const acciones: string[] = [];
    for (let s = 0; s <= 120; s += 10) {
      const r = evaluar(estado, punto(), T0 + s * 1000, umbrales);
      estado = r.estado;
      acciones.push(r.accion);
    }
    expect(acciones.indexOf('preguntar')).toBe(6);
    expect(acciones.indexOf('alertar')).toBe(9);
  });
});

describe('reiniciar (CA-12)', () => {
  it('"Estoy bien" antes de que termine la cuenta: no alerta y la detección empieza de nuevo', () => {
    const { estado: preguntando } = correr(quieto(0, 11));
    expect(preguntando.fase).toBe('preguntando');

    const reiniciado = reiniciar(preguntando, T0 + 11 * MIN);
    expect(reiniciado).toMatchObject({
      fase: 'vigilando',
      quietoDesde: T0 + 11 * MIN,
      preguntaDesde: null,
    });

    const { acciones } = correr(quieto(11 + 1 / 6, 22), reiniciado);
    expect(acciones).toEqual([
      [11 + 1 / 6, 'programar-pregunta'],
      [21, 'preguntar'],
    ]);
  });

  it('tras cancelar una alerta, la detección vuelve a empezar (RN-8)', () => {
    const { estado } = correr(quieto(0, 13));
    expect(reiniciar(estado, T0 + 20 * MIN).fase).toBe('vigilando');
  });
});

describe('detener (CA-13)', () => {
  it('con la actividad terminada no pregunta ni alerta, pase el tiempo que pase', () => {
    const detenido = detener(correr(quieto(0, 5)).estado);
    const { acciones, estado } = correr(quieto(5, 60), detenido);
    expect(acciones).toEqual([]);
    expect(estado.fase).toBe('detenida');
    expect(reiniciar(estado, T0).fase).toBe('detenida');
  });
});

describe('restanteMs', () => {
  it('cuenta los 2 minutos desde la pregunta', () => {
    const { estado } = correr(quieto(0, 10));
    expect(restanteMs(estado, T0 + 10 * MIN)).toBe(2 * MIN);
    expect(restanteMs(estado, T0 + 11.5 * MIN)).toBe(30_000);
    expect(restanteMs(estado, T0 + 13 * MIN)).toBe(0);
    expect(restanteMs(iniciarDetector(T0), T0)).toBeNull();
  });
});

describe('umbralesDe (T17)', () => {
  it('en desarrollo acorta los tiempos a N minutos', () => {
    expect(umbralesDe('1', true)).toEqual({ ...UMBRALES, quietoMs: MIN, respuestaMs: MIN });
    expect(umbralesDe('0.5', true)).toMatchObject({ quietoMs: 30_000, respuestaMs: 30_000 });
  });

  it('en producción, sin valor o con un valor inválido usa RN-4', () => {
    expect(umbralesDe('1', false)).toBe(UMBRALES);
    expect(umbralesDe(undefined, true)).toBe(UMBRALES);
    for (const v of ['', 'abc', '0', '-3']) expect(umbralesDe(v, true)).toBe(UMBRALES);
  });
});
