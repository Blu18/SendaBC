import { randomUUID } from 'node:crypto';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  ActivityStatus,
  ActivityType,
  Prisma,
  RouteDifficulty,
  RouteStatus,
} from '@prisma/client';
import { PrismaService } from '../prisma.service.js';
import { dificultadDe } from './difficulty.js';
import type { CreateRouteDto } from './dto/create-route.dto.js';
import type { NearbyQueryDto } from './dto/nearby-query.dto.js';
import type { UpdateRouteDto } from './dto/update-route.dto.js';
import {
  perfilDe,
  type Perfil,
  type PuntoPerfil,
} from './elevation-profile.js';

// Como máximo 50 rutas, las más cercanas al centro (spec 006, CA-5).
export const MAX_NEARBY_ROUTES = 50;

// Una ruta debe medir al menos 1.5 km (spec 007, RN-5).
export const MIN_PUBLISH_DISTANCE_M = 1_500;

export const MENSAJES_PUBLICAR = {
  actividadNoEncontrada: 'Actividad no encontrada',
  muyCorta: 'Una ruta debe medir al menos 1.5 km',
  sinRecorrido: 'La actividad no tiene recorrido para publicar',
  yaPublicada: 'Esta actividad ya tiene una ruta publicada',
};

export const MENSAJES_RUTA = {
  noDisponible: 'Esta ruta ya no está disponible',
  soloDueno: 'Solo quien publicó esta ruta puede cambiarla',
};

// Una actividad de 3 h trae ~5 400 puntos: leerlos y calcular el perfil cabe de sobra.
const TRANSACTION_TIMEOUT_MS = 15_000;

// Tolerancia de ST_Simplify en grados (≈ 5 m): basta para dibujar a la escala del mapa sin
// descargar el recorrido completo (plan D3).
const SIMPLIFY_TOLERANCE_DEG = 0.00005;
// En el detalle, ≈ 2 m: a escala de calle no se nota y una ruta de 3 h baja de ~5 400 puntos
// a unos cientos (spec 007, plan D3).
const DETAIL_SIMPLIFY_TOLERANCE_DEG = 0.00002;

// Quién ve una ruta (spec 007, CA-14, CA-19): publicada, todos; archivada, solo su dueño;
// borrada, nadie.
export function esVisible(status: RouteStatus, esMia: boolean): boolean {
  return status === 'PUBLISHED' || (status === 'ARCHIVED' && esMia);
}

export type RouteDetail = {
  id: string;
  name: string;
  description: string | null;
  region: string | null;
  type: ActivityType;
  difficulty: RouteDifficulty | null;
  distanceMeters: number | null;
  elevationGainMeters: number | null;
  start: { latitude: number; longitude: number };
  path: [number, number][]; // [longitud, latitud]
  elevationProfile: Perfil | null; // [distancia acumulada m, altitud m]
  author: string;
  isMine: boolean;
  isFavorite: boolean;
  status: 'PUBLISHED' | 'ARCHIVED';
  sourceActivityId: string | null;
  publishedAt: string;
};

export type MyRoute = {
  id: string;
  name: string;
  type: ActivityType;
  distanceMeters: number | null;
  status: 'PUBLISHED' | 'ARCHIVED';
  sourceActivityId: string | null;
  publishedAt: string;
};

export type FavoriteRoute = {
  id: string;
  name: string;
  type: ActivityType;
  distanceMeters: number | null;
  elevationGainMeters: number | null;
  available: boolean;
  savedAt: string;
};

type DetailRow = {
  id: string;
  name: string;
  description: string | null;
  region: string | null;
  type: ActivityType;
  difficulty: RouteDifficulty | null;
  distanceMeters: number | null;
  elevationGainMeters: number | null;
  lat: number;
  lng: number;
  path: string | null; // GeoJSON de ST_AsGeoJSON
  elevationProfile: Perfil | null;
  author: string;
  isMine: boolean;
  isFavorite: boolean;
  status: RouteStatus;
  sourceActivityId: string | null;
  createdAt: Date;
};

export type NearbyRoute = {
  id: string;
  name: string;
  type: ActivityType;
  difficulty: RouteDifficulty | null;
  distanceMeters: number | null;
  elevationGainMeters: number | null;
  start: { latitude: number; longitude: number };
  distanceFromCenterMeters: number;
  path: [number, number][]; // [longitud, latitud]
  author: string;
  isMine: boolean;
};

type NearbyRow = {
  id: string;
  name: string;
  type: ActivityType;
  difficulty: RouteDifficulty | null;
  distanceMeters: number | null;
  elevationGainMeters: number | null;
  lat: number;
  lng: number;
  distanceFromCenterMeters: number;
  path: string | null; // GeoJSON de ST_AsGeoJSON
  author: string;
  isMine: boolean;
};

@Injectable()
export class RouteService {
  constructor(private readonly prisma: PrismaService) {}

  // Rutas publicadas cuyo inicio está dentro del radio, la más cercana primero (CA-2 a CA-5,
  // CA-12). La ubicación solo se usa como centro de la consulta; no se guarda (constitución 3.5).
  async nearby(userId: string, query: NearbyQueryDto): Promise<NearbyRoute[]> {
    const { lat, lng, radiusKm, type } = query;
    const filtroTipo = type
      ? Prisma.sql`AND r.type = ${type}::"ActivityType"`
      : Prisma.empty;

    const rows = await this.prisma.$queryRaw<NearbyRow[]>`
      WITH centro AS (SELECT ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)::geography AS g)
      SELECT r.id, r.name, r.type, r.difficulty, r."distanceMeters", r."elevationGainMeters",
             ST_Y(r."startPoint"::geometry) AS lat, ST_X(r."startPoint"::geometry) AS lng,
             ST_Distance(r."startPoint", centro.g) AS "distanceFromCenterMeters",
             ST_AsGeoJSON(ST_Simplify(r.path, ${SIMPLIFY_TOLERANCE_DEG})) AS path,
             u."displayName" AS author, (r."createdByUserId" = ${userId}::uuid) AS "isMine"
      FROM routes r JOIN users u ON u.id = r."createdByUserId", centro
      WHERE r.status = 'PUBLISHED'
        AND ST_DWithin(r."startPoint", centro.g, ${radiusKm * 1000})
        ${filtroTipo}
      ORDER BY "distanceFromCenterMeters"
      LIMIT ${MAX_NEARBY_ROUTES}`;

    return rows.map(toNearbyRoute);
  }

  // Publica una actividad del usuario del token como ruta y devuelve el id de la ruta
  // (spec 007, CA-6, CA-8, CA-9). Tipo, distancia, elevación y recorrido salen de la
  // actividad (RN-1); la dificultad y el perfil se calculan aquí (RN-6, RN-8).
  async publish(userId: string, dto: CreateRouteDto): Promise<string> {
    try {
      return await this.prisma.$transaction(
        async (tx) => {
          // Ajena o inexistente responden igual: no se revela que existe (CA-9).
          const actividad = await tx.activity.findFirst({
            where: {
              id: dto.activityId,
              userId,
              status: ActivityStatus.SYNCED,
            },
            select: {
              id: true,
              type: true,
              distanceMeters: true,
              elevationGainMeters: true,
              route: { select: { id: true } },
            },
          });
          if (!actividad) {
            throw new NotFoundException(
              MENSAJES_PUBLICAR.actividadNoEncontrada,
            );
          }
          const distancia = actividad.distanceMeters ?? 0;
          if (distancia < MIN_PUBLISH_DISTANCE_M) {
            throw new BadRequestException(MENSAJES_PUBLICAR.muyCorta);
          }
          // Una ruta borrada suelta su sourceActivityId, así que esta relación solo ve una
          // publicada o archivada (RN-2, plan D5).
          if (actividad.route) {
            throw new ConflictException(MENSAJES_PUBLICAR.yaPublicada);
          }

          const puntos = await tx.$queryRaw<PuntoPerfil[]>`
            SELECT ST_Y(location) AS lat, ST_X(location) AS lng, "altitudeMeters"
            FROM activity_points
            WHERE "activityId" = ${actividad.id}::uuid
            ORDER BY sequence`;
          // activities.path solo existe con 2 puntos o más (spec 005, CA-6).
          if (puntos.length < 2) {
            throw new BadRequestException(MENSAJES_PUBLICAR.sinRecorrido);
          }

          const elevacion = actividad.elevationGainMeters ?? 0;
          const perfil = perfilDe(puntos);
          const id = randomUUID();
          await tx.$executeRaw`
            INSERT INTO routes (id, name, description, region, type, difficulty,
                                "distanceMeters", "elevationGainMeters", path, "startPoint",
                                "elevationProfile", status, "createdByUserId",
                                "sourceActivityId", "updatedAt")
            SELECT ${id}::uuid, ${dto.name}, ${dto.description ?? null}, ${dto.region ?? null},
                   a.type, ${dificultadDe(actividad.type, distancia, elevacion)}::"RouteDifficulty",
                   ${distancia}, ${elevacion}, a.path, ST_StartPoint(a.path)::geography,
                   ${perfil === null ? null : JSON.stringify(perfil)}::jsonb, 'PUBLISHED',
                   ${userId}::uuid, a.id, now()
            FROM activities a
            WHERE a.id = ${actividad.id}::uuid`;
          return id;
        },
        { timeout: TRANSACTION_TIMEOUT_MS },
      );
    } catch (error) {
      // Dos publicaciones simultáneas de la misma actividad: la segunda choca con el UNIQUE
      // de sourceActivityId (plan, reglas del servidor).
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException(MENSAJES_PUBLICAR.yaPublicada);
      }
      throw error;
    }
  }

  // Detalle de una ruta (CA-10 a CA-12). Lo que el usuario no puede ver responde 404 con el
  // mismo mensaje, exista o no (CA-14).
  async detail(userId: string, id: string): Promise<RouteDetail> {
    const [row] = await this.prisma.$queryRaw<DetailRow[]>`
      SELECT r.id, r.name, r.description, r.region, r.type, r.difficulty,
             r."distanceMeters", r."elevationGainMeters",
             ST_Y(r."startPoint"::geometry) AS lat, ST_X(r."startPoint"::geometry) AS lng,
             ST_AsGeoJSON(ST_Simplify(r.path, ${DETAIL_SIMPLIFY_TOLERANCE_DEG})) AS path,
             r."elevationProfile", u."displayName" AS author,
             (r."createdByUserId" = ${userId}::uuid) AS "isMine",
             EXISTS (SELECT 1 FROM route_favorites f
                     WHERE f."routeId" = r.id AND f."userId" = ${userId}::uuid) AS "isFavorite",
             r.status, r."sourceActivityId", r."createdAt"
      FROM routes r JOIN users u ON u.id = r."createdByUserId"
      WHERE r.id = ${id}::uuid`;
    if (!row || !esVisible(row.status, row.isMine)) {
      throw new NotFoundException(MENSAJES_RUTA.noDisponible);
    }
    return toRouteDetail(row);
  }

  // Editar nombre, descripción y zona, archivar o volver a publicar (CA-22 a CA-24). Lo que
  // no se envía no cambia; tipo, dificultad, distancia, elevación y recorrido no están en el
  // DTO (RN-1).
  async update(
    userId: string,
    id: string,
    dto: UpdateRouteDto,
  ): Promise<RouteDetail> {
    await this.exigirDueno(userId, id);
    await this.prisma.route.updateMany({
      where: { id, createdByUserId: userId, status: { not: 'DELETED' } },
      data: {
        name: dto.name,
        description: dto.description,
        region: dto.region,
        status: dto.status,
      },
    });
    return this.detail(userId, id);
  }

  // Borrado lógico (CA-25, plan D5): las favoritas de los demás se conservan y la actividad
  // queda libre para publicarse de nuevo (RN-2).
  async remove(userId: string, id: string): Promise<void> {
    await this.exigirDueno(userId, id);
    await this.prisma.route.updateMany({
      where: { id, createdByUserId: userId, status: { not: 'DELETED' } },
      data: { status: 'DELETED', sourceActivityId: null },
    });
  }

  // "Mis rutas" (CA-21): publicadas y archivadas, la más reciente primero. Las borradas ya
  // no aparecen (CA-25).
  async listMine(userId: string): Promise<MyRoute[]> {
    const rutas = await this.prisma.route.findMany({
      where: {
        createdByUserId: userId,
        status: { in: ['PUBLISHED', 'ARCHIVED'] },
      },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        type: true,
        distanceMeters: true,
        status: true,
        sourceActivityId: true,
        createdAt: true,
      },
    });
    return rutas.map(({ createdAt, status, ...ruta }) => ({
      ...ruta,
      status: status as MyRoute['status'],
      publishedAt: createdAt.toISOString(),
    }));
  }

  // "Mis favoritas" (CA-18, CA-20): solo las del usuario del token, la guardada más reciente
  // primero. Las archivadas o borradas siguen en la lista como no disponibles (CA-19).
  async listFavorites(userId: string): Promise<FavoriteRoute[]> {
    const favoritas = await this.prisma.routeFavorite.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      select: {
        createdAt: true,
        route: {
          select: {
            id: true,
            name: true,
            type: true,
            distanceMeters: true,
            elevationGainMeters: true,
            status: true,
            createdByUserId: true,
          },
        },
      },
    });
    return favoritas.map(({ createdAt, route }) => ({
      id: route.id,
      name: route.name,
      type: route.type,
      distanceMeters: route.distanceMeters,
      elevationGainMeters: route.elevationGainMeters,
      available: esVisible(route.status, route.createdByUserId === userId),
      savedAt: createdAt.toISOString(),
    }));
  }

  // Guardar en favoritas (CA-15, CA-16): solo una ruta que el usuario puede ver. Guardarla
  // otra vez no la duplica ni da error: ON CONFLICT DO NOTHING sobre la llave (userId, routeId).
  async addFavorite(userId: string, id: string): Promise<void> {
    const ruta = await this.prisma.route.findUnique({
      where: { id },
      select: { createdByUserId: true, status: true },
    });
    if (!ruta || !esVisible(ruta.status, ruta.createdByUserId === userId)) {
      throw new NotFoundException(MENSAJES_RUTA.noDisponible);
    }
    await this.prisma.routeFavorite.createMany({
      data: [{ userId, routeId: id }],
      skipDuplicates: true,
    });
  }

  // Quitar de favoritas (CA-16, CA-19): funciona aunque la ruta ya no esté disponible, y
  // quitar una que no está no da error.
  async removeFavorite(userId: string, id: string): Promise<void> {
    await this.prisma.routeFavorite.deleteMany({
      where: { userId, routeId: id },
    });
  }

  // 404 si el usuario no puede ver la ruta; 403 si la ve pero no es suya, como las de
  // ejemplo de SendaBC (CA-26).
  private async exigirDueno(userId: string, id: string): Promise<void> {
    const ruta = await this.prisma.route.findUnique({
      where: { id },
      select: { createdByUserId: true, status: true },
    });
    const esMia = ruta?.createdByUserId === userId;
    if (!ruta || !esVisible(ruta.status, esMia)) {
      throw new NotFoundException(MENSAJES_RUTA.noDisponible);
    }
    if (!esMia) throw new ForbiddenException(MENSAJES_RUTA.soloDueno);
  }
}

function toRouteDetail(row: DetailRow): RouteDetail {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    region: row.region,
    type: row.type,
    difficulty: row.difficulty,
    distanceMeters: row.distanceMeters,
    elevationGainMeters: row.elevationGainMeters,
    start: { latitude: Number(row.lat), longitude: Number(row.lng) },
    path: parsePath(row.path),
    elevationProfile: row.elevationProfile,
    author: row.author,
    isMine: row.isMine,
    isFavorite: row.isFavorite,
    // esVisible ya descartó DELETED y DRAFT.
    status: row.status as RouteDetail['status'],
    // La actividad de origen es dato del dueño; a los demás no se les muestra.
    sourceActivityId: row.isMine ? row.sourceActivityId : null,
    publishedAt: row.createdAt.toISOString(),
  };
}

function toNearbyRoute(row: NearbyRow): NearbyRoute {
  return {
    id: row.id,
    name: row.name,
    type: row.type,
    difficulty: row.difficulty,
    distanceMeters: row.distanceMeters,
    elevationGainMeters: row.elevationGainMeters,
    start: { latitude: Number(row.lat), longitude: Number(row.lng) },
    distanceFromCenterMeters: Number(row.distanceFromCenterMeters),
    path: parsePath(row.path),
    author: row.author,
    isMine: row.isMine,
  };
}

// Una ruta sin recorrido se muestra solo con su marcador.
function parsePath(geojson: string | null): [number, number][] {
  if (!geojson) return [];
  const { coordinates } = JSON.parse(geojson) as {
    coordinates: [number, number][];
  };
  return coordinates.map(([lng, lat]) => [lng, lat]);
}
