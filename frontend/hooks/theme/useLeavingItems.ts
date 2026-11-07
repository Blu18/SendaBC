import { useEffect, useReducer, useRef } from 'react';
import { withLeaving, type ListRow } from '../../lib/lists/leaving';
import { useReducedMotion } from './useReducedMotion';
import { useTheme } from './useTheme';

// Conserva las filas quitadas mientras dura su salida (spec 010, CA-25). Se calcula al dibujar y
// no en un efecto: `items` puede ser un arreglo nuevo en cada render y el efecto no terminaría.
export function useLeavingItems<T>(items: T[], keyOf: (item: T) => string): ListRow<T>[] {
    const { motion } = useTheme();
    const delay = useReducedMotion() ? 0 : motion.content;
    const shown = useRef<ListRow<T>[]>([]);
    const [, redraw] = useReducer((n: number) => n + 1, 0);

    const rows = withLeaving(shown.current, items, keyOf);
    shown.current = rows;
    const leaving = rows.filter((row) => row.leaving).map((row) => keyOf(row.item)).join();

    useEffect(() => {
        if (!leaving) return;
        const timer = setTimeout(() => {
            shown.current = shown.current.filter((row) => !row.leaving);
            redraw();
        }, delay);
        return () => clearTimeout(timer);
    }, [leaving, delay]);

    return rows;
}
