import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getChargingPrices } from '../lib/chargingPrices';
import type { FuelPriceSummary, ProvinceFuelPrices } from '../lib/fuelPrices';
import { rankProvincesByGasoline } from '../lib/fuelPrices';
import { homeDescription, homeTitle } from '../lib/homePage';
import {
  provinceComparisonSentences,
  provinceDescription,
  provinceDifferenceText,
  provinceRankingText,
} from '../lib/provincePage';

const MAX_DESCRIPTION_LENGTH = 160;
const NBSP = new RegExp(String.fromCharCode(0xa0), 'g');

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
    { slug: 'media-m', pageSlug: 'media', name: 'Media', gasolina95: { average: 1.6, stations: 20 }, diesel: { average: 1.8, stations: 20 } },
    { slug: 'barata-b', pageSlug: 'barata', name: 'Barata', gasolina95: { average: 1.5, stations: 20 }, diesel: { average: 1.7, stations: 20 } },
    {
      slug: 'larga-l',
      pageSlug: 'santa-cruz-de-tenerife',
      name: 'Santa Cruz de Tenerife',
      gasolina95: { average: 1.65, stations: 20 },
      diesel: { average: 1.85, stations: 20 },
    },
  ],
};

function province(slug: string): ProvinceFuelPrices {
  const found = SUMMARY.provinces.find((candidate) => candidate.pageSlug === slug);
  assert.ok(found, slug);
  return found;
}

test('provinceDifferenceText: diferencia negativa, positiva y cero', () => {
  assert.equal(plain(provinceDifferenceText(-0.011)), '0,011 € menos que la media de España');
  assert.equal(plain(provinceDifferenceText(0.0123)), '0,012 € más que la media de España');
  assert.equal(provinceDifferenceText(0), 'igual que la media de España');
});

test('provinceDifferenceText: una diferencia menor que media milésima es "igual", nunca "0,000 € menos"', () => {
  assert.equal(provinceDifferenceText(-0.0004), 'igual que la media de España');
  assert.equal(provinceDifferenceText(0.0004), 'igual que la media de España');
  assert.ok(!provinceDifferenceText(-0.0004).includes('0,000'));
});

test('provinceComparisonSentences: una frase por combustible con la cifra y la diferencia', () => {
  const sentences = provinceComparisonSentences({ summary: SUMMARY, province: province('barata') }).map(plain);
  assert.deepEqual(sentences, [
    'En Barata la gasolina 95 cuesta de media 1,500 €/l, 0,100 € menos que la media de España.',
    'En Barata el diésel cuesta de media 1,700 €/l, 0,100 € menos que la media de España.',
  ]);
});

test('provinceComparisonSentences: una provincia solo con diésel da una sola frase', () => {
  const sentences = provinceComparisonSentences({ summary: SUMMARY, province: province('solo-diesel') }).map(plain);
  assert.deepEqual(sentences, ['En Solo diésel el diésel cuesta de media 1,800 €/l, igual que la media de España.']);
});

test('provinceRankingText: primera, última, intermedia y fuera del ranking', () => {
  const ranked = rankProvincesByGasoline(SUMMARY.provinces);
  assert.deepEqual(
    ranked.map((item) => item.pageSlug),
    ['barata', 'media', 'santa-cruz-de-tenerife', 'cara'],
  );
  assert.equal(provinceRankingText(province('barata'), ranked), 'Es la provincia con la gasolina 95 más barata (puesto 1 de 4).');
  assert.equal(provinceRankingText(province('cara'), ranked), 'Es la provincia con la gasolina 95 más cara (puesto 4 de 4).');
  assert.equal(
    provinceRankingText(province('media'), ranked),
    'Ocupa el puesto 2 de 4 del ranking de gasolina 95, de la más barata a la más cara.',
  );
  assert.equal(provinceRankingText(province('solo-diesel'), ranked), null);
});

test('provinceRankingText: una provincia sola en el ranking es a la vez la primera', () => {
  const alone = [province('barata')];
  assert.equal(provinceRankingText(province('barata'), alone), 'Es la provincia con la gasolina 95 más barata (puesto 1 de 1).');
});

test('provinceDescription: cifras reales de 100 km y como máximo 160 caracteres en todas las provincias', () => {
  const charging = getChargingPrices();
  const barata = plain(provinceDescription({ summary: SUMMARY, province: province('barata') }, charging));
  assert.equal(
    barata,
    'Coste de 100 km en Barata (MITECO, 18/11/2026): gasolina 95 9,75 €, diésel 9,35 €; eléctrico en casa 3,40 €. Calcula tu ahorro anual.',
  );
  for (const item of SUMMARY.provinces) {
    const description = provinceDescription({ summary: SUMMARY, province: item }, charging);
    assert.ok(description.length <= MAX_DESCRIPTION_LENGTH, `${item.name}: ${description.length} caracteres`);
  }
});

test('provinceDescription: una provincia solo con diésel solo cita el diésel', () => {
  const text = plain(provinceDescription({ summary: SUMMARY, province: province('solo-diesel') }, getChargingPrices()));
  assert.ok(text.includes('diésel 9,90 €'));
  assert.ok(!text.includes('gasolina 95'));
});

test('homeTitle: título con marca que cabe en 60 caracteres sin truncar (el mes cede ante el límite)', () => {
  assert.equal(homeTitle(SUMMARY), 'Coche eléctrico o gasolina: coste por km en España | Ododex');
});

test('homeDescription: cifras reales, fecha sin hora y como máximo 160 caracteres', () => {
  const description = homeDescription(SUMMARY, getChargingPrices());
  assert.equal(
    plain(description),
    '100 km cuestan 10,40 € en gasolina 95 (media de España, 1,600 €/l) y 3,40 € en eléctrico cargando en casa. Datos de MITECO del 18/11/2026.',
  );
  assert.ok(description.length <= MAX_DESCRIPTION_LENGTH, `${description.length} caracteres`);
  assert.ok(!description.includes('18:03'));
});
