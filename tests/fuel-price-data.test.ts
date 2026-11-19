import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { getFuelPriceSummary } from '../lib/fuelPriceData';
import { summarizeFuelPrices } from '../lib/fuelPrices';

const FIXTURE_FILE = join(__dirname, 'fixtures', 'estaciones.json');

function temporaryFile(name: string): string {
  return join(mkdtempSync(join(tmpdir(), 'fuel-price-data-')), name);
}

test('lee y valida un fichero de resumen', () => {
  const { summary } = summarizeFuelPrices(JSON.parse(readFileSync(FIXTURE_FILE, 'utf8')));
  const file = temporaryFile('fuel-prices.json');
  writeFileSync(file, JSON.stringify(summary));
  assert.deepEqual(getFuelPriceSummary(file), summary);
});

test('lanza el mensaje de importación si el fichero no existe', () => {
  assert.throws(
    () => getFuelPriceSummary(temporaryFile('no-existe.json')),
    /Falta data\/fuel-prices\.json\. Ejecuta npm run import-fuel/,
  );
});

test('lanza error si el fichero no cumple el formato', () => {
  const file = temporaryFile('mal.json');
  writeFileSync(file, '{}');
  assert.throws(() => getFuelPriceSummary(file), /Precios de combustible inválidos/);
});
