import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  averagePricesOf,
  findProvince,
  MIN_STATIONS_FOR_AVERAGE,
  parseFuelPriceSummary,
  provincePageSlug,
  provincesWithData,
  rankProvincesByGasoline,
  summarizeFuelPrices,
  type ProvinceFuelPrices,
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
  assert.equal(teruel?.gasolina95, null);
  assert.equal(teruel?.diesel, null);
  assert.equal(findProvince(summary, 'teruel'), undefined);
});

test('el umbral publica la media con 10 estaciones y no con 9', () => {
  const payload = (stations: number) => ({
    fechaMiteco: '18/11/2026 18:03:47',
    estaciones: Array.from({ length: stations }, () => ({
      provincia: 'Soria',
      provinciaSlug: 'soria',
      precios: { gasolina95: 1.5, diesel: 1.4 },
    })),
  });
  assert.equal(MIN_STATIONS_FOR_AVERAGE, 10);
  const nine = summarizeFuelPrices(payload(MIN_STATIONS_FOR_AVERAGE - 1));
  assert.deepEqual(nine.summary.provinces.map((province) => province.gasolina95), [null]);
  assert.deepEqual(nine.summary.provinces.map((province) => province.diesel), [null]);
  const ten = summarizeFuelPrices(payload(MIN_STATIONS_FOR_AVERAGE));
  assert.deepEqual(ten.summary.provinces[0].gasolina95, { average: 1.5, stations: 10 });
  assert.deepEqual(ten.summary.provinces[0].diesel, { average: 1.4, stations: 10 });
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
    () => parseFuelPriceSummary({ ...summary, provinces: [{ slug: 'x', pageSlug: 'x', name: 'X', gasolina95: 1, diesel: null }] }),
    /provinces\[0\]\.gasolina95/,
  );
});

test('provincePageSlug: nombre legible a slug sin tildes, eñes ni símbolos', () => {
  const expected: Array<[string, string]> = [
    ['A Coruña', 'a-coruna'],
    ['Las Palmas', 'las-palmas'],
    ['La Rioja', 'la-rioja'],
    ['Illes Balears', 'illes-balears'],
    ['Castellón / Castelló', 'castellon-castello'],
    ['Araba/Álava', 'araba-alava'],
    ['Santa Cruz de Tenerife', 'santa-cruz-de-tenerife'],
    ['Valencia / València', 'valencia'],
    ['  Ceuta  ', 'ceuta'],
    ['Ávila--(prueba)', 'avila-prueba'],
  ];
  for (const [name, slug] of expected) assert.equal(provincePageSlug(name), slug, name);
});

test('summarizeFuelPrices rellena pageSlug y mantiene el slug de MITECO', () => {
  const { summary } = summarizeFixture();
  assert.deepEqual(
    summary.provinces.map((province) => [province.slug, province.pageSlug]),
    [['albacete', 'albacete'], ['avila', 'avila'], ['madrid', 'madrid'], ['teruel', 'teruel']],
  );
});

test('findProvince busca por pageSlug, no por el slug de MITECO', () => {
  const summary = parseFuelPriceSummary({
    ...summarizeFixture().summary,
    provinces: [
      { slug: 'coruna-a', pageSlug: 'a-coruna', name: 'A Coruña', gasolina95: { average: 1.5, stations: 12 }, diesel: null },
    ],
  });
  assert.equal(findProvince(summary, 'a-coruna')?.slug, 'coruna-a');
  assert.equal(findProvince(summary, 'coruna-a'), undefined);
});

test('dos provincias con el mismo pageSlug lanzan error', () => {
  const station = (provincia: string, provinciaSlug: string) => ({
    provincia,
    provinciaSlug,
    precios: { gasolina95: 1.5, diesel: 1.4 },
  });
  const payload = {
    fechaMiteco: '18/11/2026 18:03:47',
    estaciones: [station('Valencia / València', 'valencia-valencia'), station('Valencia', 'valencia')],
  };
  assert.throws(() => summarizeFuelPrices(payload), /mismo slug de página "valencia"/);
  const symbols = { fechaMiteco: '18/11/2026 18:03:47', estaciones: [station('///', 'raro')] };
  assert.throws(() => summarizeFuelPrices(symbols), /slug de página válido/);
});

test('parseFuelPriceSummary exige pageSlug en cada provincia', () => {
  const { summary } = summarizeFixture();
  const withoutPageSlug = summary.provinces.map(({ pageSlug: _omitted, ...rest }) => rest);
  assert.throws(() => parseFuelPriceSummary({ ...summary, provinces: withoutPageSlug }), /provinces\[0\].*pageSlug/);
});

const RANKING_PROVINCES: ProvinceFuelPrices[] = [
  { slug: 'cara', pageSlug: 'cara', name: 'Cara', gasolina95: { average: 1.7, stations: 20 }, diesel: null },
  { slug: 'solo-diesel', pageSlug: 'solo-diesel', name: 'Solo diésel', gasolina95: null, diesel: { average: 1.8, stations: 12 } },
  { slug: 'barata', pageSlug: 'barata', name: 'Barata', gasolina95: { average: 1.5, stations: 20 }, diesel: null },
  { slug: 'empate', pageSlug: 'empate', name: 'Alfa', gasolina95: { average: 1.7, stations: 20 }, diesel: null },
];

test('rankProvincesByGasoline: de la más barata a la más cara, empates por nombre y sin las que no tienen gasolina 95', () => {
  const slugs = rankProvincesByGasoline(RANKING_PROVINCES).map((province) => province.slug);
  assert.deepEqual(slugs, ['barata', 'empate', 'cara']);
});

test('averagePricesOf extrae la media o null', () => {
  assert.deepEqual(averagePricesOf(RANKING_PROVINCES[1]), { gasolina95: null, diesel: 1.8 });
  assert.deepEqual(averagePricesOf(summarizeFixture().summary.national), { gasolina95: 1.457, diesel: 1.376 });
});
