import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createTestDb } from './testing';

// Las consultas reales corren contra el esquema real (schema.ts) en una base en memoria.
let testDb: ReturnType<typeof createTestDb>;
vi.mock('./sqlite', () => ({ getDb: async () => testDb }));

const { getEleccionUmbrales, getSetting, saveEleccionUmbrales, setSetting } = await import('./settings');

beforeEach(() => {
  testDb = createTestDb();
});

describe('app_settings (spec 011, CA-50)', () => {
  it('guarda y reemplaza un valor por cuenta y clave', async () => {
    await setSetting('a', 'k', '1');
    await setSetting('a', 'k', '2');
    await setSetting('b', 'k', '3');

    expect(await getSetting('a', 'k')).toBe('2');
    expect(await getSetting('b', 'k')).toBe('3');
    expect(await getSetting('a', 'otra')).toBeNull();
  });
});

describe('umbrales elegidos (CA-50, CA-52)', () => {
  it('sin nada guardado devuelve los de por defecto', async () => {
    expect(await getEleccionUmbrales('a')).toEqual({ quietoMin: 10, respuestaMin: 2 });
  });

  it('guarda la elección de cada cuenta', async () => {
    await saveEleccionUmbrales('a', { quietoMin: 20, respuestaMin: 5 });

    expect(await getEleccionUmbrales('a')).toEqual({ quietoMin: 20, respuestaMin: 5 });
    expect(await getEleccionUmbrales('b')).toEqual({ quietoMin: 10, respuestaMin: 2 });
  });

  it('un valor dañado en la base usa los de por defecto', async () => {
    await setSetting('a', 'umbrales_inactividad', '{roto');

    expect(await getEleccionUmbrales('a')).toEqual({ quietoMin: 10, respuestaMin: 2 });
  });
});
