import type { Metadata } from 'next';
import { AdSlot } from '@/components/AdSlot';
import { CostCalculator } from '@/components/CostCalculator';
import { DataSources } from '@/components/DataSources';
import { JsonLd } from '@/components/JsonLd';
import { OperatorPriceTable } from '@/components/OperatorPriceTable';
import { ProvinceRanking } from '@/components/ProvinceRanking';
import { ScenarioCards } from '@/components/ScenarioCards';
import { getChargingPrices } from '@/lib/chargingPrices';
import { formatEuros, formatMitecoMonth, formatPricePerLitre } from '@/lib/format';
import { getFuelPriceSummary } from '@/lib/fuelPriceData';
import { provincesWithData } from '@/lib/fuelPrices';
import { fuelPricesOf } from '@/lib/routes';
import { SECTION_NAME, SITE_NAME, absoluteUrl } from '@/lib/site';
import {
  breadcrumbJsonLd,
  buildFaqItems,
  faqPageJsonLd,
  referenceCombustionPer100Km,
  referenceElectricPer100Km,
  webApplicationJsonLd,
} from '@/lib/structuredData';

const HOME_PLACE_LABEL = 'España';
const HOME_PATH = '/';
const HOME_ONLY_SHARE = 1;

function homeDescription(): string {
  const summary = getFuelPriceSummary();
  const gasoline = referenceCombustionPer100Km('gasolina95', summary.national.gasolina95.average);
  const electric = referenceElectricPer100Km(getChargingPrices(), HOME_ONLY_SHARE);
  return (
    `100 km en gasolina 95 cuestan ${formatEuros(gasoline)} (media de España a ${formatPricePerLitre(summary.national.gasolina95.average)}, ` +
    `${formatMitecoMonth(summary.mitecoDate)}) y ${formatEuros(electric)} en un eléctrico cargando en casa. ` +
    'Calcula tu ahorro con precios medios reales de MITECO y tarifas de recarga orientativas.'
  );
}

export function generateMetadata(): Metadata {
  const summary = getFuelPriceSummary();
  const title = `Coche eléctrico o gasolina: coste por km en España (${formatMitecoMonth(summary.mitecoDate)})`;
  const description = homeDescription();
  const canonical = absoluteUrl(HOME_PATH);
  return {
    title: { absolute: title },
    description,
    alternates: { canonical },
    openGraph: { title, description, url: canonical, type: 'website', locale: 'es_ES', siteName: SITE_NAME },
  };
}

export default function HomePage() {
  const summary = getFuelPriceSummary();
  const charging = getChargingPrices();
  const fuelPrices = fuelPricesOf(summary.national);
  const faqItems = buildFaqItems(summary, charging);

  return (
    <main className="main-wrapper">
      <JsonLd data={breadcrumbJsonLd([{ name: SECTION_NAME, url: HOME_PATH }])} />
      <JsonLd data={webApplicationJsonLd(homeDescription())} />
      <JsonLd data={faqPageJsonLd(faqItems)} />
      <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight mb-2">
        Coche eléctrico o gasolina: ¿cuánto cuesta el kilómetro?
      </h1>
      <p className="text-sm md:text-base text-muted mb-6">
        Compara el coste por kilómetro de un coche eléctrico y uno de gasolina o diésel con el precio medio real de los
        carburantes en España (MITECO, {summary.mitecoDate}) y tarifas de recarga orientativas.
      </p>
      <div className="flex flex-col gap-8">
        <ScenarioCards fuelPrices={fuelPrices} charging={charging} placeLabel={HOME_PLACE_LABEL} />
        <CostCalculator fuelPrices={fuelPrices} charging={charging} placeLabel={HOME_PLACE_LABEL} />
        <AdSlot />
        <ProvinceRanking provinces={provincesWithData(summary)} />
        <OperatorPriceTable charging={charging} />
        <section aria-labelledby="faq-title">
          <h2 id="faq-title" className="text-xl font-bold mb-3">
            Preguntas frecuentes
          </h2>
          <div className="flex flex-col gap-3">
            {faqItems.map((item) => (
              <div key={item.question} className="card">
                <h3 className="faq-question">{item.question}</h3>
                <p className="text-sm text-muted">{item.answer}</p>
              </div>
            ))}
          </div>
        </section>
        <DataSources summary={summary} chargingUpdatedAt={charging.updatedAt} />
        <AdSlot />
      </div>
    </main>
  );
}
