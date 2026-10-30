import type { Prisma } from '@prisma/client';
import { CronExpression } from '@nestjs/schedule';
import type { PrismaService } from '../prisma.service.js';
import type { AlertsService } from './alerts.service.js';
import {
  limiteDeRegreso,
  MARGEN_REGRESO_MS,
  ReturnTimeJob,
} from './return-time.job.js';

const REGRESO = new Date('2026-10-22T20:00:00Z');
const minutosDespues = (min: number) =>
  new Date(REGRESO.getTime() + min * 60_000);

// La regla que aplica la consulta: returnBy < ahora - 30 min.
const vence = (returnBy: Date, ahora: Date) =>
  returnBy.getTime() < limiteDeRegreso(ahora).getTime();

function fila(overrides: Record<string, unknown> = {}) {
  return {
    id: 's-1',
    userId: 'u-1',
    type: 'TRAIL_RUNNING',
    returnBy: REGRESO,
    lat: 32.05,
    lng: -115.46,
    lastLocationAt: new Date('2026-10-22T19:40:00Z'),
    ...overrides,
  };
}

function montar(vencidas: unknown[] = [fila()]) {
  const prisma = { $queryRaw: vi.fn().mockResolvedValue(vencidas) };
  const alerts = {
    insertar: vi.fn().mockResolvedValue('a-1'),
    avisar: vi.fn().mockResolvedValue(undefined),
  };
  const job = new ReturnTimeJob(
    prisma as unknown as PrismaService,
    alerts as unknown as AlertsService,
  );
  return { job, prisma, alerts };
}

function consulta(prisma: ReturnType<typeof montar>['prisma']): Prisma.Sql {
  return prisma.$queryRaw.mock.calls[0][0] as Prisma.Sql;
}

describe('limiteDeRegreso (spec 008, RN-10)', () => {
  it('a los 29 min de la hora de regreso no avisa; a los 31 sí (CA-18)', () => {
    expect(MARGEN_REGRESO_MS).toBe(30 * 60_000);
    expect(vence(REGRESO, minutosDespues(29))).toBe(false);
    expect(vence(REGRESO, minutosDespues(30))).toBe(false);
    expect(vence(REGRESO, minutosDespues(31))).toBe(true);
  });

  it('una hora de regreso cambiada a una posterior usa la nueva (CA-19)', () => {
    const nueva = minutosDespues(60);
    expect(vence(nueva, minutosDespues(31))).toBe(false);
    expect(vence(nueva, minutosDespues(91))).toBe(true);
  });
});

describe('ReturnTimeJob.ejecutar (spec 008, CA-18, CA-19)', () => {
  it('busca solo sesiones sin terminar, vencidas y sin alerta activa ni aviso previo por esa hora', async () => {
    const { job, prisma } = montar([]);
    const ahora = minutosDespues(31);

    await job.ejecutar(ahora);

    const { sql, values } = consulta(prisma);
    expect(sql).toContain('s."endedAt" IS NULL');
    expect(sql).toContain('s."returnBy" IS NOT NULL');
    expect(sql).toContain('s."returnBy" < ?');
    expect(values).toEqual([limiteDeRegreso(ahora)]);
    expect(sql).toContain("a.status = 'ACTIVE'");
    expect(sql).toContain("a.reason = 'RETURN_TIME_EXCEEDED'");
    expect(sql).toContain('a."triggeredAt" > s."returnBy"');
  });

  it('crea la alerta RETURN_TIME con la última ubicación recibida y avisa (CA-18)', async () => {
    const { job, alerts } = montar();
    const ahora = minutosDespues(31);

    expect(await job.ejecutar(ahora)).toBe(1);

    expect(alerts.insertar).toHaveBeenCalledWith({
      sessionId: 's-1',
      clientAlertId: null,
      reason: 'RETURN_TIME_EXCEEDED',
      triggeredAt: ahora,
      ubicacion: {
        lat: 32.05,
        lng: -115.46,
        at: new Date('2026-10-22T19:40:00Z'),
      },
    });
    expect(alerts.avisar).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'u-1',
        type: 'TRAIL_RUNNING',
        returnBy: REGRESO,
      }),
      'a-1',
    );
  });

  it('sin ubicación recibida crea la alerta sin ubicación', async () => {
    const { job, alerts } = montar([
      fila({ lat: null, lng: null, lastLocationAt: null }),
    ]);

    await job.ejecutar(minutosDespues(31));

    expect(alerts.insertar.mock.calls[0][0].ubicacion).toBeNull();
  });

  it('sin sesiones vencidas (terminadas, sin hora o antes del margen) no crea nada', async () => {
    const { job, alerts } = montar([]);

    expect(await job.ejecutar(minutosDespues(29))).toBe(0);
    expect(alerts.insertar).not.toHaveBeenCalled();
  });

  it('si el índice único impide la alerta (otra ejecución ganó), no avisa dos veces', async () => {
    const { job, alerts } = montar();
    alerts.insertar.mockResolvedValue(null);

    expect(await job.ejecutar(minutosDespues(31))).toBe(0);
    expect(alerts.avisar).not.toHaveBeenCalled();
  });

  it('un fallo en una sesión no detiene a las demás', async () => {
    const { job, alerts } = montar([fila(), fila({ id: 's-2' })]);
    alerts.insertar
      .mockRejectedValueOnce(new Error('la base no responde'))
      .mockResolvedValueOnce('a-2');

    expect(await job.ejecutar(minutosDespues(31))).toBe(1);
    expect(alerts.avisar).toHaveBeenCalledWith(
      expect.objectContaining({ id: 's-2' }),
      'a-2',
    );
  });
});

describe('ReturnTimeJob.revisar (spec 008, plan D3)', () => {
  it('corre cada minuto con @Cron', () => {
    expect(
      Reflect.getMetadata(
        'SCHEDULE_CRON_OPTIONS',
        ReturnTimeJob.prototype.revisar,
      ),
    ).toMatchObject({ cronTime: CronExpression.EVERY_MINUTE });
  });

  it('no se encima consigo misma si una ejecución tarda', async () => {
    const { job, prisma } = montar([]);
    let terminar!: (filas: unknown[]) => void;
    prisma.$queryRaw.mockReturnValueOnce(
      new Promise((resolve) => (terminar = resolve)),
    );

    const primera = job.revisar();
    await job.revisar();
    terminar([]);
    await primera;

    expect(prisma.$queryRaw).toHaveBeenCalledTimes(1);
  });
});
