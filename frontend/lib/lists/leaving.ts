// Filas de una lista que siguen visibles un momento después de quitarse, para animar su salida
// (spec 010, CA-25). Sin imports de React Native: se prueba con Vitest.
export type ListRow<T> = { item: T; leaving: boolean };

export const byId = (item: { id: string }) => item.id;

// Las filas de `next`, más las de `previous` que ya no están, cada una después de la fila que tenía
// antes. Una fila que regresa deja de salir.
export function withLeaving<T>(previous: ListRow<T>[], next: T[], keyOf: (item: T) => string): ListRow<T>[] {
    const present = new Set(next.map(keyOf));
    const rows: ListRow<T>[] = next.map((item) => ({ item, leaving: false }));

    previous.forEach((row, index) => {
        if (present.has(keyOf(row.item))) return;
        const before = index === 0 ? null : keyOf(previous[index - 1].item);
        const position = before === null ? 0 : rows.findIndex((r) => keyOf(r.item) === before) + 1;
        rows.splice(position, 0, { item: row.item, leaving: true });
    });

    return rows;
}
