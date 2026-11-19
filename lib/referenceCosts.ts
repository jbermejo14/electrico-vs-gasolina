import { CHARGING_MARKET_ID, publicPrice, type ChargingPrices } from './chargingPrices';
import {
  DEFAULT_ANNUAL_KM,
  DEFAULT_CONSUMPTION_L_100KM,
  DEFAULT_EV_CONSUMPTION_KWH_100KM,
  DEFAULT_HOME_TARIFF,
  DEFAULT_PUBLIC_LEVEL,
  combustionCost,
  electricCost,
} from './costPerKm';
import type { FuelType } from './fuelPrices';

/**
 * Coste por 100 km de un coche eléctrico con los valores por defecto: tarifa de casa de referencia
 * y media del mercado en recarga pública. `homeShare` es la parte cargada en casa (0 a 1).
 */
export function referenceElectricPer100Km(charging: ChargingPrices, homeShare: number): number {
  return electricCost({
    consumptionKwhPer100Km: DEFAULT_EV_CONSUMPTION_KWH_100KM,
    homeShare,
    homePricePerKwh: charging.home[DEFAULT_HOME_TARIFF],
    publicPricePerKwh: publicPrice(charging, CHARGING_MARKET_ID, DEFAULT_PUBLIC_LEVEL),
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
