import {
  CHARGING_MARKET_ID,
  CHARGING_MARKET_LABEL,
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
} from './costPerKm';
import {
  formatAnnualSavings,
  formatDecimal,
  formatEuros,
  formatKm,
  formatMitecoDay,
  formatPercent,
  formatPricePerKwh,
  formatPricePerLitre,
} from './format';
import type { FuelPriceSummary } from './fuelPrices';
import { referenceCombustionPer100Km, referenceElectricPer100Km } from './referenceCosts';

export interface FaqItem {
  question: string;
  answer: string;
}

const FAQ_ANNUAL_DECIMALS = 0;
const FAQ_ALL_HOME = 1;
const FAQ_ALL_PUBLIC = 0;

function faqHomeQuestion(summary: FuelPriceSummary, charging: ChargingPrices): FaqItem {
  const homePrice = charging.home[DEFAULT_HOME_TARIFF];
  return {
    question: '¿Cuánto cuesta recorrer 100 km en un coche eléctrico cargando en casa?',
    answer:
      `Con un consumo de ${formatDecimal(DEFAULT_EV_CONSUMPTION_KWH_100KM)} kWh/100 km, una tarifa de referencia de ${formatPricePerKwh(homePrice)} ` +
      `y un rendimiento de carga del ${formatPercent(CHARGING_EFFICIENCY)}, 100 km cuestan unos ` +
      `${formatEuros(referenceElectricPer100Km(charging, FAQ_ALL_HOME))}. Un coche de gasolina 95 de ` +
      `${formatDecimal(DEFAULT_CONSUMPTION_L_100KM.gasolina95)} l/100 km a la media de España (${formatPricePerLitre(summary.national.gasolina95.average)}) ` +
      `gasta ${formatEuros(referenceCombustionPer100Km('gasolina95', summary.national.gasolina95.average))} por cada 100 km.`,
  };
}

function faqFastQuestion(summary: FuelPriceSummary, charging: ChargingPrices): FaqItem {
  const fastPrice = publicPrice(charging, CHARGING_MARKET_ID, DEFAULT_PUBLIC_LEVEL);
  return {
    question: '¿Y cuánto cuesta si cargo solo en recarga rápida?',
    answer:
      `Con la ${CHARGING_MARKET_LABEL.toLowerCase()} en recarga «${POWER_LEVEL_LABELS[DEFAULT_PUBLIC_LEVEL]}» (${formatPricePerKwh(fastPrice)}), ` +
      `100 km cuestan unos ${formatEuros(referenceElectricPer100Km(charging, FAQ_ALL_PUBLIC))}, frente a ` +
      `${formatEuros(referenceCombustionPer100Km('gasolina95', summary.national.gasolina95.average))} en gasolina 95 y ${formatEuros(referenceCombustionPer100Km('diesel', summary.national.diesel.average))} en diésel ` +
      '(medias de España).',
  };
}

function faqSavingsQuestion(summary: FuelPriceSummary, charging: ChargingPrices): FaqItem {
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
      publicPricePerKwh: publicPrice(charging, CHARGING_MARKET_ID, DEFAULT_PUBLIC_LEVEL),
      annualKm: DEFAULT_ANNUAL_KM,
    },
  );
  return {
    question: `¿Cuánto se ahorra al año con ${formatKm(DEFAULT_ANNUAL_KM)}?`,
    answer:
      `Cargando el ${formatPercent(DEFAULT_HOME_SHARE)} en casa y el resto en recarga rápida, el eléctrico cuesta ` +
      `${formatEuros(comparison.electric.annual, FAQ_ANNUAL_DECIMALS)} al año y el de gasolina 95 ${formatEuros(comparison.combustion.annual, FAQ_ANNUAL_DECIMALS)}. ` +
      `${formatAnnualSavings(comparison)}.`,
  };
}

function faqOperatorQuestion(charging: ChargingPrices): FaqItem {
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

function faqEstimateQuestion(): FaqItem {
  return {
    question: '¿Por qué el resultado es orientativo?',
    answer:
      'Los precios de recarga dependen del operador, de la tarifa que tengas contratada y de las promociones, y el consumo ' +
      'real de cada coche cambia con la velocidad, la temperatura y el tipo de vía. Además, los precios del combustible varían ' +
      'cada día. La calculadora usa valores medios que puedes cambiar; no sustituye a una oferta ni a un dato oficial.',
  };
}

function faqSourceQuestion(summary: FuelPriceSummary): FaqItem {
  return {
    question: '¿De dónde salen los precios del combustible?',
    answer:
      `Son la media de los precios de todas las gasolineras de España publicados por ${summary.source}, ` +
      `con datos del ${formatMitecoDay(summary.mitecoDate)}. Las provincias con pocas gasolineras no publican media.`,
  };
}

/** Preguntas frecuentes de la página principal, con cifras calculadas a partir de los datos reales. */
export function buildFaqItems(summary: FuelPriceSummary, charging: ChargingPrices): FaqItem[] {
  return [
    faqHomeQuestion(summary, charging),
    faqFastQuestion(summary, charging),
    faqSavingsQuestion(summary, charging),
    faqOperatorQuestion(charging),
    faqEstimateQuestion(),
    faqSourceQuestion(summary),
  ];
}

