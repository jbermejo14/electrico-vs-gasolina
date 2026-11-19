import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { Breadcrumbs } from '../components/Breadcrumbs';
import { DataSources } from '../components/DataSources';
import { JsonLd } from '../components/JsonLd';
import { OperatorPriceTable } from '../components/OperatorPriceTable';
import { ProvinceRanking } from '../components/ProvinceRanking';
import { ScenarioCards } from '../components/ScenarioCards';
import { CHARGING_MARKET_LABEL, getChargingPrices } from '../lib/chargingPrices';
import { buildFaqItems } from '../lib/faq';
import type { FuelPriceSummary } from '../lib/fuelPrices';
import { breadcrumbJsonLd, faqPageJsonLd, webApplicationJsonLd } from '../lib/structuredData';

const SITE_URL_VARIABLE = 'NEXT_PUBLIC_SITE_URL';
const MIN_FAQ_ITEMS = 4;
const MAX_FAQ_ITEMS = 6;
const NBSP = new RegExp(String.fromCharCode(0xa0), 'g');
const COMPONENTS_WITHOUT_ADS = [
  'CostCalculator',
  'CalculatorFields',
  'CalculatorResults',
  'OperatorPriceTable',
  'ProvinceRanking',
  'ScenarioCards',
];

/** Cambia el espacio duro por uno normal para comparar con cifras escritas a mano. */
function plain(text: string): string {
  return text.replace(NBSP, ' ');
}

const SUMMARY: FuelPriceSummary = {
  source: 'Ministerio de prueba',
  sourceUrl: 'https://example.org/precios',
  mitecoDate: '18/11/2026 18:03:47',
  national: { gasolina95: { average: 1.6, stations: 100 }, diesel: { average: 1.8, stations: 100 } },
  provinces: [
    { slug: 'cara-c', pageSlug: 'cara', name: 'Cara', gasolina95: { average: 1.7, stations: 20 }, diesel: { average: 1.9, stations: 20 } },
    { slug: 'diesel-d', pageSlug: 'solo-diesel', name: 'Solo diésel', gasolina95: null, diesel: { average: 1.8, stations: 12 } },
    { slug: 'barata-b', pageSlug: 'barata', name: 'Barata', gasolina95: { average: 1.5, stations: 20 }, diesel: { average: 1.7, stations: 20 } },
  ],
};

interface FaqJsonLd {
  '@type': string;
  mainEntity: Array<{ name: string; acceptedAnswer: { text: string } }>;
}

test('ProvinceRanking: ordena por gasolina 95 ascendente, enlaza por pageSlug y marca "Sin datos"', () => {
  const html = renderToStaticMarkup(<ProvinceRanking provinces={SUMMARY.provinces} />);
  const order = ['barata', 'cara', 'solo-diesel'].map(slug => html.indexOf(`href="/${slug}"`));
  assert.ok(order.every(position => position >= 0), 'faltan enlaces a provincias');
  assert.deepEqual([...order].sort((a, b) => a - b), order);
  assert.ok(!html.includes('barata-b'), 'el enlace usa el slug de MITECO');
  assert.ok(html.includes('Sin datos'));
  assert.ok(html.includes('table-responsive'));
});

test('ProvinceRanking: precios medios y costes por 100 km calculados a mano', () => {
  const text = plain(renderToStaticMarkup(<ProvinceRanking provinces={SUMMARY.provinces} />));
  // Barata: 1,500 €/l x 6,5 l = 9,75 €; 1,700 €/l x 5,5 l = 9,35 €.
  assert.ok(text.includes('>1,500 €/l<'));
  assert.ok(text.includes('>9,75 €<'));
  assert.ok(text.includes('>1,700 €/l<'));
  assert.ok(text.includes('>9,35 €<'));
  // Cara: 1,700 €/l x 6,5 l = 11,05 €; 1,900 €/l x 5,5 l = 10,45 €.
  assert.ok(text.includes('>11,05 €<'));
  assert.ok(text.includes('>10,45 €<'));
  // Solo diésel: 1,800 €/l x 5,5 l = 9,90 €.
  assert.ok(text.includes('>9,90 €<'));
});

test('OperatorPriceTable: una fila por operador más la media del mercado destacada', () => {
  const charging = getChargingPrices();
  const html = renderToStaticMarkup(<OperatorPriceTable charging={charging} />);
  assert.ok(html.includes('table-row-highlight'));
  assert.ok(html.includes(CHARGING_MARKET_LABEL));
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

test('ScenarioCards: importes calculados a mano y etiqueta "Más barato" en el eléctrico en casa', () => {
  const html = renderToStaticMarkup(
    <ScenarioCards fuelPrices={{ gasolina95: 1.5, diesel: null }} charging={getChargingPrices()} placeLabel="Cara" />
  );
  const text = plain(html);
  // Gasolina: 6,5 l x 1,5 €/l = 9,75 €. Casa: 17 / 0,9 x 0,18 €/kWh = 3,40 €. Rápida: 17 / 0,9 x 0,55 €/kWh = 10,39 €.
  assert.ok(text.includes('>9,75 €<'));
  assert.ok(text.includes('6,5 l/100 km a 1,500 €/l'));
  assert.ok(text.includes('>3,40 €<'));
  assert.ok(text.includes('17 kWh/100 km a 0,18 €/kWh'));
  assert.ok(text.includes('>10,39 €<'));
  assert.ok(text.includes('17 kWh/100 km a 0,55 €/kWh'));
  const tag = text.indexOf('Más barato');
  assert.ok(tag > text.indexOf('Eléctrico cargando en casa'));
  assert.ok(tag < text.indexOf('Eléctrico en recarga rápida'));
});

test('DataSources: fuente con enlace, fecha de MITECO sin hora, fecha de tarifas y aviso orientativo', () => {
  const html = renderToStaticMarkup(<DataSources summary={SUMMARY} chargingUpdatedAt="2026-11" />);
  assert.ok(html.includes('href="https://example.org/precios"'));
  assert.ok(html.includes('Ministerio de prueba'));
  assert.ok(html.includes('con datos del 18/11/2026.'));
  assert.ok(!html.includes('18:03'));
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
  const jsonLd = faqPageJsonLd(items) as unknown as FaqJsonLd;
  assert.equal(jsonLd['@type'], 'FAQPage');
  assert.deepEqual(
    jsonLd.mainEntity.map(entity => [entity.name, entity.acceptedAnswer.text]),
    items.map(item => [item.question, item.answer])
  );
});

test('FAQ: importes calculados a mano con la media nacional del fixture', () => {
  const answers = buildFaqItems(SUMMARY, getChargingPrices()).map(item => plain(item.answer));
  // Casa: 17 / 0,9 x 0,18 = 3,40 €. Gasolina: 6,5 l x 1,6 €/l = 10,40 €.
  assert.ok(answers[0].includes('unos 3,40 €'));
  assert.ok(answers[0].includes('10,40 €'));
  // Rápida: 17 / 0,9 x 0,55 = 10,39 €. Diésel: 5,5 l x 1,8 €/l = 9,90 €.
  assert.ok(answers[1].includes('unos 10,39 €'));
  assert.ok(answers[1].includes('9,90 €'));
  // 15.000 km: gasolina 1.560 €; eléctrico con 80 % en casa 4,7978 €/100 km = 720 €; ahorro 840 €.
  assert.ok(answers[2].includes('720 € al año'));
  assert.ok(answers[2].includes('1.560 €'));
  assert.ok(answers[2].includes('El eléctrico te ahorra 840 € al año.'));
  // La fecha de MITECO no lleva hora.
  assert.ok(answers[5].includes('con datos del 18/11/2026.'));
  assert.ok(!answers[5].includes('18:03'));
});

test('FAQ: si el ahorro queda bajo el umbral de la calculadora, dice "prácticamente igual"', () => {
  const charging = getChargingPrices();
  const sameCost: FuelPriceSummary = {
    ...SUMMARY,
    // Precio de la gasolina con el que cuesta lo mismo al año: (17 / 0,9 x 0,254 €/kWh) / 6,5 l.
    national: { ...SUMMARY.national, gasolina95: { average: ((17 / 0.9) * 0.254) / 6.5, stations: 100 } },
  };
  const answer = plain(buildFaqItems(sameCost, charging)[2].answer);
  assert.ok(answer.includes('prácticamente igual'), answer);
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

test('Breadcrumbs: un solo JSON-LD generado con breadcrumbJsonLd y escapado de "<"', () => {
  const html = renderToStaticMarkup(
    <Breadcrumbs
      items={[
        { name: 'Sección', url: '/' },
        { name: 'Provincia </script>', url: '/barata' },
      ]}
    />
  );
  assert.equal(html.match(/application\/ld\+json/g)?.length, 1);
  assert.ok(html.includes('BreadcrumbList'));
  assert.ok(html.includes('\\u003c/script>'));
  assert.ok(html.includes('aria-current="page"'));
});

test('anuncios: ni la calculadora ni las tablas importan AdSlot', () => {
  for (const name of COMPONENTS_WITHOUT_ADS) {
    const source = readFileSync(path.join(process.cwd(), 'components', `${name}.tsx`), 'utf8');
    assert.ok(!source.includes('AdSlot'), `${name} menciona AdSlot`);
  }
});
