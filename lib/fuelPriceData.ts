import fs from 'node:fs';
import path from 'node:path';
import { parseFuelPriceSummary, type FuelPriceSummary } from './fuelPrices';

const FUEL_PRICE_DATA_DEFAULT_FILE = path.join('data', 'fuel-prices.json');
const FUEL_PRICE_DATA_MISSING_MESSAGE =
  'Falta data/fuel-prices.json. Ejecuta npm run import-fuel (necesita ../gasolineras compilada).';

/**
 * Lee y valida el resumen de precios generado por el importador.
 * Solo para componentes de servidor (usa fs). Sin argumento lee data/fuel-prices.json de la raíz del proyecto.
 */
export function getFuelPriceSummary(filePath?: string): FuelPriceSummary {
  const target = filePath ?? path.join(process.cwd(), FUEL_PRICE_DATA_DEFAULT_FILE);
  if (!fs.existsSync(target)) {
    throw new Error(FUEL_PRICE_DATA_MISSING_MESSAGE);
  }
  return parseFuelPriceSummary(JSON.parse(fs.readFileSync(target, 'utf8')) as unknown);
}
