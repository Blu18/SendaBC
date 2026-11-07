import { describe, expect, it } from 'vitest';
import { byId, withLeaving, type ListRow } from './leaving';

type Item = { id: string };
const item = (id: string): Item => ({ id });
const rows = (...ids: string[]): ListRow<Item>[] => ids.map((id) => ({ item: item(id), leaving: false }));
const resumen = (lista: ListRow<Item>[]) => lista.map((r) => `${r.item.id}${r.leaving ? '-' : ''}`);

describe('withLeaving (spec 010, CA-25)', () => {
  it('sin cambios no hay filas saliendo', () => {
    expect(resumen(withLeaving(rows('a', 'b'), [item('a'), item('b')], byId))).toEqual(['a', 'b']);
  });

  it('una fila quitada se queda en su lugar, marcada', () => {
    expect(resumen(withLeaving(rows('a', 'b', 'c'), [item('a'), item('c')], byId))).toEqual(['a', 'b-', 'c']);
  });

  it('conserva el lugar de la primera y la última', () => {
    expect(resumen(withLeaving(rows('a', 'b'), [item('b')], byId))).toEqual(['a-', 'b']);
    expect(resumen(withLeaving(rows('a', 'b'), [item('a')], byId))).toEqual(['a', 'b-']);
  });

  it('dos filas seguidas quitadas conservan su orden', () => {
    expect(resumen(withLeaving(rows('a', 'b', 'c', 'd'), [item('a'), item('d')], byId))).toEqual([
      'a',
      'b-',
      'c-',
      'd',
    ]);
  });

  it('una fila que ya salía sigue saliendo, y una que regresa deja de salir', () => {
    const saliendo = withLeaving(rows('a', 'b'), [item('a')], byId);
    expect(resumen(withLeaving(saliendo, [item('a')], byId))).toEqual(['a', 'b-']);
    expect(resumen(withLeaving(saliendo, [item('a'), item('b')], byId))).toEqual(['a', 'b']);
  });

  it('una fila nueva entra sin marca y usa el dato más reciente', () => {
    const nuevo = { id: 'a' };
    const resultado = withLeaving(rows('a'), [nuevo, item('b')], byId);
    expect(resumen(resultado)).toEqual(['a', 'b']);
    expect(resultado[0].item).toBe(nuevo);
  });

  it('una lista vacía deja todas saliendo', () => {
    expect(resumen(withLeaving(rows('a', 'b'), [], byId))).toEqual(['a-', 'b-']);
  });
});
