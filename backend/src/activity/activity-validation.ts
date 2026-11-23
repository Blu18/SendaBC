import { plainToInstance } from 'class-transformer';
import { validate, type ValidationError } from 'class-validator';
import { contarPuntosValidos, MIN_PUNTOS_VALIDOS } from './distancia.js';
import { ActivityUploadDto } from './dto/activity-upload.dto.js';

// Una actividad con miles de puntos inválidos no debe producir una respuesta enorme.
export const MAX_ERRORES = 10;

// Spec 012, CA-26: una actividad con menos de MIN_PUNTOS_VALIDOS puntos válidos no se guarda.
export const ERROR_POCOS_PUNTOS =
  'La actividad necesita al menos 3 puntos con buena precisión para guardarse';

export type ResultadoValidacion =
  { ok: true; actividad: ActivityUploadDto } | { ok: false; errores: string[] };

// Valida una actividad del lote por separado (spec 005, CA-11, RN-5). Con whitelist se
// descartan los campos no declarados, incluido un userId en el body (CA-18).
export async function validarActividad(
  item: unknown,
): Promise<ResultadoValidacion> {
  if (typeof item !== 'object' || item === null || Array.isArray(item)) {
    return { ok: false, errores: ['La actividad debe ser un objeto'] };
  }

  const actividad = plainToInstance(ActivityUploadDto, item);
  const errores = aplanarErrores(
    await validate(actividad, { whitelist: true }),
  );
  // Las reglas extra comparan fechas y secuencias: solo tienen sentido si los campos ya son válidos.
  if (errores.length === 0) errores.push(...reglasExtra(actividad));

  if (errores.length > 0) return { ok: false, errores: recortar(errores) };
  return { ok: true, actividad };
}

// Reglas de RN-5 que los decoradores no cubren.
export function reglasExtra(actividad: ActivityUploadDto): string[] {
  const errores: string[] = [];

  if (Date.parse(actividad.endedAt) < Date.parse(actividad.startedAt)) {
    errores.push('El fin de la actividad no puede ser anterior al inicio');
  }

  const vistas = new Set<number>();
  const repetidas = new Set<number>();
  for (const punto of actividad.points) {
    if (vistas.has(punto.sequence)) repetidas.add(punto.sequence);
    vistas.add(punto.sequence);
  }
  for (const sequence of repetidas) {
    errores.push(`La secuencia ${sequence} está repetida`);
  }

  // Sin precisión se guarda como NULL (activity.service.ts), así que aquí cuenta igual:
  // la migración de actividades cortas y el recálculo de distancia ven lo mismo.
  const validos = contarPuntosValidos(
    actividad.points.map((p) => ({ accuracy: p.accuracy ?? null })),
  );
  if (validos < MIN_PUNTOS_VALIDOS) {
    errores.push(ERROR_POCOS_PUNTOS);
  }

  return errores;
}

// Convierte los errores anidados de class-validator en mensajes legibles. Los de los puntos
// llevan su posición en la lista, empezando en 1: "Punto 4: La latitud debe estar entre -90 y 90".
function aplanarErrores(errors: ValidationError[], punto?: number): string[] {
  const mensajes: string[] = [];
  for (const error of errors) {
    const prefijo = punto === undefined ? '' : `Punto ${punto}: `;
    for (const mensaje of Object.values(error.constraints ?? {})) {
      mensajes.push(prefijo + mensaje);
    }
    if (error.children?.length) {
      // En "points" cada hijo es un índice de la lista: desde ahí los mensajes llevan el número
      // de punto. Dentro de un punto, los hijos son sus campos.
      const esLista = error.property === 'points' && punto === undefined;
      for (const hijo of error.children) {
        mensajes.push(
          ...aplanarErrores(
            [hijo],
            esLista ? Number(hijo.property) + 1 : punto,
          ),
        );
      }
    }
  }
  return mensajes;
}

function recortar(errores: string[]): string[] {
  const unicos = [...new Set(errores)];
  if (unicos.length <= MAX_ERRORES) return unicos;
  return [
    ...unicos.slice(0, MAX_ERRORES),
    `y ${unicos.length - MAX_ERRORES} errores más`,
  ];
}
