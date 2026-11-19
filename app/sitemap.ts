import type { MetadataRoute } from 'next';
import { getFuelPriceSummary } from '@/lib/fuelPriceData';
import { sitemapEntries } from '@/lib/routes';

// Con `output: 'export'` el sitemap debe declararse estático para generarse en el build.
export const dynamic = 'force-static';

export default function sitemap(): MetadataRoute.Sitemap {
  return sitemapEntries(getFuelPriceSummary());
}
