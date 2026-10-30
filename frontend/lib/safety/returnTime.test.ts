import { describe, expect, it } from 'vitest';
import {
  ajustarRegreso,
  DURACIONES_HORAS,
  formatoHora,
  horaDeAviso,
  regresoDentroDe,
  RETURN_TIME_MESSAGES,
  textoAviso,
  validarRegreso,
} from './returnTime';

const MIN = 60_000;
const H = 60 * MIN;
const TZ = 'America/Tijuana';
// 22 oct 2026, 9:00 en Tijuana (UTC-7).
const AHORA = Date.UTC(2026, 9, 22, 16, 0);

describe('regresoDentroDe (D9)', () => {
  it('ofrece 1, 2, 3, 4, 6 y 8 h', () => {
    expect(DURACIONES_HORAS).toEqual([1, 2, 3, 4, 6, 8]);
  });

  it('suma las horas y redondea al minuto siguiente', () => {
    expect(regresoDentroDe(3, AHORA)).toBe(AHORA + 3 * H);
    expect(regresoDentroDe(1, AHORA + 20_000)).toBe(AHORA + H + MIN);
  });
});

describe('ajustarRegreso (D9)', () => {
  it('sube y baja de 15 en 15 min', () => {
    const regreso = AHORA + 3 * H;
    expect(ajustarRegreso(regreso, 1, AHORA)).toBe(regreso + 15 * MIN);
    expect(ajustarRegreso(regreso, -2, AHORA)).toBe(regreso - 30 * MIN);
  });

  it('no baja de ahora + 15 min ni pasa de ahora + 12 h', () => {
    expect(ajustarRegreso(AHORA + 20 * MIN, -1, AHORA)).toBe(AHORA + 15 * MIN);
    expect(ajustarRegreso(AHORA + 12 * H - 5 * MIN, 1, AHORA)).toBe(AHORA + 12 * H);
  });
});

describe('validarRegreso (RN-10)', () => {
  const inicio = AHORA - H;

  it('acepta una hora futura y posterior al inicio', () => {
    expect(validarRegreso(AHORA + 2 * H, inicio, AHORA)).toBeNull();
  });

  it('rechaza una hora que no es posterior al inicio', () => {
    expect(validarRegreso(inicio, inicio, inicio)).toBe(RETURN_TIME_MESSAGES.antesDelInicio);
    expect(validarRegreso(inicio - MIN, inicio, AHORA)).toBe(RETURN_TIME_MESSAGES.antesDelInicio);
  });

  it('al cambiarla durante la actividad, rechaza una que ya pasó', () => {
    expect(validarRegreso(AHORA - MIN, inicio, AHORA)).toBe(RETURN_TIME_MESSAGES.yaPaso);
  });

  it('rechaza más de 12 h', () => {
    expect(validarRegreso(AHORA + 12 * H + MIN, inicio, AHORA)).toBe(RETURN_TIME_MESSAGES.muyLejos);
  });
});

describe('horaDeAviso y textoAviso (CA-8, CA-21)', () => {
  it('el aviso es la hora de regreso + 30 min', () => {
    expect(horaDeAviso(AHORA)).toBe(AHORA + 30 * MIN);
  });

  it('formatea la hora como HH:MM de 24 h', () => {
    expect(formatoHora(AHORA, TZ)).toBe('09:00');
    expect(formatoHora(AHORA + 6 * H + 5 * MIN, TZ)).toBe('15:05');
  });

  it('dice a qué hora avisaría', () => {
    expect(textoAviso(AHORA + 3 * H, TZ)).toBe(
      'Si no terminas la actividad, avisaríamos a tus contactos a las 12:30.'
    );
  });
});
