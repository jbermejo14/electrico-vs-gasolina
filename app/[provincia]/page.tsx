import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { AdSlot } from '@/components/AdSlot';
import { Breadcrumbs } from '@/components/Breadcrumbs';
import { CostCalculator } from '@/components/CostCalculator';
import { DataSources } from '@/components/DataSources';
import { ScenarioCards } from '@/components/ScenarioCards';
import { getChargingPrices } from '@/lib/chargingPrices';
import { formatEuros, formatPricePerLitre } from '@/lib/format';
import { getFuelPriceSummary } from '@/lib/fuelPriceData';
import {
  FUEL_LABELS,
  FUEL_TYPES,
  findProvince,
  provincesWithData,
  type FuelPriceSummary,
  type FuelType,
  type ProvinceFuelPrices,
} from '@/lib/fuelPrices';
import { fuelPricesOf, provinceParams, rankProvincesByGasoline } from '@/lib/routes';
import { SECTION_NAME, SITE_NAME, absoluteUrl } from '@/lib/site';
import { referenceCombustionPer100Km, referenceElectricPer100Km } from '@/lib/structuredData';

export const dynamicParams = false;

const PROVINCE_HOME_ONLY_SHARE = 1;
const PROVINCE_PRICE_DECIMALS = 3;
const PROVINCE_FUEL_ARTICLES: Record<FuelType, string> = { gasolina95: 'la', diesel: 'el' };

interface ProvincePageParams {
  params: Promise<{ provincia: string }>;
}

interface ProvinceContext {
  summary: FuelPriceSummary;
  province: ProvinceFuelPrices;
}

export function generateStaticParams() {
  return provinceParams(getFuelPriceSummary());
}

/** Provincia pedida, o 404 si el slug no existe o no tiene datos. */
function provinceContext(slug: string): ProvinceContext {
  const summary = getFuelPriceSummary();
  const province = findProvince(summary, slug);
  if (!province) notFound();
  return { summary, province };
}

function provinceDescription({ summary, province }: ProvinceContext): string {
  const charging = getChargingPrices();
  const parts = FUEL_TYPES.flatMap((fuel) => {
    const average = province[fuel];
    if (!average) return [];
    return [`${FUEL_LABELS[fuel]} ${formatEuros(referenceCombustionPer100Km(fuel, average.average))}`];
  });
  const electric = formatEuros(referenceElectricPer100Km(charging, PROVINCE_HOME_ONLY_SHARE));
  return (
    `Coste de 100 km en ${province.name} (precios de MITECO, ${summary.mitecoDate}): ${parts.join(' y ')}; ` +
    `eléctrico cargando en casa ${electric}. Calcula tu ahorro anual.`
  );
}

export async function generateMetadata({ params }: ProvincePageParams): Promise<Metadata> {
  const { provincia } = await params;
  const context = provinceContext(provincia);
  const title = `Eléctrico o gasolina en ${context.province.name}: coste por km`;
  const description = provinceDescription(context);
  const canonical = absoluteUrl(`/${context.province.slug}`);
  return {
    title,
    description,
    alternates: { canonical },
    openGraph: { title, description, url: canonical, type: 'website', locale: 'es_ES', siteName: SITE_NAME },
  };
}

/** "0,011 € menos que la media de España", con la diferencia en valor absoluto. */
function provinceDifferenceText(difference: number): string {
  const amount = formatEuros(Math.abs(difference), PROVINCE_PRICE_DECIMALS);
  if (difference < 0) return `${amount} menos que la media de España`;
  if (difference > 0) return `${amount} más que la media de España`;
  return 'igual que la media de España';
}

function provinceComparisonSentences({ summary, province }: ProvinceContext): string[] {
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

function provinceRankingText(province: ProvinceFuelPrices, ranked: ProvinceFuelPrices[]): string | null {
  const index = ranked.findIndex((candidate) => candidate.slug === province.slug);
  if (index < 0) return null;
  const position = `puesto ${index + 1} de ${ranked.length}`;
  if (index === 0) return `Es la provincia con la gasolina 95 más barata (${position}).`;
  if (index === ranked.length - 1) return `Es la provincia con la gasolina 95 más cara (${position}).`;
  return `Ocupa el ${position} del ranking de gasolina 95, de la más barata a la más cara.`;
}

function ProvinceNeighbourLink({ province, hint }: { province: ProvinceFuelPrices; hint: string }) {
  return (
    <Link href={`/${province.slug}`} className="link-card">
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
  const fuelPrices = fuelPricesOf(province);
  const all = provincesWithData(summary);
  const ranked = rankProvincesByGasoline(all);

  return (
    <main className="main-wrapper">
      <Breadcrumbs
        items={[
          { name: SECTION_NAME, url: '/' },
          { name: province.name, url: `/${province.slug}` },
        ]}
      />
      <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight mb-2">
        Coche eléctrico o gasolina en {province.name}: coste por km
      </h1>
      <p className="text-sm md:text-base text-muted mb-6">
        {provinceComparisonSentences({ summary, province }).join(' ')}
      </p>
      <div className="flex flex-col gap-8">
        <ScenarioCards fuelPrices={fuelPrices} charging={charging} placeLabel={province.name} />
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
              <li key={item.slug}>
                <Link href={`/${item.slug}`} aria-current={item.slug === province.slug ? 'page' : undefined}>
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
