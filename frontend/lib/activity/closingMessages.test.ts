import { describe, expect, it } from 'vitest';
import { CLOSING_MESSAGES, preguntaAlSalir } from './closingMessages';

describe('preguntaAlSalir (spec 003, CA-15; spec 012, CA-21)', () => {
  it('con 3 puntos válidos o más, la pregunta de siempre: lo grabado queda guardado', () => {
    for (const n of [3, 4, 5400]) {
      expect(preguntaAlSalir(n)).toEqual({
        titulo: '¿Terminar la actividad?',
        cuerpo: 'Si sales, la grabación termina y no se puede reanudar. Lo grabado queda guardado.',
        terminar: 'Terminar',
      });
    }
  });

  it('con menos de 3, avisa que la actividad no se guardará', () => {
    for (const n of [0, 1, 2]) {
      expect(preguntaAlSalir(n)).toEqual({
        titulo: '¿Terminar la actividad?',
        cuerpo:
          'Si sales, la grabación termina. La actividad tiene muy poco recorrido y no se guardará.',
        terminar: 'Terminar sin guardar',
      });
    }
  });
});

describe('textos sin términos técnicos (RN-6)', () => {
  it('no hablan de puntos, GPS ni precisión', () => {
    for (const texto of Object.values(CLOSING_MESSAGES)) {
      expect(texto).not.toMatch(/punto|gps|precisi|v[aá]lid/i);
    }
  });

  it('la pregunta de "Detener" (CA-17)', () => {
    expect(CLOSING_MESSAGES.sinGuardarTitulo).toBe('¿Terminar sin guardar?');
    expect(CLOSING_MESSAGES.sinGuardarCuerpo).toBe(
      'La actividad tiene muy poco recorrido y no se guardará.'
    );
  });
});
