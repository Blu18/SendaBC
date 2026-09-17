#!/usr/bin/env -S node
import type { Contract as Start } from '../../snapshots/625810681f4245ee5978258c279d310077d40c9e75e8870dfa38f8494849573b/contract';
import startContract from '../../snapshots/625810681f4245ee5978258c279d310077d40c9e75e8870dfa38f8494849573b/contract.json' with { type: 'json' };
import type { Contract as End } from '../../snapshots/9ade05938aaebd2cd875fb3b8f5e765d75c03f790918814beab4e4e4dc4e493e/contract';
import endContract from '../../snapshots/9ade05938aaebd2cd875fb3b8f5e765d75c03f790918814beab4e4e4dc4e493e/contract.json' with { type: 'json' };
import { Migration, MigrationCLI, col } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.dropConstraint({ schema: 'public', table: 'users', constraint: 'users_authUserId_key' }),
      this.dropColumn({ schema: 'public', table: 'users', column: 'authUserId' }),
      // `users` no tiene filas todavía (tabla recién creada, sin registro
      // de usuarios), así que se agrega directamente como NOT NULL — no
      // hace falta backfill.
      this.addColumn({
        schema: 'public',
        table: 'users',
        column: col('passwordHash', 'text', { codecRef: { codecId: 'pg/text@1' }, notNull: true }),
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
