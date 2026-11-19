import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const SCRIPT = join('scripts', 'import-fuel-prices.ts');
const STATIONS_VARIABLE = 'FUEL_STATIONS_FILE';
const TEMPORARY_OUTPUT = join(process.cwd(), 'data', 'fuel-prices.json.tmp');

function runImporter(stationsFile: string) {
  return spawnSync(process.execPath, ['--import', 'tsx', SCRIPT], {
    cwd: process.cwd(),
    env: { ...process.env, [STATIONS_VARIABLE]: stationsFile },
    encoding: 'utf8',
  });
}

test('importador: un fichero que no es JSON sale con código 1 y explica qué falló', () => {
  const file = join(mkdtempSync(join(tmpdir(), 'import-script-')), 'estaciones.json');
  writeFileSync(file, 'esto no es json');
  const result = runImporter(file);
  assert.equal(result.status, 1);
  assert.ok(result.stderr.includes(`Error al importar ${file}:`), result.stderr);
  assert.ok(result.stderr.includes('Comprueba que es el estaciones.json generado por ../gasolineras.'));
  assert.equal(existsSync(TEMPORARY_OUTPUT), false);
});

test('importador: un fichero inexistente sale con código 1 y el mensaje de compilar gasolineras', () => {
  const result = runImporter(join(tmpdir(), 'import-script-no-existe', 'estaciones.json'));
  assert.equal(result.status, 1);
  assert.ok(result.stderr.includes('Compila antes la web de gasolineras'), result.stderr);
});
