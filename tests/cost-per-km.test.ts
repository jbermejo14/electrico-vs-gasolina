import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  blendedPricePerKwh,
  combustionCost,
  compareCosts,
  DEFAULT_ANNUAL_KM,
  electricCost,
  type CombustionInput,
  type ElectricInput,
} from '../lib/costPerKm';

const COMBUSTION: CombustionInput = { consumptionLitresPer100Km: 6.5, pricePerLitre: 1.5, annualKm: DEFAULT_ANNUAL_KM };
const ELECTRIC: ElectricInput = {
  consumptionKwhPer100Km: 17,
  homeShare: 1,
  homePricePerKwh: 0.18,
  publicPricePerKwh: 0.6,
  annualKm: DEFAULT_ANNUAL_KM,
};

test('combustión: 6,5 l x 1,5 EUR/l = 9,75 EUR/100 km', () => {
  const result = combustionCost(COMBUSTION);
  assert.ok(Math.abs(result.per100Km - 9.75) < 1e-9);
  assert.ok(Math.abs(result.perKm - 0.0975) < 1e-9);
  assert.ok(Math.abs(result.annual - 1462.5) < 1e-9);
});

test('eléctrico: 17 kWh / 0,9 x 0,18 EUR/kWh = 3,40 EUR/100 km', () => {
  const result = electricCost(ELECTRIC);
  assert.ok(Math.abs(result.per100Km - 3.4) < 1e-9);
  assert.ok(Math.abs(result.perKm - 0.034) < 1e-9);
  assert.ok(Math.abs(result.annual - 510) < 1e-9);
});

test('precio medio con homeShare 0, 1 y 0,8', () => {
  assert.equal(blendedPricePerKwh(0, 0.18, 0.6), 0.6);
  assert.equal(blendedPricePerKwh(1, 0.18, 0.6), 0.18);
  assert.ok(Math.abs(blendedPricePerKwh(0.8, 0.18, 0.6) - 0.264) < 1e-9);
});

test('el coste eléctrico usa la carga pública con homeShare 0', () => {
  const result = electricCost({ ...ELECTRIC, homeShare: 0 });
  assert.ok(Math.abs(result.per100Km - (17 / 0.9) * 0.6) < 1e-9);
});

test('kilómetros anuales 0 dan coste anual 0', () => {
  assert.equal(combustionCost({ ...COMBUSTION, annualKm: 0 }).annual, 0);
  assert.equal(electricCost({ ...ELECTRIC, annualKm: 0 }).annual, 0);
});

test('ahorro positivo: gana el eléctrico', () => {
  const result = compareCosts(COMBUSTION, ELECTRIC);
  assert.ok(Math.abs(result.annualSavings - 952.5) < 1e-9);
  assert.equal(result.cheaper, 'electric');
});

test('ahorro negativo: gana la combustión', () => {
  const result = compareCosts(COMBUSTION, { ...ELECTRIC, homeShare: 0, publicPricePerKwh: 1.9 });
  assert.ok(result.annualSavings < 0);
  assert.equal(result.cheaper, 'combustion');
});

test('ahorro nulo: iguales', () => {
  const result = compareCosts({ ...COMBUSTION, annualKm: 0 }, { ...ELECTRIC, annualKm: 0 });
  assert.equal(result.annualSavings, 0);
  assert.equal(result.cheaper, 'equal');
});

test('la validación de combustión lanza RangeError en español', () => {
  const invalid = [0, -1, Number.NaN, Number.POSITIVE_INFINITY];
  for (const value of invalid) {
    assert.throws(
      () => combustionCost({ ...COMBUSTION, consumptionLitresPer100Km: value }),
      new RangeError('El consumo de combustible debe ser un número mayor que 0.'),
    );
    assert.throws(() => combustionCost({ ...COMBUSTION, pricePerLitre: value }), RangeError);
  }
  assert.throws(() => combustionCost({ ...COMBUSTION, annualKm: -1 }), RangeError);
  assert.throws(() => combustionCost({ ...COMBUSTION, annualKm: Number.NaN }), RangeError);
});

test('la validación eléctrica lanza RangeError en español', () => {
  assert.throws(() => electricCost({ ...ELECTRIC, consumptionKwhPer100Km: 0 }), /consumo eléctrico/);
  assert.throws(() => electricCost({ ...ELECTRIC, homePricePerKwh: 0 }), /casa/);
  assert.throws(() => electricCost({ ...ELECTRIC, publicPricePerKwh: -1 }), /pública/);
  assert.throws(() => electricCost({ ...ELECTRIC, annualKm: -1 }), RangeError);
  for (const homeShare of [-0.1, 1.1, Number.NaN]) {
    assert.throws(() => electricCost({ ...ELECTRIC, homeShare }), RangeError);
    assert.throws(() => blendedPricePerKwh(homeShare, 0.18, 0.6), RangeError);
  }
});
