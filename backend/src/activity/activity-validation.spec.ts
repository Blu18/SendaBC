import {
  ERROR_POCOS_PUNTOS,
  MAX_ERRORES,
  validarActividad,
} from './activity-validation.js';

function punto(sequence: number, extra: object = {}) {
  return {
    sequence,
    latitude: 31.8667,
    longitude: -116.5964,
    altitude: 20.5,
    accuracy: 4.2,
    recordedAt: `2026-10-09T10:00:${String(sequence).padStart(2, '0')}.000Z`,
    ...extra,
  };
}

const valida = {
  clientGeneratedId: '3b241101-e2bb-4255-8caf-4136c566a962',
  type: 'HIKING',
  startedAt: '2026-10-09T10:00:00.000Z',
  endedAt: '2026-10-09T11:30:00.000Z',
  distanceMeters: 5234.7,
  durationSeconds: 5400,
  elevationGainMeters: 312,
  elevationLossMeters: 298,
  elevationSource: 'BAROMETER',
  points: [punto(1), punto(2), punto(3)],
};

async function erroresDe(item: unknown) {
  const resultado = await validarActividad(item);
  return resultado.ok ? [] : resultado.errores;
}

describe('validarActividad (spec 005, CA-11, RN-5)', () => {
  it('acepta una actividad válida', async () => {
    const resultado = await validarActividad(valida);
    expect(resultado.ok).toBe(true);
  });

  it('acepta altitud y precisión nulas', async () => {
    const points = [1, 2, 3].map((s) =>
      punto(s, { altitude: null, accuracy: null }),
    );
    expect(await erroresDe({ ...valida, points })).toEqual([]);
  });

  it('descarta un userId enviado en el body (CA-18)', async () => {
    const resultado = await validarActividad({
      ...valida,
      userId: '00000000-0000-4000-8000-000000000000',
    });
    expect(resultado.ok).toBe(true);
    if (resultado.ok) expect(resultado.actividad).not.toHaveProperty('userId');
  });

  it('rechaza un fin anterior al inicio', async () => {
    expect(
      await erroresDe({ ...valida, endedAt: '2026-10-09T09:00:00.000Z' }),
    ).toEqual(['El fin de la actividad no puede ser anterior al inicio']);
  });

  it('acepta un fin igual al inicio', async () => {
    expect(
      await erroresDe({
        ...valida,
        endedAt: valida.startedAt,
        durationSeconds: 0,
        distanceMeters: 0,
        elevationGainMeters: 0,
        elevationLossMeters: 0,
      }),
    ).toEqual([]);
  });

  it('rechaza una latitud fuera de rango e indica el punto', async () => {
    const points = [punto(1), punto(2, { latitude: 91 })];
    expect(await erroresDe({ ...valida, points })).toEqual([
      'Punto 2: La latitud debe estar entre -90 y 90',
    ]);
  });

  it('rechaza una longitud fuera de rango', async () => {
    const points = [punto(1, { longitude: -181 })];
    expect(await erroresDe({ ...valida, points })).toEqual([
      'Punto 1: La longitud debe estar entre -180 y 180',
    ]);
  });

  it('rechaza una secuencia repetida', async () => {
    const points = [punto(1), punto(2), punto(2)];
    expect(await erroresDe({ ...valida, points })).toEqual([
      'La secuencia 2 está repetida',
    ]);
  });

  it('rechaza métricas negativas', async () => {
    expect(
      (
        await erroresDe({
          ...valida,
          distanceMeters: -1,
          durationSeconds: -5,
          elevationGainMeters: -2,
          elevationLossMeters: -3,
        })
      ).sort(),
    ).toEqual(
      [
        'La distancia no puede ser negativa',
        'La duración no puede ser negativa',
        'La elevación ganada no puede ser negativa',
        'La elevación perdida no puede ser negativa',
      ].sort(),
    );
  });

  it('rechaza una fuente de elevación o un tipo inválidos', async () => {
    expect(
      (
        await erroresDe({
          ...valida,
          elevationSource: 'SATELITE',
          type: 'NADO',
        })
      ).sort(),
    ).toEqual(
      [
        'El tipo de actividad no es válido',
        'La fuente de la elevación no es válida',
      ].sort(),
    );
  });

  it('rechaza un identificador que no es UUID v4', async () => {
    expect(await erroresDe({ ...valida, clientGeneratedId: 'abc' })).toEqual([
      'El identificador de la actividad debe ser un UUID v4',
    ]);
  });

  it('rechaza fechas que no son ISO 8601', async () => {
    expect(await erroresDe({ ...valida, startedAt: 'ayer' })).toEqual([
      'El inicio debe ser una fecha ISO 8601',
    ]);
  });

  it('rechaza un punto que no es objeto', async () => {
    expect(await erroresDe({ ...valida, points: [punto(1), 5] })).toEqual([
      'Punto 2: Cada punto debe ser un objeto',
    ]);
  });

  it('rechaza algo que no es un objeto', async () => {
    expect(await erroresDe(null)).toEqual(['La actividad debe ser un objeto']);
    expect(await erroresDe([valida])).toEqual([
      'La actividad debe ser un objeto',
    ]);
  });

  describe('mínimo de 3 puntos válidos (spec 012, CA-26)', () => {
    it('rechaza una actividad sin puntos', async () => {
      expect(await erroresDe({ ...valida, points: [] })).toEqual([
        ERROR_POCOS_PUNTOS,
      ]);
    });

    it('rechaza una actividad con 2 puntos válidos', async () => {
      expect(
        await erroresDe({ ...valida, points: [punto(1), punto(2)] }),
      ).toEqual([ERROR_POCOS_PUNTOS]);
    });

    it('acepta una actividad con exactamente 3 puntos válidos', async () => {
      const points = [punto(1), punto(2), punto(3, { accuracy: 20 })];
      expect(await erroresDe({ ...valida, points })).toEqual([]);
    });

    it('rechaza 3 puntos con 1 impreciso, aunque haya más puntos', async () => {
      const points = [
        punto(1),
        punto(2, { accuracy: 25 }),
        punto(3),
        punto(4, { accuracy: 80 }),
      ];
      expect(await erroresDe({ ...valida, points })).toEqual([
        ERROR_POCOS_PUNTOS,
      ]);
    });

    it('cuenta como válidos los puntos sin precisión, nula u omitida', async () => {
      const omitida: Record<string, unknown> = punto(2);
      delete omitida.accuracy;
      const points = [punto(1, { accuracy: null }), omitida, punto(3)];
      expect(await erroresDe({ ...valida, points })).toEqual([]);
    });

    it('el mensaje está en español y sin términos técnicos (RN-6)', () => {
      expect(ERROR_POCOS_PUNTOS).toBe(
        'La actividad necesita al menos 3 puntos con buena precisión para guardarse',
      );
    });

    it('junta el error con los demás de reglasExtra', async () => {
      expect(
        await erroresDe({
          ...valida,
          endedAt: '2026-10-09T09:00:00.000Z',
          points: [punto(1)],
        }),
      ).toEqual([
        'El fin de la actividad no puede ser anterior al inicio',
        ERROR_POCOS_PUNTOS,
      ]);
    });
  });

  it('limita la cantidad de errores en la respuesta', async () => {
    const points = Array.from({ length: 50 }, (_, i) =>
      punto(i + 1, { latitude: 100 }),
    );
    const errores = await erroresDe({ ...valida, points });
    expect(errores).toHaveLength(MAX_ERRORES + 1);
    expect(errores.at(-1)).toBe('y 40 errores más');
  });
});
