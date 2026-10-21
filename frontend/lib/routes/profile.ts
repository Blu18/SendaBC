// Perfil de elevación para dibujarlo con columnas de View (spec 007, CA-11, plan D4).

/** [distancia acumulada m, altitud m], como lo devuelve GET /routes/:id */
export type Perfil = [number, number][];

export type ColumnaPerfil = {
  distanciaM: number; // centro de la columna
  altitudMinM: number;
  altitudMaxM: number;
  altura: number; // altitudMaxM normalizada entre la mínima y la máxima del perfil, de 0 a 1
};

export type PerfilGrafica = {
  columnas: ColumnaPerfil[];
  altitudMinM: number;
  altitudMaxM: number;
  distanciaTotalM: number;
};

// Altura de las columnas de un perfil plano: sin desnivel no hay mínimo ni máximo que separar.
const ALTURA_PLANA = 0.5;

// Altitud en una distancia, interpolada entre los dos puntos que la rodean.
function altitudEn(perfil: Perfil, distancia: number): number {
  const i = perfil.findIndex(([d]) => d >= distancia);
  if (i <= 0) return perfil[i === -1 ? perfil.length - 1 : 0][1];
  const [d0, a0] = perfil[i - 1];
  const [d1, a1] = perfil[i];
  return a0 + ((a1 - a0) * (distancia - d0)) / (d1 - d0);
}

/**
 * Agrupa el perfil en `columnas` tramos de la misma distancia, con la altitud mínima y máxima
 * de cada uno. Un tramo sin puntos (el perfil está muestreado) toma la altitud interpolada en su
 * centro. Sin perfil o con menos de 2 puntos devuelve null: no hay nada que dibujar.
 */
export function perfilParaGrafica(
  perfil: Perfil | null | undefined,
  columnas: number
): PerfilGrafica | null {
  if (!perfil || perfil.length < 2) return null;
  const n = Math.max(1, Math.floor(columnas));
  const inicio = perfil[0][0];
  const distanciaTotalM = perfil[perfil.length - 1][0] - inicio;
  if (distanciaTotalM <= 0) return null;

  const tramo = distanciaTotalM / n;
  const grupos = Array.from({ length: n }, () => [] as number[]);
  for (const [distancia, altitud] of perfil) {
    const i = Math.min(n - 1, Math.floor((distancia - inicio) / tramo));
    grupos[i].push(altitud);
  }

  const crudas = grupos.map((altitudes, i) => {
    const distanciaM = inicio + (i + 0.5) * tramo;
    const valores = altitudes.length > 0 ? altitudes : [altitudEn(perfil, distanciaM)];
    return { distanciaM, altitudMinM: Math.min(...valores), altitudMaxM: Math.max(...valores) };
  });

  const altitudMinM = Math.min(...perfil.map(([, a]) => a));
  const altitudMaxM = Math.max(...perfil.map(([, a]) => a));
  const rango = altitudMaxM - altitudMinM;
  return {
    columnas: crudas.map((c) => ({
      ...c,
      altura: rango === 0 ? ALTURA_PLANA : (c.altitudMaxM - altitudMinM) / rango,
    })),
    altitudMinM,
    altitudMaxM,
    distanciaTotalM,
  };
}
