import { test } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { CostCalculator } from '../components/CostCalculator';
import { getChargingPrices, publicPrice } from '../lib/chargingPrices';
import {
  DEFAULT_ANNUAL_KM,
  DEFAULT_CONSUMPTION_L_100KM,
  DEFAULT_EV_CONSUMPTION_KWH_100KM,
  DEFAULT_HOME_SHARE,
  DEFAULT_HOME_TARIFF,
  DEFAULT_PUBLIC_LEVEL,
  compareCosts,
} from '../lib/costPerKm';
import { formatEuros } from '../lib/format';

const GASOLINE_PRICE = 1.5;
const DIESEL_PRICE = 1.7;
const PLACE = 'Madrid';
const MIN_CONTROLS = 9;

function calculatorHtml(diesel: number | null): string {
  return renderToStaticMarkup(
    <CostCalculator
      fuelPrices={{ gasolina95: GASOLINE_PRICE, diesel }}
      charging={getChargingPrices()}
      placeLabel={PLACE}
    />
  );
}

function calculatorExpected() {
  const charging = getChargingPrices();
  return compareCosts(
    {
      consumptionLitresPer100Km: DEFAULT_CONSUMPTION_L_100KM.gasolina95,
      pricePerLitre: GASOLINE_PRICE,
      annualKm: DEFAULT_ANNUAL_KM,
    },
    {
      consumptionKwhPer100Km: DEFAULT_EV_CONSUMPTION_KWH_100KM,
      homeShare: DEFAULT_HOME_SHARE,
      homePricePerKwh: charging.home[DEFAULT_HOME_TARIFF],
      publicPricePerKwh: publicPrice(charging, 'market', DEFAULT_PUBLIC_LEVEL),
      annualKm: DEFAULT_ANNUAL_KM,
    }
  );
}

test('calculadora: el render en servidor muestra el resultado con los valores por defecto', () => {
  const html = calculatorHtml(DIESEL_PRICE);
  const expected = calculatorExpected();
  assert.ok(html.includes(formatEuros(expected.combustion.per100Km)), 'falta el coste de combustión');
  assert.ok(html.includes(formatEuros(expected.electric.per100Km)), 'falta el coste eléctrico');
  assert.ok(html.includes('por 100 km'));
  assert.ok(html.includes('Por km'));
  assert.ok(html.includes('Por año'));
});

test('calculadora: muestra el texto de ahorro anual con la cifra', () => {
  const html = calculatorHtml(DIESEL_PRICE);
  const expected = calculatorExpected();
  const amount = formatEuros(Math.abs(expected.annualSavings), 0);
  const sentence =
    expected.cheaper === 'electric'
      ? `El eléctrico te ahorra ${amount} al año`
      : `El eléctrico te cuesta ${amount} más al año`;
  assert.ok(html.includes(sentence), `falta "${sentence}"`);
});

test('calculadora: valores por defecto en los campos y todos los controles tienen etiqueta', () => {
  const html = calculatorHtml(DIESEL_PRICE);
  assert.ok(html.includes(`value="${DEFAULT_ANNUAL_KM}"`));
  assert.ok(html.includes(`value="${GASOLINE_PRICE}"`));
  assert.ok(html.includes(`value="${DEFAULT_EV_CONSUMPTION_KWH_100KM}"`));
  assert.ok(html.includes('value="80"'));
  const controlIds = [...html.matchAll(/<(?:input|select)[^>]*? id="([^"]+)"/g)].map(match => match[1]);
  assert.ok(controlIds.length >= MIN_CONTROLS, `solo ${controlIds.length} controles`);
  for (const id of controlIds) {
    assert.ok(html.includes(`for="${id}"`), `El control ${id} no tiene label`);
  }
});

test('calculadora: nombra el lugar y ofrece solo los combustibles con precio', () => {
  const both = calculatorHtml(DIESEL_PRICE);
  assert.ok(both.includes(`en ${PLACE}`));
  assert.ok(both.includes('value="diesel"'));
  const onlyGasoline = calculatorHtml(null);
  assert.ok(onlyGasoline.includes('value="gasolina95"'));
  assert.ok(!onlyGasoline.includes('value="diesel"'));
});

test('calculadora: ofrece la media del mercado y los operadores', () => {
  const html = calculatorHtml(DIESEL_PRICE);
  assert.ok(html.includes('Media del mercado'));
  for (const operator of getChargingPrices().operators) {
    assert.ok(html.includes(`>${operator.name}</option>`), `Falta ${operator.name}`);
  }
});
