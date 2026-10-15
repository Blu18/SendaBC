import { describe, expect, it } from 'vitest';
import type { Activity, ActivityPointInput } from '../db/activities';
import {
  payloadBytes,
  splitIntoBatches,
  toUploadPayload,
  type UploadPayload,
} from './payload';

function actividad(extra: Partial<Activity> = {}): Activity {
  return {
    localId: 7,
    clientGeneratedId: '3b241101-e2bb-4255-8caf-4136c566a962',
    userId: 'usuario-a',
    type: 'TRAIL_RUNNING',
    status: 'PENDING_SYNC',
    startedAt: '2026-10-09T10:00:00.000Z',
    endedAt: '2026-10-09T13:00:00.000Z',
    elevationSource: 'BAROMETER',
    distanceMeters: 21345.678,
    durationSeconds: 10800,
    elevationGainMeters: 1012.4,
    elevationLossMeters: 998.7,
    serverId: null,
    syncError: null,
    ...extra,
  };
}

// Coordenadas con todos los decimales que entrega el GPS, para medir el peso real.
function puntos(n: number): ActivityPointInput[] {
  return Array.from({ length: n }, (_, i) => ({
    sequence: i + 1,
    latitude: 31.866712345678901 + i * 1.234567e-5,
    longitude: -116.59643210987654 - i * 7.654321e-6,
    altitude: 1234.5678901234 + i / 100,
    accuracy: 4.800000190734863,
    recordedAt: new Date(Date.UTC(2026, 9, 9, 10) + i * 2000).toISOString(),
  }));
}

describe('toUploadPayload (spec 005, CA-5, CA-8)', () => {
  it('lleva las métricas, la fuente y los puntos de la actividad', () => {
    const p = puntos(2);

    expect(toUploadPayload(actividad(), p)).toEqual({
      clientGeneratedId: '3b241101-e2bb-4255-8caf-4136c566a962',
      type: 'TRAIL_RUNNING',
      startedAt: '2026-10-09T10:00:00.000Z',
      endedAt: '2026-10-09T13:00:00.000Z',
      distanceMeters: 21345.678,
      durationSeconds: 10800,
      elevationGainMeters: 1012.4,
      elevationLossMeters: 998.7,
      elevationSource: 'BAROMETER',
      points: p,
    });
  });

  it('no lleva userId, localId, estado ni campos locales (CA-8, CA-18)', () => {
    const conExtras = puntos(1).map((p) => ({ ...p, local_id: 99, activity_id: 7 }));

    const payload = toUploadPayload(actividad(), conExtras);

    for (const campo of ['userId', 'localId', 'status', 'serverId', 'syncError']) {
      expect(payload).not.toHaveProperty(campo);
    }
    expect(Object.keys(payload.points[0]).sort()).toEqual(
      ['accuracy', 'altitude', 'latitude', 'longitude', 'recordedAt', 'sequence'].sort()
    );
  });

  it('una actividad sin fuente (anterior a la v3) se sube como GPS', () => {
    expect(toUploadPayload(actividad({ elevationSource: null }), []).elevationSource).toBe(
      'GPS'
    );
  });

  it('falla si la actividad no tiene métricas', () => {
    expect(() => toUploadPayload(actividad({ distanceMeters: null }), [])).toThrow(
      /no tiene métricas/
    );
    expect(() => toUploadPayload(actividad({ endedAt: null }), [])).toThrow(/no tiene métricas/);
  });
});

describe('splitIntoBatches (spec 005, CA-2, CA-7)', () => {
  const ligera = (i: number): UploadPayload =>
    toUploadPayload(actividad({ clientGeneratedId: `id-${i}` }), puntos(3));

  it('12 actividades → lotes de 5, 5 y 2, en el mismo orden', () => {
    const payloads = Array.from({ length: 12 }, (_, i) => ligera(i));

    const batches = splitIntoBatches(payloads);

    expect(batches.map((b) => b.length)).toEqual([5, 5, 2]);
    expect(batches.flat()).toEqual(payloads);
  });

  it('sin actividades no hay lotes', () => {
    expect(splitIntoBatches([])).toEqual([]);
  });

  it('corta el lote cuando se pasaría del límite de bytes', () => {
    const payloads = Array.from({ length: 4 }, (_, i) => ligera(i));
    const size = payloadBytes(payloads[0]);

    // Caben 2 por lote.
    const batches = splitIntoBatches(payloads, { maxBytes: size * 2 + 10 });

    expect(batches.map((b) => b.length)).toEqual([2, 2]);
  });

  it('una actividad más grande que el límite va sola', () => {
    const payloads = [ligera(1), ligera(2), ligera(3)];

    const batches = splitIntoBatches(payloads, { maxBytes: 10 });

    expect(batches.map((b) => b.length)).toEqual([1, 1, 1]);
  });

  it('una actividad de 3 h (5 400 puntos) pesa menos de 1 MB y cabe en un lote', () => {
    const larga = toUploadPayload(actividad(), puntos(5400));

    expect(payloadBytes(larga)).toBeLessThan(1024 * 1024);
    expect(splitIntoBatches([larga, larga, larga, larga])).toHaveLength(1);
  });
});
