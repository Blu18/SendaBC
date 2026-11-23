import { describe, expect, it } from 'vitest';
import { hayCambios, inicioDelRecorrido, MIN_PUBLISH_DISTANCE_M, motivoNoPublicable, validarRuta } from './publish';

const valido = { name: 'Cañón de Doña Petra', description: '', region: 'Ensenada' };

describe('validarRuta (spec 007, CA-5, RN-4, RN-7)', () => {
  it('un formulario válido no tiene errores; descripción y zona son opcionales', () => {
    expect(validarRuta(valido)).toEqual({});
    expect(validarRuta({ name: 'Ruta', description: '', region: '' })).toEqual({});
  });

  it('acepta los bordes: nombre de 40, descripción de 200 y zona de 40', () => {
    expect(
      validarRuta({ name: 'n'.repeat(40), description: 'd'.repeat(200), region: 'z'.repeat(40) })
    ).toEqual({});
  });

  it('rechaza nombre de 41, descripción de 201 y zona de 41, con el error en cada campo', () => {
    expect(
      validarRuta({ name: 'n'.repeat(41), description: 'd'.repeat(201), region: 'z'.repeat(41) })
    ).toEqual({
      name: 'El nombre debe tener como máximo 40 caracteres',
      description: 'La descripción debe tener como máximo 200 caracteres',
      region: 'La zona debe tener como máximo 40 caracteres',
    });
  });

  it('el nombre es obligatorio sin contar los espacios (RN-4)', () => {
    for (const name of ['', '    ']) {
      expect(validarRuta({ ...valido, name })).toEqual({ name: 'El nombre es obligatorio' });
    }
  });

  it('los límites no cuentan los espacios de los extremos, como en el servidor', () => {
    expect(
      validarRuta({
        name: `  ${'n'.repeat(40)}  `,
        description: ` ${'d'.repeat(200)} `,
        region: ` ${'z'.repeat(40)} `,
      })
    ).toEqual({});
  });
});

describe('motivoNoPublicable (spec 007, CA-1 a CA-3, CA-8)', () => {
  const sincronizada = { status: 'SYNCED' as const, distanceMeters: 3_000, serverId: 'srv-1' };

  it('una actividad sincronizada de 1.5 km o más sin ruta se puede publicar (CA-1)', () => {
    expect(MIN_PUBLISH_DISTANCE_M).toBe(1_500);
    expect(motivoNoPublicable(sincronizada, null)).toEqual({ kind: 'publicable' });
    expect(motivoNoPublicable({ ...sincronizada, distanceMeters: 1_500 }, undefined)).toEqual({
      kind: 'publicable',
    });
  });

  it('"Pendiente de subir" o "No se pudo subir" no se pueden publicar (CA-2)', () => {
    // Las dos son PENDING_SYNC sin serverId; "No se pudo subir" solo agrega syncError.
    const pendiente = { status: 'PENDING_SYNC' as const, distanceMeters: 3_000, serverId: null };
    expect(motivoNoPublicable(pendiente, null)).toEqual({
      kind: 'no-sincronizada',
      mensaje: 'Para publicarla como ruta, primero tiene que subirse a tu cuenta.',
    });
    expect(motivoNoPublicable({ ...pendiente, status: 'RECORDING' }, null).kind).toBe(
      'no-sincronizada'
    );
  });

  it('sin serverId tampoco, aunque diga SYNCED', () => {
    expect(motivoNoPublicable({ ...sincronizada, serverId: null }, null).kind).toBe(
      'no-sincronizada'
    );
  });

  it('una de menos de 1.5 km no se puede publicar (CA-3, RN-5)', () => {
    expect(motivoNoPublicable({ ...sincronizada, distanceMeters: 1_499.9 }, null)).toEqual({
      kind: 'muy-corta',
      mensaje: 'Una ruta debe medir al menos 1.5 km.',
    });
    expect(motivoNoPublicable({ ...sincronizada, distanceMeters: null }, null).kind).toBe(
      'muy-corta'
    );
  });

  it('subirse va primero: una corta y pendiente pide subirla', () => {
    expect(
      motivoNoPublicable({ status: 'PENDING_SYNC', distanceMeters: 800, serverId: null }, null).kind
    ).toBe('no-sincronizada');
  });

  it('con una ruta publicada o archivada lleva a "Ver ruta publicada" (CA-8, RN-2)', () => {
    expect(motivoNoPublicable(sincronizada, { id: 'r-1' })).toEqual({
      kind: 'ya-publicada',
      rutaId: 'r-1',
    });
  });
});

describe('inicioDelRecorrido (spec 007, CA-28, RN-10)', () => {
  const INICIO = '2026-11-06T16:00:00.000Z';
  const punto = (segundos: number) => ({
    recordedAt: new Date(Date.parse(INICIO) + segundos * 1000).toISOString(),
  });

  it('salta la ubicación vieja del principio', () => {
    const puntos = [punto(-1500), punto(5), punto(15)];
    expect(inicioDelRecorrido(puntos, INICIO)).toBe(puntos[1]);
  });

  it('sin ubicación vieja es el primer punto', () => {
    const puntos = [punto(5), punto(15)];
    expect(inicioDelRecorrido(puntos, INICIO)).toBe(puntos[0]);
  });

  it('con el reloj desfasado, o si quedaría un solo punto, es el primero', () => {
    const desfasado = [punto(-600), punto(-590)];
    expect(inicioDelRecorrido(desfasado, INICIO)).toBe(desfasado[0]);
    const unoSolo = [punto(-600), punto(5)];
    expect(inicioDelRecorrido(unoSolo, INICIO)).toBe(unoSolo[0]);
  });

  it('sin puntos no hay inicio', () => {
    expect(inicioDelRecorrido([], INICIO)).toBeUndefined();
  });
});

describe('hayCambios (spec 007, RN-12)', () => {
  const original = { name: 'Cañón de Doña Petra', description: '', region: 'Ensenada' };

  it('sin cambios, o solo con espacios de más, no hay cambios', () => {
    expect(hayCambios(original, original)).toBe(false);
    expect(hayCambios({ ...original, name: '  Cañón de Doña Petra ' }, original)).toBe(false);
  });

  it('cualquier campo distinto cuenta como cambio', () => {
    expect(hayCambios({ ...original, name: 'Otro nombre' }, original)).toBe(true);
    expect(hayCambios({ ...original, description: 'Con sombra' }, original)).toBe(true);
    expect(hayCambios({ ...original, region: '' }, original)).toBe(true);
  });
});
