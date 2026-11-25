import type { ChargingPrices } from './chargingPrices';
import { formatEuros, formatMitecoDay, formatMitecoMonth, formatPricePerLitre } from './format';
import type { FuelPriceSummary } from './fuelPrices';
import { fitTitle } from './seo';
import { referenceCombustionPer100Km, referenceElectricPer100Km } from './referenceCosts';

const HOME_ONLY_HOME_SHARE = 1;

const HOME_TITLE_KEYWORD = 'Coche eléctrico o gasolina: coste por km';

/**
 * Título completo (con marca) de la página principal. Prefiere incluir el mes de los datos de MITECO,
 * pero cede ante el límite de longitud antes que truncar.
 */
export function homeTitle(summary: FuelPriceSummary): string {
  const month = formatMitecoMonth(summary.mitecoDate);
  return fitTitle([
    `${HOME_TITLE_KEYWORD} en España (${month})`,
    `${HOME_TITLE_KEYWORD} (${month})`,
    `${HOME_TITLE_KEYWORD} en España`,
    HOME_TITLE_KEYWORD,
  ]);
}

/** Description de la página principal (como máximo 160 caracteres) con las cifras reales. */
export function homeDescription(summary: FuelPriceSummary, charging: ChargingPrices): string {
  const price = summary.national.gasolina95.average;
  const gasoline = referenceCombustionPer100Km('gasolina95', price);
  const electric = referenceElectricPer100Km(charging, HOME_ONLY_HOME_SHARE);
  return (
    `100 km cuestan ${formatEuros(gasoline)} en gasolina 95 (media de España, ${formatPricePerLitre(price)}) ` +
    `y ${formatEuros(electric)} en eléctrico cargando en casa. Datos de MITECO del ${formatMitecoDay(summary.mitecoDate)}.`
  );
}
