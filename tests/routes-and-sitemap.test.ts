import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { getFuelPriceSummary } from '../lib/fuelPriceData';
import type { FuelPriceSummary } from '../lib/fuelPrices';
import { provinceParams, sitemapEntries } from '../lib/routes';

const SITE_URL_VARIABLE = 'NEXT_PUBLIC_SITE_URL';
const TEST_SITE_URL = 'https://ododex.com';
const BASE_URL = 'https://ododex.com/es/electrico-vs-gasolina';
const LEGAL_PATHS = ['aviso-legal', 'privacidad', 'cookies'];

const FIXTURE: FuelPriceSummary = {
  source: 'MITECO',
  sourceUrl: 'https://example.org/',
  mitecoDate: '18/11/2026 18:03:47',
  national: { gasolina95: { average: 1.6, stations: 100 }, diesel: { average: 1.8, stations: 100 } },
  provinces: [
    { slug: 'barata-b', pageSlug: 'barata', name: 'Barata', gasolina95: { average: 1.5, stations: 20 }, diesel: { average: 1.7, stations: 20 } },
    { slug: 'cara-c', pageSlug: 'cara', name: 'Cara', gasolina95: { average: 1.7, stations: 20 }, diesel: { average: 1.9, stations: 20 } },
    { slug: 'diesel-solo', pageSlug: 'solo-diesel', name: 'Solo diésel', gasolina95: null, diesel: { average: 1.8, stations: 12 } },
    { slug: 'sin-datos-x', pageSlug: 'sin-datos', name: 'Sin datos', gasolina95: null, diesel: null },
  ],
};

let previousSiteUrl: string | undefined;
let fixturePath = '';

before(() => {
  previousSiteUrl = process.env[SITE_URL_VARIABLE];
  process.env[SITE_URL_VARIABLE] = TEST_SITE_URL;
  fixturePath = path.join(mkdtempSync(path.join(os.tmpdir(), 'fuel-fixture-')), 'fuel-prices.json');
  writeFileSync(fixturePath, JSON.stringify(FIXTURE));
});

after(() => {
  if (previousSiteUrl === undefined) delete process.env[SITE_URL_VARIABLE];
  else process.env[SITE_URL_VARIABLE] = previousSiteUrl;
});

test('provinceParams: solo provincias con datos', () => {
  const params = provinceParams(getFuelPriceSummary(fixturePath));
  assert.deepEqual(params, [{ provincia: 'barata' }, { provincia: 'cara' }, { provincia: 'solo-diesel' }]);
});

test('sitemapEntries: la principal y las provincias con datos, sin legales', () => {
  const urls = sitemapEntries(getFuelPriceSummary(fixturePath)).map(entry => entry.url);
  assert.deepEqual(urls, [BASE_URL, `${BASE_URL}/barata`, `${BASE_URL}/cara`, `${BASE_URL}/solo-diesel`]);
  for (const legal of LEGAL_PATHS) {
    assert.ok(!urls.some(url => url.includes(legal)), `El sitemap incluye ${legal}`);
  }
});

test('sitemapEntries: todas las URL son absolutas y cuelgan de la ruta base', () => {
  for (const entry of sitemapEntries(FIXTURE)) {
    assert.ok(entry.url.startsWith(BASE_URL), entry.url);
  }
});

test('sitemapEntries: lastModified es la fecha de MITECO', () => {
  const [home] = sitemapEntries(FIXTURE);
  assert.equal((home.lastModified as Date).toISOString(), '2026-11-18T00:00:00.000Z');
});

test('getFuelPriceSummary: una ruta que no existe lanza el error de datos ausentes', () => {
  assert.throws(
    () => getFuelPriceSummary(path.join(os.tmpdir(), 'no-existe-fuel-prices.json')),
    /Falta data\/fuel-prices\.json/
  );
});
