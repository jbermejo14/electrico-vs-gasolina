import { test } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { DataSources } from '../components/DataSources';
import { JsonLd } from '../components/JsonLd';
import { OperatorPriceTable } from '../components/OperatorPriceTable';
import { ProvinceRanking } from '../components/ProvinceRanking';
import { ScenarioCards } from '../components/ScenarioCards';
import { getChargingPrices } from '../lib/chargingPrices';
import type { FuelPriceSummary } from '../lib/fuelPrices';
import { breadcrumbJsonLd, buildFaqItems, faqPageJsonLd, webApplicationJsonLd } from '../lib/structuredData';

const SITE_URL_VARIABLE = 'NEXT_PUBLIC_SITE_URL';
const MIN_FAQ_ITEMS = 4;
const MAX_FAQ_ITEMS = 6;

const SUMMARY: FuelPriceSummary = {
  source: 'Ministerio de prueba',
  sourceUrl: 'https://example.org/precios',
  mitecoDate: '18/11/2026 18:03:47',
  national: { gasolina95: { average: 1.6, stations: 100 }, diesel: { average: 1.8, stations: 100 } },
  provinces: [
    { slug: 'cara', name: 'Cara', gasolina95: { average: 1.7, stations: 20 }, diesel: { average: 1.9, stations: 20 } },
    { slug: 'solo-diesel', name: 'Solo diésel', gasolina95: null, diesel: { average: 1.8, stations: 12 } },
    { slug: 'barata', name: 'Barata', gasolina95: { average: 1.5, stations: 20 }, diesel: { average: 1.7, stations: 20 } },
  ],
};

interface FaqJsonLd {
  '@type': string;
  mainEntity: Array<{ name: string; acceptedAnswer: { text: string } }>;
}

test('ProvinceRanking: ordena por gasolina 95 ascendente, enlaza y marca "Sin datos"', () => {
  const html = renderToStaticMarkup(<ProvinceRanking provinces={SUMMARY.provinces} />);
  const order = ['barata', 'cara', 'solo-diesel'].map(slug => html.indexOf(`href="/${slug}"`));
  assert.ok(order.every(position => position >= 0), 'faltan enlaces a provincias');
  assert.deepEqual([...order].sort((a, b) => a - b), order);
  assert.ok(html.includes('Sin datos'));
  assert.ok(html.includes('table-responsive'));
});

test('OperatorPriceTable: una fila por operador más la media del mercado destacada', () => {
  const charging = getChargingPrices();
  const html = renderToStaticMarkup(<OperatorPriceTable charging={charging} />);
  assert.ok(html.includes('table-row-highlight'));
  assert.ok(html.includes('Media del mercado'));
  for (const operator of charging.operators) assert.ok(html.includes(`>${operator.name}</th>`), operator.name);
  assert.ok(html.includes('orientativos'));
});

test('ScenarioCards: cuatro escenarios con el lugar y "Sin datos" si falta un combustible', () => {
  const charging = getChargingPrices();
  const html = renderToStaticMarkup(
    <ScenarioCards fuelPrices={{ gasolina95: 1.5, diesel: null }} charging={charging} placeLabel="Cara" />
  );
  assert.ok(html.includes('100 km en Cara'));
  assert.ok(html.includes('Eléctrico cargando en casa'));
  assert.ok(html.includes('Eléctrico en recarga rápida'));
  assert.ok(html.includes('Sin datos'));
  assert.equal(html.match(/Más barato/g)?.length, 1);
});

test('DataSources: fuente con enlace, fecha de MITECO, fecha de tarifas y aviso orientativo', () => {
  const html = renderToStaticMarkup(<DataSources summary={SUMMARY} chargingUpdatedAt="2026-11" />);
  assert.ok(html.includes('href="https://example.org/precios"'));
  assert.ok(html.includes('Ministerio de prueba'));
  assert.ok(html.includes('18/11/2026 18:03:47'));
  assert.ok(html.includes('recopiladas por Ododex, noviembre de 2026'));
  assert.ok(html.includes('orientativos'));
});

test('FAQ: entre 4 y 6 preguntas con cifras reales y el mismo contenido en el JSON-LD', () => {
  const items = buildFaqItems(SUMMARY, getChargingPrices());
  assert.ok(items.length >= MIN_FAQ_ITEMS && items.length <= MAX_FAQ_ITEMS);
  for (const item of items) {
    assert.ok(item.question.endsWith('?'));
    assert.ok(item.answer.length > 0);
  }
  assert.ok(items.some(item => /\d,\d{2}/.test(item.answer)), 'ninguna respuesta lleva cifras');
  const jsonLd = faqPageJsonLd(items) as unknown as FaqJsonLd;
  assert.equal(jsonLd['@type'], 'FAQPage');
  assert.deepEqual(
    jsonLd.mainEntity.map(entity => [entity.name, entity.acceptedAnswer.text]),
    items.map(item => [item.question, item.answer])
  );
});

test('JSON-LD: WebApplication gratuita y BreadcrumbList con URL absolutas', () => {
  const previous = process.env[SITE_URL_VARIABLE];
  process.env[SITE_URL_VARIABLE] = 'https://ododex.com';
  try {
    const app = webApplicationJsonLd('Descripción') as { applicationCategory: string; offers: { price: number } };
    assert.equal(app.applicationCategory, 'FinanceApplication');
    assert.equal(app.offers.price, 0);
    const crumbs = breadcrumbJsonLd([{ name: 'Provincia', url: '/barata' }]) as {
      itemListElement: Array<{ item: string }>;
    };
    assert.equal(crumbs.itemListElement[0].item, 'https://ododex.com/es/electrico-vs-gasolina/barata');
  } finally {
    if (previous === undefined) delete process.env[SITE_URL_VARIABLE];
    else process.env[SITE_URL_VARIABLE] = previous;
  }
});

test('JsonLd: escapa "<" para no cerrar la etiqueta script', () => {
  const html = renderToStaticMarkup(<JsonLd data={{ text: '</script>' }} />);
  assert.ok(!html.includes('</script></script>'));
  assert.ok(html.includes('\\u003c/script>'));
});
