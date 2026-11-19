import { test } from 'node:test';
import assert from 'node:assert/strict';
import { compareCosts } from '../lib/costPerKm';
import {
  formatAnnualSavings,
  formatDecimal,
  formatEuros,
  formatKm,
  formatMitecoDay,
  formatMitecoMonth,
  formatPercent,
  formatPricePerKwh,
  formatPricePerLitre,
  mitecoDateToDate,
} from '../lib/format';

const NBSP = / /g;

/** Cambia el espacio duro por uno normal para comparar con el texto del contrato. */
function formatPlain(text: string): string {
  return text.replace(NBSP, ' ');
}

test('formatEuros: dos decimales por defecto y coma decimal', () => {
  assert.equal(formatPlain(formatEuros(9.75)), '9,75 €');
  assert.equal(formatPlain(formatEuros(3)), '3,00 €');
});

test('formatEuros: decimales indicados y miles agrupados también con cuatro cifras', () => {
  assert.equal(formatPlain(formatEuros(1234.4, 0)), '1.234 €');
  assert.equal(formatPlain(formatEuros(0.0113, 3)), '0,011 €');
  assert.equal(formatPlain(formatEuros(12345.678)), '12.345,68 €');
});

test('formatEuros: usa espacio duro entre la cifra y el símbolo', () => {
  assert.ok(formatEuros(1).includes(' €'));
});

test('formatPricePerLitre: tres decimales', () => {
  assert.equal(formatPlain(formatPricePerLitre(1.523)), '1,523 €/l');
  assert.equal(formatPlain(formatPricePerLitre(1.5)), '1,500 €/l');
});

test('formatPricePerKwh: dos decimales', () => {
  assert.equal(formatPlain(formatPricePerKwh(0.18)), '0,18 €/kWh');
});

test('formatPercent: proporción a porcentaje entero', () => {
  assert.equal(formatPlain(formatPercent(0.8)), '80 %');
  assert.equal(formatPlain(formatPercent(0)), '0 %');
  assert.equal(formatPlain(formatPercent(1)), '100 %');
});

test('formatKm: miles con punto', () => {
  assert.equal(formatPlain(formatKm(15000)), '15.000 km');
  assert.equal(formatPlain(formatKm(900)), '900 km');
});

test('formatMitecoMonth: mes y año de la fecha de MITECO', () => {
  assert.equal(formatMitecoMonth('18/11/2026 18:03:47'), 'noviembre de 2026');
  assert.equal(formatMitecoMonth('02/01/2027 08:00:00'), 'enero de 2027');
});

test('formatMitecoMonth, formatMitecoDay y mitecoDateToDate: una fecha mal formada lanza error en español', () => {
  assert.throws(() => formatMitecoMonth('2026-11-18'), /Fecha de MITECO inválida/);
  assert.throws(() => formatMitecoDay('hoy'), /Fecha de MITECO inválida/);
  assert.throws(() => mitecoDateToDate(''), /Fecha de MITECO inválida/);
});

test('mitecoDateToDate: día, mes y año en UTC', () => {
  assert.equal(mitecoDateToDate('18/11/2026 18:03:47').toISOString(), '2026-11-18T00:00:00.000Z');
});

test('formatDecimal: coma decimal y solo los decimales necesarios', () => {
  assert.equal(formatDecimal(6.5), '6,5');
  assert.equal(formatDecimal(17), '17');
});

test('formatMitecoDay: el día sin la hora', () => {
  assert.equal(formatMitecoDay('18/11/2026 18:03:47'), '18/11/2026');
  assert.equal(formatMitecoDay('02/01/2027'), '02/01/2027');
});

const SAVINGS_COMBUSTION = { consumptionLitresPer100Km: 1, annualKm: 100 };
const SAVINGS_ELECTRIC = {
  consumptionKwhPer100Km: 0.9,
  homeShare: 1,
  homePricePerKwh: 1,
  publicPricePerKwh: 1,
  annualKm: 100,
};

test('formatAnnualSavings: ahorro, sobrecoste y empate según el umbral de la comparación', () => {
  const saving = compareCosts({ ...SAVINGS_COMBUSTION, pricePerLitre: 11 }, SAVINGS_ELECTRIC);
  assert.equal(formatPlain(formatAnnualSavings(saving)), 'El eléctrico te ahorra 10 € al año');
  const extra = compareCosts({ ...SAVINGS_COMBUSTION, pricePerLitre: 1 }, { ...SAVINGS_ELECTRIC, homePricePerKwh: 3 });
  assert.equal(formatPlain(formatAnnualSavings(extra)), 'El eléctrico te cuesta 2 € más al año');
  const equal = compareCosts({ ...SAVINGS_COMBUSTION, pricePerLitre: 1.004 }, SAVINGS_ELECTRIC);
  assert.equal(formatAnnualSavings(equal), 'El coste anual de los dos es prácticamente igual');
});
