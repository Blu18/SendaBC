import { Injectable } from '@nestjs/common';
import { ActivityType, Prisma, RouteDifficulty } from '@prisma/client';
import { PrismaService } from '../prisma.service.js';
import type { NearbyQueryDto } from './dto/nearby-query.dto.js';

// Como máximo 50 rutas, las más cercanas al centro (spec 006, CA-5).
export const MAX_NEARBY_ROUTES = 50;

// Tolerancia de ST_Simplify en grados (≈ 5 m): basta para dibujar a la escala del mapa sin
// descargar el recorrido completo (plan D3).
const SIMPLIFY_TOLERANCE_DEG = 0.00005;

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
