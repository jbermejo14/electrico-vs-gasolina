import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  formatUpdatedAt,
  getChargingPrices,
  HOME_TARIFFS,
  MAX_VALID_KWH_PRICE,
  parseChargingPrices,
  POWER_LEVELS,
  publicPrice,
} from '../lib/chargingPrices';

const OPERATOR_COUNT = 13;

function loadRaw(): Record<string, any> {
  return JSON.parse(readFileSync(join(__dirname, '..', 'data', 'charging-prices.json'), 'utf8'));
}

test('el fichero real se valida y tiene 13 operadores', () => {
  const prices = getChargingPrices();
  assert.equal(prices.operators.length, OPERATOR_COUNT);
  assert.equal(prices.updatedAt, '2026-11');
  assert.deepEqual(Object.keys(prices.home), [...HOME_TARIFFS]);
  assert.deepEqual(Object.keys(prices.marketDefault), [...POWER_LEVELS]);
});

test('los operadores salen en orden alfabético por nombre', () => {
  const names = getChargingPrices().operators.map((operator) => operator.name);
  assert.deepEqual(names, [...names].sort((a, b) => a.localeCompare(b, 'es')));
  assert.equal(names[0], 'Acciona');
});

test('un operador desconocido lanza error con su nombre', () => {
  const raw = loadRaw();
  raw.operators.desconocido = raw.operators.tesla;
  assert.throws(() => parseChargingPrices(raw), /operators\.desconocido/);
});

test('un nivel ausente lanza error con el campo', () => {
  const raw = loadRaw();
  delete raw.operators.tesla.dc_50;
  assert.throws(() => parseChargingPrices(raw), /operators\.tesla\.dc_50/);
});

test('un precio negativo, cero o excesivo lanza error con el campo', () => {
  for (const invalid of [-0.1, 0, MAX_VALID_KWH_PRICE + 0.01, 'caro']) {
    const raw = loadRaw();
    raw.operators.tesla.ac_22 = invalid;
    assert.throws(() => parseChargingPrices(raw), /operators\.tesla\.ac_22/);
  }
});

test('un fallo en tarifas de casa o mercado nombra su campo', () => {
  const home = loadRaw();
  home.home_charging_reference.pvpc_valle = -1;
  assert.throws(() => parseChargingPrices(home), /home_charging_reference\.pvpc_valle/);
  const market = loadRaw();
  delete market.default_fallback;
  assert.throws(() => parseChargingPrices(market), /default_fallback/);
});

test('un fichero que no es objeto o sin updated_at lanza error', () => {
  assert.throws(() => parseChargingPrices(null), /Tarifas de recarga inválidas/);
  const raw = loadRaw();
  raw.updated_at = 'noviembre';
  assert.throws(() => parseChargingPrices(raw), /updated_at/);
});

test('publicPrice devuelve el precio del operador y el de mercado', () => {
  const prices = getChargingPrices();
  assert.equal(publicPrice(prices, 'iberdrola', 'dc_150'), 0.6);
  assert.equal(publicPrice(prices, 'market', 'dc_50'), 0.45);
});

test('publicPrice con un operador inexistente lanza error', () => {
  assert.throws(() => publicPrice(getChargingPrices(), 'nadie', 'ac_22'), /nadie/);
});

test('formatUpdatedAt escribe el mes en español', () => {
  assert.equal(formatUpdatedAt('2026-11'), 'noviembre de 2026');
  assert.equal(formatUpdatedAt('2027-01'), 'enero de 2027');
  assert.throws(() => formatUpdatedAt('2026-13'), /AAAA-MM/);
});
