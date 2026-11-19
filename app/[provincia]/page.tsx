import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { AdSlot } from '@/components/AdSlot';
import { Breadcrumbs } from '@/components/Breadcrumbs';
import { CostCalculator } from '@/components/CostCalculator';
import { DataSources } from '@/components/DataSources';
import { ScenarioCards } from '@/components/ScenarioCards';
import { getChargingPrices } from '@/lib/chargingPrices';
import { getFuelPriceSummary } from '@/lib/fuelPriceData';
import {
  averagePricesOf,
  findProvince,
  provincesWithData,
  rankProvincesByGasoline,
  type ProvinceFuelPrices,
} from '@/lib/fuelPrices';
import {
  provinceComparisonSentences,
  provinceDescription,
  provinceRankingText,
  type ProvinceContext,
} from '@/lib/provincePage';
import { provinceParams } from '@/lib/routes';
import { SECTION_NAME, SITE_NAME, absoluteUrl } from '@/lib/site';

export const dynamicParams = false;

interface ProvincePageParams {
  params: Promise<{ provincia: string }>;
}

export function generateStaticParams() {
  return provinceParams(getFuelPriceSummary());
}

/** Provincia pedida por su slug de página, o 404 si no existe o no tiene datos. */
function provinceContext(slug: string): ProvinceContext {
  const summary = getFuelPriceSummary();
  const province = findProvince(summary, slug);
  if (!province) notFound();
  return { summary, province };
}

export async function generateMetadata({ params }: ProvincePageParams): Promise<Metadata> {
  const { provincia } = await params;
  const context = provinceContext(provincia);
  const title = `Eléctrico o gasolina en ${context.province.name}: coste por km`;
  const description = provinceDescription(context, getChargingPrices());
  const canonical = absoluteUrl(`/${context.province.pageSlug}`);
  return {
    title,
    description,
    alternates: { canonical },
    openGraph: { title, description, url: canonical, type: 'website', locale: 'es_ES', siteName: SITE_NAME },
  };
}

function ProvinceNeighbourLink({ province, hint }: { province: ProvinceFuelPrices; hint: string }) {
  return (
    <Link href={`/${province.pageSlug}`} className="link-card">
      <span>
        <span className="link-card-name">{province.name}</span>
        <span className="link-card-hint">{hint}</span>
      </span>
      <span className="link-card-arrow" aria-hidden="true">
        →
      </span>
    </Link>
  );
}

function ProvinceExternalLink({ href, label }: { href: string; label: string }) {
  return (
    <a href={href} className="link-card">
      <span className="link-card-name">{label}</span>
      <span className="link-card-arrow" aria-hidden="true">
        →
      </span>
    </a>
  );
}

function ProvinceRankingSection({ province, ranked }: { province: ProvinceFuelPrices; ranked: ProvinceFuelPrices[] }) {
  const text = provinceRankingText(province, ranked);
  if (text === null) return null;
  const index = ranked.findIndex((candidate) => candidate.slug === province.slug);
  const cheaper = ranked[index - 1];
  const dearer = ranked[index + 1];
  return (
    <section aria-labelledby="province-ranking-title">
      <h2 id="province-ranking-title" className="text-xl font-bold mb-3">
        Posición en el ranking de gasolina 95
      </h2>
      <p className="mb-3">{text}</p>
      <div className="grid gap-3 sm:grid-cols-2">
        {cheaper && <ProvinceNeighbourLink province={cheaper} hint="Anterior en el ranking: más barata" />}
        {dearer && <ProvinceNeighbourLink province={dearer} hint="Siguiente en el ranking: más cara" />}
      </div>
    </section>
  );
}

export default async function ProvincePage({ params }: ProvincePageParams) {
  const { provincia } = await params;
  const { summary, province } = provinceContext(provincia);
  const charging = getChargingPrices();
  const fuelPrices = averagePricesOf(province);
  const all = provincesWithData(summary);
  const ranked = rankProvincesByGasoline(all);

  return (
    <main className="main-wrapper">
      <Breadcrumbs
        items={[
          { name: SECTION_NAME, url: '/' },
          { name: province.name, url: `/${province.pageSlug}` },
        ]}
      />
      <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight mb-6">
        Coche eléctrico o gasolina en {province.name}: coste por km
      </h1>
      <div className="flex flex-col gap-8">
        <ScenarioCards fuelPrices={fuelPrices} charging={charging} placeLabel={province.name} />
        <p className="text-sm md:text-base text-muted">{provinceComparisonSentences({ summary, province }).join(' ')}</p>
        <CostCalculator fuelPrices={fuelPrices} charging={charging} placeLabel={province.name} />
        <AdSlot />
        <section aria-labelledby="province-links-title">
          <h2 id="province-links-title" className="text-xl font-bold mb-3">
            Más información
          </h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <ProvinceExternalLink
              href={`/es/gasolineras/provincia/${province.slug}`}
              label={`Gasolineras más baratas en ${province.name}`}
            />
            <ProvinceExternalLink href="/es/puntos-recarga" label="Puntos de recarga" />
          </div>
        </section>
        <ProvinceRankingSection province={province} ranked={ranked} />
        <section aria-labelledby="province-list-title">
          <h2 id="province-list-title" className="text-xl font-bold mb-3">
            Todas las provincias
          </h2>
          <ul className="province-list">
            {all.map((item) => (
              <li key={item.pageSlug}>
                <Link href={`/${item.pageSlug}`} aria-current={item.slug === province.slug ? 'page' : undefined}>
                  {item.name}
                </Link>
              </li>
            ))}
          </ul>
        </section>
        <DataSources summary={summary} chargingUpdatedAt={charging.updatedAt} />
      </div>
    </main>
  );
}
