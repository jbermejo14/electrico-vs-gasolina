import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  findProvince,
  MIN_STATIONS_FOR_AVERAGE,
  parseFuelPriceSummary,
  provincesWithData,
  summarizeFuelPrices,
} from '../lib/fuelPrices';

const FIXTURE_FILE = join(__dirname, 'fixtures', 'estaciones.json');
// Precios inválidos del fixture: 9.99 (fuera de rango), "abc" (no numérico), 0.1 (fuera de rango)
// y una estación sin provinciaSlug (descartada entera).
const FIXTURE_DISCARDED = 4;

function loadFixture(): unknown {
  return JSON.parse(readFileSync(FIXTURE_FILE, 'utf8'));
}

function summarizeFixture() {
  return summarizeFuelPrices(loadFixture());
}

test('calcula la media nacional con redondeo a 3 decimales', () => {
  const { national } = summarizeFixture().summary;
  // gasolina: (14,1 + 15 + 1,2 + 3,2) / 23 = 1,45652...
  assert.deepEqual(national.gasolina95, { average: 1.457, stations: 23 });
  // diésel: (10,4 + 14 + 4,5) / 21 = 1,37619...
  assert.deepEqual(national.diesel, { average: 1.376, stations: 21 });
});

test('calcula la media de una provincia', () => {
  const madrid = findProvince(summarizeFixture().summary, 'madrid');
  assert.deepEqual(madrid?.gasolina95, { average: 1.5, stations: 10 });
  assert.deepEqual(madrid?.diesel, { average: 1.4, stations: 10 });
});

test('un precio nulo no cuenta como descartado ni entra en la media', () => {
  const albacete = findProvince(summarizeFixture().summary, 'albacete');
  assert.deepEqual(albacete?.gasolina95, { average: 1.41, stations: 10 });
  assert.equal(albacete?.diesel, null);
});

test('descarta y cuenta precios fuera de rango, no numéricos y estaciones sin provincia', () => {
  assert.equal(summarizeFixture().discardedPrices, FIXTURE_DISCARDED);
});

test('una provincia por debajo del umbral publica null', () => {
  const { summary } = summarizeFixture();
  const teruel = summary.provinces.find((province) => province.slug === 'teruel');
  assert.ok(2 < MIN_STATIONS_FOR_AVERAGE);
  assert.equal(teruel?.gasolina95, null);
  assert.equal(teruel?.diesel, null);
  assert.equal(findProvince(summary, 'teruel'), undefined);
});

test('provincesWithData excluye las provincias sin ninguna media', () => {
  const slugs = provincesWithData(summarizeFixture().summary).map((province) => province.slug);
  assert.deepEqual(slugs, ['albacete', 'madrid']);
});

test('las provincias salen en orden alfabético del español', () => {
  const names = summarizeFixture().summary.provinces.map((province) => province.name);
  assert.deepEqual(names, ['Albacete', 'Ávila', 'Madrid', 'Teruel']);
});

test('conserva fecha y fuente de MITECO', () => {
  const { summary } = summarizeFixture();
  assert.equal(summary.mitecoDate, '18/11/2026 18:03:47');
  assert.match(summary.source, /MITECO/);
  assert.match(summary.sourceUrl, /^https:\/\//);
});

test('findProvince con slug inexistente devuelve undefined', () => {
  assert.equal(findProvince(summarizeFixture().summary, 'atlantida'), undefined);
});

test('un payload inválido lanza error en español', () => {
  assert.throws(() => summarizeFuelPrices(null), /fechaMiteco/);
  assert.throws(() => summarizeFuelPrices({ estaciones: [] }), /fechaMiteco/);
  assert.throws(() => summarizeFuelPrices({ fechaMiteco: 'hoy', estaciones: 'no' }), /estaciones/);
});

test('un listado sin ningún precio válido lanza error', () => {
  assert.throws(() => summarizeFuelPrices({ fechaMiteco: 'hoy', estaciones: [] }), /ningún precio válido/);
});

test('parseFuelPriceSummary acepta un resumen generado y rechaza uno mal formado', () => {
  const { summary } = summarizeFixture();
  assert.deepEqual(parseFuelPriceSummary(JSON.parse(JSON.stringify(summary))), summary);
  assert.throws(() => parseFuelPriceSummary({}), /Precios de combustible inválidos/);
  assert.throws(() => parseFuelPriceSummary(null), /Precios de combustible inválidos/);
  assert.throws(() => parseFuelPriceSummary({ ...summary, provinces: 'no' }), /provinces/);
  assert.throws(
    () => parseFuelPriceSummary({ ...summary, national: { gasolina95: summary.national.gasolina95 } }),
    /national\.diesel/,
  );
  assert.throws(
    () => parseFuelPriceSummary({ ...summary, provinces: [{ slug: 'x', name: 'X', gasolina95: 1, diesel: null }] }),
    /provinces\[0\]\.gasolina95/,
  );
});
