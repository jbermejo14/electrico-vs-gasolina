import {
  POWER_LEVEL_LABELS,
  formatUpdatedAt,
  publicPrice,
  type ChargingPrices,
} from './chargingPrices';
import {
  CHARGING_EFFICIENCY,
  DEFAULT_ANNUAL_KM,
  DEFAULT_CONSUMPTION_L_100KM,
  DEFAULT_EV_CONSUMPTION_KWH_100KM,
  DEFAULT_HOME_SHARE,
  DEFAULT_HOME_TARIFF,
  DEFAULT_PUBLIC_LEVEL,
  compareCosts,
  combustionCost,
  electricCost,
} from './costPerKm';
import { formatDecimal, formatEuros, formatKm, formatPercent, formatPricePerKwh, formatPricePerLitre } from './format';
import type { FuelPriceSummary, FuelType } from './fuelPrices';
import { SECTION_NAME, absoluteUrl } from './site';

export interface FaqItem {
  question: string;
  answer: string;
}

export interface BreadcrumbEntry {
  name: string;
  url: string;
}

const STRUCTURED_CONTEXT = 'https://schema.org';
const STRUCTURED_MARKET_OPERATOR = 'market';
const STRUCTURED_FREE_PRICE = 0;
const STRUCTURED_ANNUAL_DECIMALS = 0;

/** Coste por 100 km de un coche eléctrico con los valores por defecto y la parte indicada de carga en casa. */
export function referenceElectricPer100Km(charging: ChargingPrices, homeShare: number): number {
  return electricCost({
    consumptionKwhPer100Km: DEFAULT_EV_CONSUMPTION_KWH_100KM,
    homeShare,
    homePricePerKwh: charging.home[DEFAULT_HOME_TARIFF],
    publicPricePerKwh: publicPrice(charging, STRUCTURED_MARKET_OPERATOR, DEFAULT_PUBLIC_LEVEL),
    annualKm: DEFAULT_ANNUAL_KM,
  }).per100Km;
}

/** Coste por 100 km de un coche de combustión con el consumo por defecto del combustible. */
export function referenceCombustionPer100Km(fuel: FuelType, pricePerLitre: number): number {
  return combustionCost({
    consumptionLitresPer100Km: DEFAULT_CONSUMPTION_L_100KM[fuel],
    pricePerLitre,
    annualKm: DEFAULT_ANNUAL_KM,
  }).per100Km;
}

function structuredHomeQuestion(summary: FuelPriceSummary, charging: ChargingPrices): FaqItem {
  const homePrice = charging.home[DEFAULT_HOME_TARIFF];
  return {
    question: '¿Cuánto cuesta recorrer 100 km en un coche eléctrico cargando en casa?',
    answer:
      `Con un consumo de ${formatDecimal(DEFAULT_EV_CONSUMPTION_KWH_100KM)} kWh/100 km, una tarifa de referencia de ${formatPricePerKwh(homePrice)} ` +
      `y un rendimiento de carga del ${formatPercent(CHARGING_EFFICIENCY)}, 100 km cuestan unos ` +
      `${formatEuros(referenceElectricPer100Km(charging, 1))}. Un coche de gasolina 95 de ` +
      `${formatDecimal(DEFAULT_CONSUMPTION_L_100KM.gasolina95)} l/100 km a la media de España (${formatPricePerLitre(summary.national.gasolina95.average)}) ` +
      `gasta ${formatEuros(referenceCombustionPer100Km('gasolina95', summary.national.gasolina95.average))} por cada 100 km.`,
  };
}

function structuredFastQuestion(summary: FuelPriceSummary, charging: ChargingPrices): FaqItem {
  const fastPrice = publicPrice(charging, STRUCTURED_MARKET_OPERATOR, DEFAULT_PUBLIC_LEVEL);
  return {
    question: '¿Y cuánto cuesta si cargo solo en recarga rápida?',
    answer:
      `Con la media del mercado en recarga «${POWER_LEVEL_LABELS[DEFAULT_PUBLIC_LEVEL]}» (${formatPricePerKwh(fastPrice)}), ` +
      `100 km cuestan unos ${formatEuros(referenceElectricPer100Km(charging, 0))}, frente a ` +
      `${formatEuros(referenceCombustionPer100Km('gasolina95', summary.national.gasolina95.average))} en gasolina 95 y ${formatEuros(referenceCombustionPer100Km('diesel', summary.national.diesel.average))} en diésel ` +
      '(medias de España).',
  };
}

function structuredSavingsAnswer(annualSavings: number): string {
  const amount = formatEuros(Math.abs(annualSavings), STRUCTURED_ANNUAL_DECIMALS);
  if (annualSavings > 0) return `El eléctrico te ahorra unos ${amount} al año.`;
  if (annualSavings < 0) return `El eléctrico te cuesta unos ${amount} más al año.`;
  return 'El coste anual es el mismo.';
}

function structuredSavingsQuestion(summary: FuelPriceSummary, charging: ChargingPrices): FaqItem {
  const comparison = compareCosts(
    {
      consumptionLitresPer100Km: DEFAULT_CONSUMPTION_L_100KM.gasolina95,
      pricePerLitre: summary.national.gasolina95.average,
      annualKm: DEFAULT_ANNUAL_KM,
    },
    {
      consumptionKwhPer100Km: DEFAULT_EV_CONSUMPTION_KWH_100KM,
      homeShare: DEFAULT_HOME_SHARE,
      homePricePerKwh: charging.home[DEFAULT_HOME_TARIFF],
      publicPricePerKwh: publicPrice(charging, STRUCTURED_MARKET_OPERATOR, DEFAULT_PUBLIC_LEVEL),
      annualKm: DEFAULT_ANNUAL_KM,
    },
  );
  return {
    question: `¿Cuánto se ahorra al año con ${formatKm(DEFAULT_ANNUAL_KM)}?`,
    answer:
      `Cargando el ${formatPercent(DEFAULT_HOME_SHARE)} en casa y el resto en recarga rápida, el eléctrico cuesta ` +
      `${formatEuros(comparison.electric.annual, STRUCTURED_ANNUAL_DECIMALS)} al año y el de gasolina 95 ${formatEuros(comparison.combustion.annual, STRUCTURED_ANNUAL_DECIMALS)}. ` +
      structuredSavingsAnswer(comparison.annualSavings),
  };
}

function structuredOperatorQuestion(charging: ChargingPrices): FaqItem {
  const sorted = [...charging.operators].sort(
    (a, b) => a.prices[DEFAULT_PUBLIC_LEVEL] - b.prices[DEFAULT_PUBLIC_LEVEL],
  );
  const cheapest = sorted[0];
  const dearest = sorted[sorted.length - 1];
  return {
    question: '¿Qué operador es el más barato en recarga rápida?',
    answer:
      `Según las tarifas recopiladas en ${formatUpdatedAt(charging.updatedAt)}, en recarga «${POWER_LEVEL_LABELS[DEFAULT_PUBLIC_LEVEL]}» ` +
      `el más barato es ${cheapest.name} (${formatPricePerKwh(cheapest.prices[DEFAULT_PUBLIC_LEVEL])}) y el más caro ` +
      `${dearest.name} (${formatPricePerKwh(dearest.prices[DEFAULT_PUBLIC_LEVEL])}).`,
  };
}

function structuredEstimateQuestion(): FaqItem {
  return {
    question: '¿Por qué el resultado es orientativo?',
    answer:
      'Los precios de recarga dependen del operador, de la tarifa que tengas contratada y de las promociones, y el consumo ' +
      'real de cada coche cambia con la velocidad, la temperatura y el tipo de vía. Además, los precios del combustible varían ' +
      'cada día. La calculadora usa valores medios que puedes cambiar; no sustituye a una oferta ni a un dato oficial.',
  };
}

function structuredSourceQuestion(summary: FuelPriceSummary): FaqItem {
  return {
    question: '¿De dónde salen los precios del combustible?',
    answer:
      `Son la media de los precios de todas las gasolineras de España publicados por ${summary.source}, ` +
      `con datos del ${summary.mitecoDate}. Las provincias con pocas gasolineras no publican media.`,
  };
}

/** Preguntas frecuentes de la página principal, con cifras calculadas a partir de los datos reales. */
export function buildFaqItems(summary: FuelPriceSummary, charging: ChargingPrices): FaqItem[] {
  return [
    structuredHomeQuestion(summary, charging),
    structuredFastQuestion(summary, charging),
    structuredSavingsQuestion(summary, charging),
    structuredOperatorQuestion(charging),
    structuredEstimateQuestion(),
    structuredSourceQuestion(summary),
  ];
}

/** `BreadcrumbList`; las URL son rutas de la web y se convierten en absolutas. */
export function breadcrumbJsonLd(items: BreadcrumbEntry[]): Record<string, unknown> {
  return {
    '@context': STRUCTURED_CONTEXT,
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: absoluteUrl(item.url),
    })),
  };
}

/** `WebApplication` gratuita de la página principal. */
export function webApplicationJsonLd(description: string): Record<string, unknown> {
  return {
    '@context': STRUCTURED_CONTEXT,
    '@type': 'WebApplication',
    name: SECTION_NAME,
    description,
    url: absoluteUrl('/'),
    applicationCategory: 'FinanceApplication',
    operatingSystem: 'Any',
    inLanguage: 'es',
    offers: { '@type': 'Offer', price: STRUCTURED_FREE_PRICE, priceCurrency: 'EUR' },
  };
}

/** `FAQPage` con las mismas preguntas que se ven en la página. */
export function faqPageJsonLd(items: FaqItem[]): Record<string, unknown> {
  return {
    '@context': STRUCTURED_CONTEXT,
    '@type': 'FAQPage',
    mainEntity: items.map((item) => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: { '@type': 'Answer', text: item.answer },
    })),
  };
}
