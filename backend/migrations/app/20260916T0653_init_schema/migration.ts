#!/usr/bin/env -S node
import type { Contract as End } from '../../snapshots/625810681f4245ee5978258c279d310077d40c9e75e8870dfa38f8494849573b/contract';
import endContract from '../../snapshots/625810681f4245ee5978258c279d310077d40c9e75e8870dfa38f8494849573b/contract.json' with { type: 'json' };
import {
  Migration,
  MigrationCLI,
  checkExpression,
  col,
  fn,
  lit,
  primaryKey,
} from '@prisma/orm-postgres/migration';

export default class M extends Migration<never, End> {
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.createSchema({ schema: 'public' }),
      this.createTable({
        schema: 'public',
        table: 'activities',
        columns: [
          col('clientGeneratedId', 'uuid', { codecRef: { codecId: 'pg/uuid@1' } }),
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('distanceMeters', 'float8', { codecRef: { codecId: 'pg/float8@1' } }),
          col('durationSeconds', 'int4', { codecRef: { codecId: 'pg/int4@1' } }),
          col('elevationGainMeters', 'float8', { codecRef: { codecId: 'pg/float8@1' } }),
          col('elevationLossMeters', 'float8', { codecRef: { codecId: 'pg/float8@1' } }),
          col('endedAt', 'timestamptz', { codecRef: { codecId: 'pg/timestamptz-temporal@1' } }),
          col('id', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
          col('isPublished', 'bool', {
            notNull: true,
            default: lit(false),
            codecRef: { codecId: 'pg/bool@1' },
          }),
          col('path', 'geometry(Geometry,4326)', {
            codecRef: { codecId: 'pg/geometry@1', typeParams: { srid: 4326 } },
          }),
          col('startedAt', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('status', 'text', {
            notNull: true,
            default: lit('RECORDING'),
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('type', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('updatedAt', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('userId', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
        ],
        constraints: [
          primaryKey(['id']),
          checkExpression(
            'activities_status_check_28d5dc6a',
            "\"status\" IN ('RECORDING', 'PENDING_SYNC', 'SYNCED')",
          ),
          checkExpression(
            'activities_type_check_ccc9be64',
            "\"type\" IN ('HIKING', 'TRAIL_RUNNING', 'CYCLING')",
          ),
        ],
      }),
      this.createTable({
        schema: 'public',
        table: 'activity_points',
        columns: [
          col('accuracyMeters', 'float8', { codecRef: { codecId: 'pg/float8@1' } }),
          col('activityId', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
          col('altitudeMeters', 'float8', { codecRef: { codecId: 'pg/float8@1' } }),
          col('id', 'BIGSERIAL', { notNull: true, codecRef: { codecId: 'pg/int8@1' } }),
          col('location', 'geometry(Geometry,4326)', {
            notNull: true,
            codecRef: { codecId: 'pg/geometry@1', typeParams: { srid: 4326 } },
          }),
          col('recordedAt', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('sequence', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'devices',
        columns: [
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('expoPushToken', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('id', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
          col('platform', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('userId', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
        ],
        constraints: [
          primaryKey(['id']),
          checkExpression('devices_platform_check_120bc35e', "\"platform\" IN ('IOS', 'ANDROID')"),
        ],
      }),
      this.createTable({
        schema: 'public',
        table: 'emergency_alerts',
        columns: [
          col('activityId', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
          col('contactName', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('contactPhone', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('id', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
          col('notifiedAt', 'timestamptz', { codecRef: { codecId: 'pg/timestamptz-temporal@1' } }),
          col('reason', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('resolvedAt', 'timestamptz', { codecRef: { codecId: 'pg/timestamptz-temporal@1' } }),
          col('status', 'text', {
            notNull: true,
            default: lit('PENDING'),
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('triggeredAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
        ],
        constraints: [
          primaryKey(['id']),
          checkExpression(
            'emergency_alerts_reason_check_706d44f8',
            "\"reason\" IN ('INACTIVITY_TIMEOUT', 'MANUAL_SOS')",
          ),
          checkExpression(
            'emergency_alerts_status_check_1e8eabef',
            "\"status\" IN ('PENDING', 'NOTIFIED', 'ACKNOWLEDGED', 'RESOLVED')",
          ),
        ],
      }),
      this.createTable({
        schema: 'public',
        table: 'route_favorites',
        columns: [
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('routeId', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
          col('userId', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
        ],
        constraints: [primaryKey(['userId', 'routeId'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'routes',
        columns: [
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('createdByUserId', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
          col('description', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('difficulty', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('distanceMeters', 'float8', { codecRef: { codecId: 'pg/float8@1' } }),
          col('elevationGainMeters', 'float8', { codecRef: { codecId: 'pg/float8@1' } }),
          col('id', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
          col('name', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('path', 'geometry(Geometry,4326)', {
            codecRef: { codecId: 'pg/geometry@1', typeParams: { srid: 4326 } },
          }),
          col('region', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('sourceActivityId', 'uuid', { codecRef: { codecId: 'pg/uuid@1' } }),
          col('startPoint', 'geometry(Geometry,4326)', {
            codecRef: { codecId: 'pg/geometry@1', typeParams: { srid: 4326 } },
          }),
          col('status', 'text', {
            notNull: true,
            default: lit('DRAFT'),
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('type', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('updatedAt', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
        ],
        constraints: [
          primaryKey(['id']),
          checkExpression(
            'routes_difficulty_check_bd1ae86e',
            "\"difficulty\" IN ('EASY', 'MODERATE', 'HARD', 'EXTREME')",
          ),
          checkExpression(
            'routes_status_check_bc64f66b',
            "\"status\" IN ('DRAFT', 'PUBLISHED', 'ARCHIVED')",
          ),
          checkExpression(
            'routes_type_check_ccc9be64',
            "\"type\" IN ('HIKING', 'TRAIL_RUNNING', 'CYCLING')",
          ),
        ],
      }),
      this.createTable({
        schema: 'public',
        table: 'users',
        columns: [
          col('authUserId', 'uuid', { codecRef: { codecId: 'pg/uuid@1' } }),
          col('avatarUrl', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('displayName', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('email', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('emergencyContactName', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('emergencyContactPhone', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('id', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
          col('updatedAt', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.addUnique({
        schema: 'public',
        table: 'activities',
        constraint: 'activities_clientGeneratedId_key',
        columns: ['clientGeneratedId'],
      }),
      this.addUnique({
        schema: 'public',
        table: 'devices',
        constraint: 'devices_expoPushToken_key',
        columns: ['expoPushToken'],
      }),
      this.addUnique({
        schema: 'public',
        table: 'routes',
        constraint: 'routes_sourceActivityId_key',
        columns: ['sourceActivityId'],
      }),
      this.addUnique({
        schema: 'public',
        table: 'users',
        constraint: 'users_authUserId_key',
        columns: ['authUserId'],
      }),
      this.addUnique({
        schema: 'public',
        table: 'users',
        constraint: 'users_email_key',
        columns: ['email'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'activities',
        index: 'activities_userId_idx_a489d58a',
        columns: ['userId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'activity_points',
        index: 'activity_points_activityId_idx_bf2a659e',
        columns: ['activityId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'activity_points',
        index: 'activity_points_activityId_sequence_idx_0b074f75',
        columns: ['activityId', 'sequence'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'devices',
        index: 'devices_userId_idx_a489d58a',
        columns: ['userId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'emergency_alerts',
        index: 'emergency_alerts_activityId_idx_bf2a659e',
        columns: ['activityId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'route_favorites',
        index: 'route_favorites_routeId_idx_91ae2fd6',
        columns: ['routeId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'route_favorites',
        index: 'route_favorites_userId_idx_a489d58a',
        columns: ['userId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'routes',
        index: 'routes_createdByUserId_idx_93e8a540',
        columns: ['createdByUserId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'routes',
        index: 'routes_status_idx_e98638ab',
        columns: ['status'],
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'activities',
        foreignKey: {
          name: 'activities_userId_fkey',
          columns: ['userId'],
          references: { schema: 'public', table: 'users', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'activity_points',
        foreignKey: {
          name: 'activity_points_activityId_fkey',
          columns: ['activityId'],
          references: { schema: 'public', table: 'activities', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'devices',
        foreignKey: {
          name: 'devices_userId_fkey',
          columns: ['userId'],
          references: { schema: 'public', table: 'users', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'emergency_alerts',
        foreignKey: {
          name: 'emergency_alerts_activityId_fkey',
          columns: ['activityId'],
          references: { schema: 'public', table: 'activities', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'route_favorites',
        foreignKey: {
          name: 'route_favorites_userId_fkey',
          columns: ['userId'],
          references: { schema: 'public', table: 'users', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'route_favorites',
        foreignKey: {
          name: 'route_favorites_routeId_fkey',
          columns: ['routeId'],
          references: { schema: 'public', table: 'routes', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'routes',
        foreignKey: {
          name: 'routes_createdByUserId_fkey',
          columns: ['createdByUserId'],
          references: { schema: 'public', table: 'users', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'routes',
        foreignKey: {
          name: 'routes_sourceActivityId_fkey',
          columns: ['sourceActivityId'],
          references: { schema: 'public', table: 'activities', columns: ['id'] },
        },
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
