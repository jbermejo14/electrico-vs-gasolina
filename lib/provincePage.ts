import type { ChargingPrices } from './chargingPrices';
import { formatEuros, formatMitecoDay, formatPricePerLitre } from './format';
import { FUEL_LABELS, FUEL_TYPES, type FuelPriceSummary, type FuelType, type ProvinceFuelPrices } from './fuelPrices';
import { fitTitle } from './seo';
import { referenceCombustionPer100Km, referenceElectricPer100Km } from './referenceCosts';

/** Datos que necesitan los textos de la página de una provincia. */
export interface ProvinceContext {
  summary: FuelPriceSummary;
  province: ProvinceFuelPrices;
}

const PROVINCE_HOME_ONLY_SHARE = 1;
const PROVINCE_PRICE_DECIMALS = 3;
const PROVINCE_THOUSANDTHS = 10 ** PROVINCE_PRICE_DECIMALS;
const PROVINCE_DESCRIPTION_CALL_TO_ACTION = 'Calcula tu ahorro anual.';
const PROVINCE_FUEL_ARTICLES: Record<FuelType, string> = { gasolina95: 'la', diesel: 'el' };

/**
 * "0,011 € menos que la media de España", con la diferencia en valor absoluto.
 * Se redondea a milésimas antes de elegir "más", "menos" o "igual" para no escribir "0,000 € menos".
 */
export function provinceDifferenceText(difference: number): string {
  const rounded = Math.round(difference * PROVINCE_THOUSANDTHS) / PROVINCE_THOUSANDTHS;
  const amount = formatEuros(Math.abs(rounded), PROVINCE_PRICE_DECIMALS);
  if (rounded < 0) return `${amount} menos que la media de España`;
  if (rounded > 0) return `${amount} más que la media de España`;
  return 'igual que la media de España';
}

/** Una frase por combustible con precio en la provincia, comparada con la media nacional. */
export function provinceComparisonSentences({ summary, province }: ProvinceContext): string[] {
  return FUEL_TYPES.flatMap((fuel) => {
    const average = province[fuel];
    if (!average) return [];
    const difference = average.average - summary.national[fuel].average;
    const label = FUEL_LABELS[fuel].toLowerCase();
    return [
      `En ${province.name} ${PROVINCE_FUEL_ARTICLES[fuel]} ${label} cuesta de media ${formatPricePerLitre(average.average)}, ` +
        `${provinceDifferenceText(difference)}.`,
    ];
  });
}

/**
 * Posición de la provincia en el ranking de gasolina 95 (`ranked`, de la más barata a la más cara).
 * null si no está en el ranking, por ejemplo una provincia que solo publica diésel.
 */
export function provinceRankingText(province: ProvinceFuelPrices, ranked: ProvinceFuelPrices[]): string | null {
  const index = ranked.findIndex((candidate) => candidate.slug === province.slug);
  if (index < 0) return null;
  const position = `puesto ${index + 1} de ${ranked.length}`;
  if (index === 0) return `Es la provincia con la gasolina 95 más barata (${position}).`;
  if (index === ranked.length - 1) return `Es la provincia con la gasolina 95 más cara (${position}).`;
  return `Ocupa el ${position} del ranking de gasolina 95, de la más barata a la más cara.`;
}

/** Título completo (con marca) de la página de una provincia; recorta el sufijo antes que el nombre. */
export function provinceTitle(province: ProvinceFuelPrices): string {
  const keyword = `Eléctrico o gasolina en ${province.name}`;
  return fitTitle([`${keyword}: coste por km`, keyword]);
}

/** Description de la página de provincia (120-160 caracteres) con los costes por 100 km reales. */
export function provinceDescription({ summary, province }: ProvinceContext, charging: ChargingPrices): string {
  const fuels = FUEL_TYPES.flatMap((fuel) => {
    const average = province[fuel];
    if (!average) return [];
    return [`${FUEL_LABELS[fuel].toLowerCase()} ${formatEuros(referenceCombustionPer100Km(fuel, average.average))}`];
  });
  const electric = formatEuros(referenceElectricPer100Km(charging, PROVINCE_HOME_ONLY_SHARE));
  return (
    `Coste de 100 km en ${province.name} (MITECO, ${formatMitecoDay(summary.mitecoDate)}): ` +
    `${fuels.join(', ')}; eléctrico en casa ${electric}. ${PROVINCE_DESCRIPTION_CALL_TO_ACTION}`
  );
}
