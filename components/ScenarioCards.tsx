import React from 'react';
import { publicPrice, type ChargingPrices } from '@/lib/chargingPrices';
import {
  DEFAULT_ANNUAL_KM,
  DEFAULT_CONSUMPTION_L_100KM,
  DEFAULT_EV_CONSUMPTION_KWH_100KM,
  DEFAULT_HOME_TARIFF,
  DEFAULT_PUBLIC_LEVEL,
  combustionCost,
  electricCost,
} from '@/lib/costPerKm';
import { formatDecimal, formatEuros, formatPricePerKwh, formatPricePerLitre } from '@/lib/format';
import { FUEL_LABELS, FUEL_TYPES, type FuelType } from '@/lib/fuelPrices';

export interface ScenarioCardsProps {
  /** Precio medio del lugar por combustible; null si no hay dato. */
  fuelPrices: Record<FuelType, number | null>;
  charging: ChargingPrices;
  /** "España" o el nombre de la provincia. */
  placeLabel: string;
}

interface Scenario {
  key: string;
  title: string;
  detail: string;
  per100Km: number | null;
}

const SCENARIO_MARKET_OPERATOR = 'market';
const SCENARIO_ALL_HOME = 1;
const SCENARIO_ALL_PUBLIC = 0;

function scenarioFuel(fuel: FuelType, price: number | null): Scenario {
  const consumption = DEFAULT_CONSUMPTION_L_100KM[fuel];
  const per100Km =
    price === null
      ? null
      : combustionCost({ consumptionLitresPer100Km: consumption, pricePerLitre: price, annualKm: DEFAULT_ANNUAL_KM })
          .per100Km;
  return {
    key: fuel,
    title: FUEL_LABELS[fuel],
    detail: price === null ? 'Sin datos de precio' : `${formatDecimal(consumption)} l/100 km a ${formatPricePerLitre(price)}`,
    per100Km,
  };
}

function scenarioElectric(key: string, title: string, charging: ChargingPrices, homeShare: number): Scenario {
  const homePrice = charging.home[DEFAULT_HOME_TARIFF];
  const fastPrice = publicPrice(charging, SCENARIO_MARKET_OPERATOR, DEFAULT_PUBLIC_LEVEL);
  const { per100Km } = electricCost({
    consumptionKwhPer100Km: DEFAULT_EV_CONSUMPTION_KWH_100KM,
    homeShare,
    homePricePerKwh: homePrice,
    publicPricePerKwh: fastPrice,
    annualKm: DEFAULT_ANNUAL_KM,
  });
  const price = homeShare === SCENARIO_ALL_HOME ? homePrice : fastPrice;
  return {
    key,
    title,
    detail: `${formatDecimal(DEFAULT_EV_CONSUMPTION_KWH_100KM)} kWh/100 km a ${formatPricePerKwh(price)}`,
    per100Km,
  };
}

function scenarioList(props: ScenarioCardsProps): Scenario[] {
  return [
    ...FUEL_TYPES.map((fuel) => scenarioFuel(fuel, props.fuelPrices[fuel])),
    scenarioElectric('home', 'Eléctrico cargando en casa', props.charging, SCENARIO_ALL_HOME),
    scenarioElectric('fast', 'Eléctrico en recarga rápida', props.charging, SCENARIO_ALL_PUBLIC),
  ];
}

function scenarioCheapestKey(scenarios: Scenario[]): string | null {
  let cheapest: Scenario | null = null;
  for (const scenario of scenarios) {
    if (scenario.per100Km === null) continue;
    if (cheapest === null || scenario.per100Km < (cheapest.per100Km ?? Infinity)) cheapest = scenario;
  }
  return cheapest === null ? null : cheapest.key;
}

/** Respuesta rápida de cada página: coste por 100 km de los cuatro escenarios de referencia. */
export function ScenarioCards(props: ScenarioCardsProps) {
  const scenarios = scenarioList(props);
  const cheapestKey = scenarioCheapestKey(scenarios);
  return (
    <section aria-labelledby="scenarios-title">
      <h2 id="scenarios-title" className="text-xl font-bold mb-3">
        Cuánto cuestan 100 km en {props.placeLabel}
      </h2>
      <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 min-[961px]:grid-cols-4">
        {scenarios.map((scenario) => (
          <div key={scenario.key} className="card scenario-card">
            <h3 className="result-card-title">{scenario.title}</h3>
            <p className="result-value">{scenario.per100Km === null ? 'Sin datos' : formatEuros(scenario.per100Km)}</p>
            <p className="result-unit text-muted">por 100 km</p>
            <p className="text-sm text-muted">{scenario.detail}</p>
            {scenario.key === cheapestKey && <span className="tag tag-green">Más barato</span>}
          </div>
        ))}
      </div>
    </section>
  );
}
