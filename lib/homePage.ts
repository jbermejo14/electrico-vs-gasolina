import type { ChargingPrices } from './chargingPrices';
import { formatEuros, formatMitecoDay, formatMitecoMonth, formatPricePerLitre } from './format';
import type { FuelPriceSummary } from './fuelPrices';
import { referenceCombustionPer100Km, referenceElectricPer100Km } from './referenceCosts';

const HOME_ONLY_HOME_SHARE = 1;

/** Título de la página principal; el mes sale de la fecha de MITECO de los datos. */
export function homeTitle(summary: FuelPriceSummary): string {
  return `Coche eléctrico o gasolina: coste por km en España (${formatMitecoMonth(summary.mitecoDate)})`;
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
