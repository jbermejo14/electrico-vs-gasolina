import type { MetadataRoute } from 'next';
import { mitecoDateToDate } from './format';
import { provincesWithData, type FuelPriceSummary } from './fuelPrices';
import { absoluteUrl } from './site';

const ROUTES_HOME_PRIORITY = 1;
const ROUTES_PROVINCE_PRIORITY = 0.8;

export interface ProvinceRouteParams {
  provincia: string;
}

/** Parámetros de `generateStaticParams`: una página por provincia con datos. */
export function provinceParams(summary: FuelPriceSummary): ProvinceRouteParams[] {
  return provincesWithData(summary).map((province) => ({ provincia: province.pageSlug }));
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
