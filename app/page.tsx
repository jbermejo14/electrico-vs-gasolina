import type { Metadata } from 'next';
import { AdSlot } from '@/components/AdSlot';
import { CostCalculator } from '@/components/CostCalculator';
import { DataSources } from '@/components/DataSources';
import { JsonLd } from '@/components/JsonLd';
import { OperatorPriceTable } from '@/components/OperatorPriceTable';
import { ProvinceRanking } from '@/components/ProvinceRanking';
import { ScenarioCards } from '@/components/ScenarioCards';
import { getChargingPrices } from '@/lib/chargingPrices';
import { buildFaqItems } from '@/lib/faq';
import { formatMitecoDay } from '@/lib/format';
import { getFuelPriceSummary } from '@/lib/fuelPriceData';
import { averagePricesOf, provincesWithData } from '@/lib/fuelPrices';
import { homeDescription, homeTitle } from '@/lib/homePage';
import { socialMetadata } from '@/lib/seo';
import { absoluteUrl } from '@/lib/site';
import { faqPageJsonLd, webApplicationJsonLd } from '@/lib/structuredData';

const HOME_PLACE_LABEL = 'España';
const HOME_PATH = '/';
const HOME_IMAGE_ALT = 'Comparador Coche Eléctrico vs Gasolina · Ododex';

export function generateMetadata(): Metadata {
  const summary = getFuelPriceSummary();
  const title = homeTitle(summary);
  const description = homeDescription(summary, getChargingPrices());
  return {
    title: { absolute: title },
    description,
    alternates: { canonical: absoluteUrl(HOME_PATH) },
    ...socialMetadata({ title, description, path: HOME_PATH, imageAlt: HOME_IMAGE_ALT }),
  };
}

export default function HomePage() {
  const summary = getFuelPriceSummary();
  const charging = getChargingPrices();
  const fuelPrices = averagePricesOf(summary.national);
  const faqItems = buildFaqItems(summary, charging);

  return (
    <main className="main-wrapper">
      <JsonLd data={webApplicationJsonLd(homeDescription(summary, charging))} />
      <JsonLd data={faqPageJsonLd(faqItems)} />
      <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight mb-2">
        Coche eléctrico o gasolina: ¿cuánto cuesta el kilómetro?
      </h1>
      <p className="text-sm md:text-base text-muted mb-6">
        Compara el coste por kilómetro de un coche eléctrico y uno de gasolina o diésel con el precio medio real de los
        carburantes en España (MITECO, {formatMitecoDay(summary.mitecoDate)}) y tarifas de recarga orientativas.
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
