import { beforeEach, describe, expect, it, vi } from 'vitest';
import { UMBRALES } from './inactivity';

// Spec 008, CA-11 y CA-12 (spec 011, CA-23): qué respuesta reinicia la detección y qué lleva la
// pregunta. Se simula expo-notifications; que suene y se vea se comprueba en el teléfono (008 M).

const n = vi.hoisted(() => ({
  setNotificationChannelAsync: vi.fn(),
  setNotificationCategoryAsync: vi.fn(),
  scheduleNotificationAsync: vi.fn(),
  dismissNotificationAsync: vi.fn(),
  cancelScheduledNotificationAsync: vi.fn(),
}));

vi.mock('react-native', () => ({ Platform: { OS: 'android' } }));
vi.mock('expo-notifications', () => ({
  ...n,
  DEFAULT_ACTION_IDENTIFIER: 'expo.modules.notifications.actions.DEFAULT',
  AndroidImportance: { MAX: 5 },
  AndroidNotificationVisibility: { PUBLIC: 1 },
  AndroidNotificationPriority: { MAX: 'max' },
  SchedulableTriggerInputTypes: { DATE: 'date' },
}));

const { ACCION_ESTOY_BIEN, CANAL, CATEGORIA, ID_PREGUNTA, esRespuestaEstoyBien, preguntarYa, programarPregunta } =
  await import('./notifications');

const respuesta = (identifier: string, actionIdentifier: string) =>
  ({ notification: { request: { identifier } }, actionIdentifier }) as never;

beforeEach(() => {
  vi.clearAllMocks();
  for (const f of Object.values(n)) f.mockResolvedValue(undefined);
});

describe('esRespuestaEstoyBien (spec 008, CA-12)', () => {
  it('"Estoy bien" o abrir la app desde la pregunta reinician', () => {
    expect(esRespuestaEstoyBien(respuesta(ID_PREGUNTA, ACCION_ESTOY_BIEN))).toBe(true);
    expect(esRespuestaEstoyBien(respuesta(ID_PREGUNTA, 'expo.modules.notifications.actions.DEFAULT'))).toBe(true);
  });

  it('otra acción u otra notificación no reinician', () => {
    expect(esRespuestaEstoyBien(respuesta(ID_PREGUNTA, 'OTRA'))).toBe(false);
    expect(esRespuestaEstoyBien(respuesta('otra', ACCION_ESTOY_BIEN))).toBe(false);
  });
});

describe('la pregunta (spec 008, CA-11; spec 011, CA-51)', () => {
  const quince = { ...UMBRALES, quietoMs: 15 * 60_000, respuestaMs: 3 * 60_000 };

  it('programarPregunta quita la que está en pantalla y agenda la nueva con los umbrales dados', async () => {
    await programarPregunta(1_000_000, quince);

    expect(n.dismissNotificationAsync).toHaveBeenCalledWith(ID_PREGUNTA);
    const [{ identifier, content, trigger }] = n.scheduleNotificationAsync.mock.calls[0];
    expect(identifier).toBe(ID_PREGUNTA);
    expect(trigger).toEqual({ type: 'date', date: 1_000_000, channelId: CANAL });
    expect(content).toMatchObject({
      title: '¿Estás bien?',
      categoryIdentifier: CATEGORIA,
      sticky: true,
      autoDismiss: false,
    });
    expect(content.body).toContain('15 min');
    expect(content.body).toContain('3 min');
    // La primera vez se preparan el canal de Android y la categoría con el botón "Estoy bien".
    expect(n.setNotificationChannelAsync).toHaveBeenCalledWith(CANAL, expect.anything());
    expect(n.setNotificationCategoryAsync).toHaveBeenCalledWith(CATEGORIA, [
      expect.objectContaining({ identifier: ACCION_ESTOY_BIEN, buttonTitle: 'Estoy bien' }),
    ]);
  });

  it('el canal y la categoría con "Estoy bien" se crean una sola vez', async () => {
    await preguntarYa(quince);
    await preguntarYa(quince);

    expect(n.scheduleNotificationAsync).toHaveBeenCalledTimes(2);
    expect(n.scheduleNotificationAsync.mock.calls[1][0].trigger).toEqual({ channelId: CANAL });
    // Ya se prepararon en la prueba anterior del mismo módulo.
    expect(n.setNotificationChannelAsync).not.toHaveBeenCalled();
    expect(n.setNotificationCategoryAsync).not.toHaveBeenCalled();
  });
});
