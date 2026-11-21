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
import { formatEuros } from '@/lib/format';
import { referenceCombustionPer100Km, referenceElectricPer100Km } from '@/lib/referenceCosts';
import { getNetworkLinksForRoute } from '@/lib/network';

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
  const ogImage = absoluteUrl('/brand/ododex-og.png');
  return {
    title,
    description,
    alternates: { canonical },
    openGraph: {
      title,
      description,
      url: canonical,
      type: 'website',
      locale: 'es_ES',
      siteName: SITE_NAME,
      images: [
        {
          url: ogImage,
          width: 1200,
          height: 630,
          alt: `Eléctrico o gasolina en ${context.province.name} · Ododex`,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [ogImage],
    },
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

  const gasAverage = province.gasolina95?.average;
  const natGasAverage = summary.national.gasolina95.average;
  let annualSavingsNarrative: string | null = null;

  if (gasAverage) {
    const kmAnnual = 15000;
    const gasCostProv = (kmAnnual / 100) * referenceCombustionPer100Km('gasolina95', gasAverage);
    const gasCostNat = (kmAnnual / 100) * referenceCombustionPer100Km('gasolina95', natGasAverage);
    const evCostHome = (kmAnnual / 100) * referenceElectricPer100Km(charging, 1);
    const annualDiffNat = gasCostProv - gasCostNat;
    const annualSavingsVsGas = gasCostProv - evCostHome;

    const diffNatText =
      Math.abs(annualDiffNat) < 1
        ? 'prácticamente igual a la media nacional'
        : annualDiffNat > 0
          ? `${formatEuros(annualDiffNat)} más al año que la media española`
          : `${formatEuros(Math.abs(annualDiffNat))} menos al año que la media española`;

    annualSavingsNarrative =
      `Conducir 15.000 km al año con un coche de gasolina 95 en ${province.name} supone un gasto estimado en carburante de ${formatEuros(gasCostProv)} (${diffNatText}). ` +
      `Si se realiza ese mismo kilometraje con un vehículo eléctrico recargando en casa en tarifa valle, el coste anual desciende a ${formatEuros(evCostHome)}, lo que representa un ahorro de ${formatEuros(annualSavingsVsGas)} cada año.`;
  }

  const networkLinks = getNetworkLinksForRoute(`/es/electrico-vs-gasolina/${province.pageSlug}`) || [];
  const fallbackLinks = [
    {
      seccion: '/es/gasolineras',
      texto: `Gasolineras más baratas en ${province.name}`,
      href: `/es/gasolineras/provincia/${province.slug}`,
    },
    {
      seccion: '/es/puntos-recarga',
      texto: `Puntos de recarga en ${province.name}`,
      href: `/es/puntos-recarga/provincia/${province.slug}`,
    },
    {
      seccion: '/es/itv',
      texto: `Centros ITV en ${province.name}`,
      href: `/es/itv/centros/${province.slug}`,
    },
  ];
  const crossLinks = networkLinks.length > 0 ? networkLinks : fallbackLinks;

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

        {annualSavingsNarrative && (
          <section className="card p-5 text-sm space-y-2">
            <h2 className="text-base font-bold">
              Impacto económico en {province.name} a 15.000 km/año
            </h2>
            <p className="text-muted leading-relaxed">{annualSavingsNarrative}</p>
          </section>
        )}

        <CostCalculator fuelPrices={fuelPrices} charging={charging} placeLabel={province.name} />
        <AdSlot />
        <section aria-labelledby="province-links-title">
          <h2 id="province-links-title" className="text-xl font-bold mb-3">
            Movilidad y servicios en {province.name}
          </h2>
          <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
            {crossLinks.map((link, idx) => (
              <ProvinceExternalLink key={idx} href={link.href} label={link.texto} />
            ))}
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
