import type { MetadataRoute } from 'next';
import { mitecoDateToDate } from './format';
import { provincesWithData, type FuelAverage, type FuelPriceSummary, type FuelType, type ProvinceFuelPrices } from './fuelPrices';
import { absoluteUrl } from './site';

const ROUTES_HOME_PRIORITY = 1;
const ROUTES_PROVINCE_PRIORITY = 0.8;
const ROUTES_LOCALE = 'es';

export interface ProvinceRouteParams {
  provincia: string;
}

/** Parámetros de `generateStaticParams`: una página por provincia con datos. */
export function provinceParams(summary: FuelPriceSummary): ProvinceRouteParams[] {
  return provincesWithData(summary).map((province) => ({ provincia: province.slug }));
}

/** Entradas del sitemap: la principal y las provincias con datos; sin legales. */
export function sitemapEntries(summary: FuelPriceSummary): MetadataRoute.Sitemap {
  const lastModified = mitecoDateToDate(summary.mitecoDate);
  const home = { url: absoluteUrl('/'), lastModified, changeFrequency: 'daily' as const, priority: ROUTES_HOME_PRIORITY };
  const provinces = provinceParams(summary).map(({ provincia }) => ({
    url: absoluteUrl(`/${provincia}`),
    lastModified,
    changeFrequency: 'daily' as const,
    priority: ROUTES_PROVINCE_PRIORITY,
  }));
  return [home, ...provinces];
}

/**
 * Provincias con precio de gasolina 95, de la más barata a la más cara.
 * Empates por nombre. Es el orden del ranking de la web.
 */
export function rankProvincesByGasoline(provinces: ProvinceFuelPrices[]): ProvinceFuelPrices[] {
  return provinces
    .filter((province) => province.gasolina95 !== null)
    .sort((a, b) => {
      const difference = (a.gasolina95?.average ?? 0) - (b.gasolina95?.average ?? 0);
      return difference !== 0 ? difference : a.name.localeCompare(b.name, ROUTES_LOCALE);
    });
}

/** Precios medios por combustible (€/l), en el formato que reciben la calculadora y los escenarios. */
export function fuelPricesOf(
  averages: Record<FuelType, FuelAverage | null>,
): Record<FuelType, number | null> {
  return {
    gasolina95: averages.gasolina95?.average ?? null,
    diesel: averages.diesel?.average ?? null,
  };
}
