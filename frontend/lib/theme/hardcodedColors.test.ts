import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { describe, expect, it } from 'vitest';

// CA-10: pantallas y componentes toman los colores del tema, nunca literales.
const ROOT = join(__dirname, '..', '..');
const SCANNED = ['pages', 'components', 'App.tsx'];

// #RGB, #RRGGBB (y sus variantes con alfa #RGBA, #RRGGBBAA), rgb( y rgba(.
const COLOR_LITERAL = /#(?:[0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{3,4})\b|\brgba?\(/g;

// Archivos aún sin migrar a tokens. Cada tarea de pantallas (T12, T14–T18) quita los suyos;
// al terminar la spec la lista queda vacía.
const PENDING_MIGRATION: string[] = [];

function sourceFiles(path: string): string[] {
  if (statSync(path).isFile()) return /\.tsx?$/.test(path) ? [path] : [];
  return readdirSync(path).flatMap((name) => sourceFiles(join(path, name)));
}

function colorLiterals(file: string): string[] {
  return readFileSync(file, 'utf8')
    .split('\n')
    .flatMap((line, i) => (line.match(COLOR_LITERAL) ?? []).map((m) => `${i + 1}: ${m}`));
}

const files = SCANNED.flatMap((p) => sourceFiles(join(ROOT, p))).map((f) => ({
  name: relative(ROOT, f).replaceAll('\\', '/'),
  literals: colorLiterals(f),
}));

describe('colores sueltos', () => {
  it('sin colores sueltos en pantallas y componentes', () => {
    const offenders = Object.fromEntries(
      files
        .filter((f) => f.literals.length > 0 && !PENDING_MIGRATION.includes(f.name))
        .map((f) => [f.name, f.literals]),
    );
    expect(offenders).toEqual({});
  });

  it('la lista de pendientes no tiene archivos ya migrados', () => {
    const migrated = PENDING_MIGRATION.filter(
      (name) => !existsSync(join(ROOT, name)) || colorLiterals(join(ROOT, name)).length === 0,
    );
    expect(migrated).toEqual([]);
  });

  it('detecta los formatos de color', () => {
    const found = ['#FFF', '#5C6B49', '#5C6B4980', 'rgb(0, 0, 0)', 'rgba(0,0,0,0.5)'].map(
      (s) => s.match(COLOR_LITERAL)?.length ?? 0,
    );
    expect(found).toEqual([1, 1, 1, 1, 1]);
    expect('Ruta #12 ·  theme.colors.primary'.match(COLOR_LITERAL)).toBeNull();
  });
});

// CA-10: los espaciados y los tamaños de texto también salen del tema. Solo se aceptan 0 y
// valores calculados; los anchos y altos de cada elemento no son parte de la escala.
const SPACING_LITERAL = /\b(?:padding|margin|gap|rowGap|columnGap)\w*:\s*-?[1-9]/;
const TEXT_SIZE_LITERAL = /\b(?:fontSize|lineHeight):\s*[0-9]/;

function looseValues(file: string): string[] {
  return readFileSync(join(ROOT, file), 'utf8')
    .split('\n')
    .flatMap((line, i) =>
      SPACING_LITERAL.test(line) || TEXT_SIZE_LITERAL.test(line) ? [`${i + 1}: ${line.trim()}`] : [],
    );
}

describe('espaciados y tamaños de texto sueltos', () => {
  it('sin espaciados ni tamaños de texto sueltos en pantallas y componentes', () => {
    const offenders = Object.fromEntries(
      files.map((f) => [f.name, looseValues(f.name)]).filter(([, values]) => values.length > 0),
    );
    expect(offenders).toEqual({});
  });

  it('detecta los valores sueltos', () => {
    for (const line of ['gap: 2,', 'paddingTop: 12,', 'marginLeft: 48 + t.spacing.sm,', 'marginTop: -4,']) {
      expect(SPACING_LITERAL.test(line)).toBe(true);
    }
    expect(TEXT_SIZE_LITERAL.test('fontSize: 14,')).toBe(true);
    for (const line of ['gap: t.spacing.xs,', 'padding: 0,', 'width: 40,', 'marginLeft: t.spacing.sm,']) {
      expect(SPACING_LITERAL.test(line) || TEXT_SIZE_LITERAL.test(line)).toBe(false);
    }
  });
});
