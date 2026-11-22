import { describe, expect, it } from 'vitest';
import type { ActivityType } from '../db/activities';
import { contextLine, localMonthKey, type ContextCandidate } from './context';

// Actividad que empieza en hora local (mes 1-12), con distancia y subida en metros.
function act(
  localId: number,
  type: ActivityType,
  [year, month, day, hour = 8, minute = 0]: number[],
  distanceMeters: number | null,
  elevationGainMeters: number | null = 100
): ContextCandidate {
  return {
    localId,
    type,
    startedAt: new Date(year, month - 1, day, hour, minute).toISOString(),
    distanceMeters,
    elevationGainMeters,
  };
}

// Historia base: caminatas en septiembre y octubre de 2026.
const septiembre = act(1, 'HIKING', [2026, 9, 20], 6000, 300);
const corta = act(2, 'HIKING', [2026, 10, 5], 4000, 150);
const larga = act(3, 'HIKING', [2026, 10, 12], 9000, 200);
const subida = act(4, 'HIKING', [2026, 10, 19], 5000, 700);
const todas = [septiembre, corta, larga, subida];

describe('contextLine', () => {
  it('la primera de cada tipo (regla 1)', () => {
    expect(contextLine(septiembre, todas)).toBe('Tu primera caminata');
    const bici = act(10, 'CYCLING', [2026, 10, 20], 30000);
    const carrera = act(11, 'TRAIL_RUNNING', [2026, 10, 21], 12000);
    expect(contextLine(bici, [...todas, bici, carrera])).toBe('Tu primera salida en bici');
    expect(contextLine(carrera, [...todas, bici, carrera])).toBe('Tu primera carrera');
  });

  it('la primera aunque sea la única actividad', () => {
    const sola = act(1, 'HIKING', [2026, 10, 1], 500);
    expect(contextLine(sola, [sola])).toBe('Tu primera caminata');
    expect(contextLine(sola, [])).toBe('Tu primera caminata');
  });

  it('la más larga de su tipo en el mes (regla 2)', () => {
    expect(contextLine(larga, todas)).toBe('Tu caminata más larga de octubre');
  });

  it('la de más subida de su tipo en el mes (regla 3)', () => {
    expect(contextLine(subida, todas)).toBe('Tu caminata con más subida de octubre');
  });

  it('sin regla que cumpla: null (CA-3)', () => {
    expect(contextLine(corta, todas)).toBeNull();
  });

  it('sin otra del mismo tipo en el mes: las reglas 2 y 3 no aplican', () => {
    const noviembre = act(5, 'HIKING', [2026, 11, 3], 20000, 2000);
    expect(contextLine(noviembre, [...todas, noviembre])).toBeNull();
  });

  it('las de otro tipo no cuentan para comparar', () => {
    // Una bici de 40 km en octubre no le quita a `larga` ser la caminata más larga, ni cuenta
    // como otra caminata del mes.
    const bici = act(10, 'CYCLING', [2026, 10, 13], 40000, 900);
    expect(contextLine(larga, [...todas, bici])).toBe('Tu caminata más larga de octubre');
    const noviembre = act(5, 'HIKING', [2026, 11, 3], 2000);
    const biciNov = act(11, 'CYCLING', [2026, 11, 4], 1000);
    expect(contextLine(noviembre, [...todas, noviembre, biciNov])).toBeNull();
  });

  it('en un empate gana la más antigua (RN-3)', () => {
    const igual = act(6, 'HIKING', [2026, 10, 26], 9000, 100);
    const conIgual = [...todas, igual];
    expect(contextLine(larga, conIgual)).toBe('Tu caminata más larga de octubre');
    expect(contextLine(igual, conIgual)).toBeNull();
  });

  it('la regla 2 va antes que la 3 (RN-4)', () => {
    // La más larga del mes y también la de más subida: dice la de distancia.
    const ambas = act(7, 'HIKING', [2026, 10, 27], 15000, 900);
    expect(contextLine(ambas, [...todas, ambas])).toBe('Tu caminata más larga de octubre');
  });

  it('la regla 1 va antes que las otras', () => {
    // La primera caminata también es la más larga de su mes.
    const primera = act(8, 'HIKING', [2026, 9, 1], 12000, 900);
    const otra = act(9, 'HIKING', [2026, 9, 2], 3000, 50);
    expect(contextLine(primera, [primera, otra])).toBe('Tu primera caminata');
  });

  it('las que no tienen métricas calculadas no cuentan para comparar', () => {
    const pendiente = act(12, 'HIKING', [2026, 10, 28], null, null);
    expect(contextLine(larga, [...todas, pendiente])).toBe('Tu caminata más larga de octubre');
    expect(contextLine(pendiente, [...todas, pendiente])).toBeNull();
  });

  it('el mes es el de la hora local de inicio (RN-8)', () => {
    // Empieza el 31 de octubre a las 23:30, hora local: cuenta en octubre aunque en UTC ya sea
    // noviembre en zonas como la de Baja California.
    const noche = act(13, 'HIKING', [2026, 10, 31, 23, 30], 9500, 100);
    expect(localMonthKey(noche.startedAt)).toBe('2026-10');
    expect(contextLine(noche, [...todas, noche])).toBe('Tu caminata más larga de octubre');
    // Y una del 1 de noviembre a las 0:10 ya no se compara con octubre.
    const madrugada = act(14, 'HIKING', [2026, 11, 1, 0, 10], 50000, 100);
    expect(localMonthKey(madrugada.startedAt)).toBe('2026-11');
    expect(contextLine(madrugada, [...todas, noche, madrugada])).toBeNull();
  });

  it('con bici, el nombre de la salida va completo', () => {
    const b1 = act(20, 'CYCLING', [2026, 10, 2], 20000, 300);
    const b2 = act(21, 'CYCLING', [2026, 10, 9], 35000, 200);
    const b3 = act(22, 'CYCLING', [2026, 10, 16], 25000, 800);
    const bicis = [b1, b2, b3];
    expect(contextLine(b2, bicis)).toBe('Tu salida en bici más larga de octubre');
    expect(contextLine(b3, bicis)).toBe('Tu salida en bici con más subida de octubre');
  });
});
