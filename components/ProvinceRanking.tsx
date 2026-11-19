import React from 'react';
import Link from 'next/link';
import { DEFAULT_CONSUMPTION_L_100KM } from '@/lib/costPerKm';
import { formatDecimal, formatEuros, formatPricePerLitre } from '@/lib/format';
import {
  FUEL_LABELS,
  FUEL_TYPES,
  rankProvincesByGasoline,
  type FuelAverage,
  type FuelType,
  type ProvinceFuelPrices,
} from '@/lib/fuelPrices';
import { referenceCombustionPer100Km } from '@/lib/referenceCosts';

export interface ProvinceRankingProps {
  /** Provincias con datos (cualquier orden). */
  provinces: ProvinceFuelPrices[];
}

const RANKING_NO_DATA = 'Sin datos';
const RANKING_LOCALE = 'es';

/** Primero las provincias con gasolina 95, de menor a mayor precio; después las que solo tienen diésel. */
function rankingOrder(provinces: ProvinceFuelPrices[]): ProvinceFuelPrices[] {
  const ranked = rankProvincesByGasoline(provinces);
  const unranked = provinces
    .filter((province) => province.gasolina95 === null)
    .sort((a, b) => a.name.localeCompare(b.name, RANKING_LOCALE));
  return [...ranked, ...unranked];
}

function RankingCells({ fuel, average }: { fuel: FuelType; average: FuelAverage | null }) {
  if (average === null) {
    return (
      <>
        <td className="text-muted">{RANKING_NO_DATA}</td>
        <td className="text-muted">{RANKING_NO_DATA}</td>
      </>
    );
  }
  return (
    <>
      <td className="tabular-nums text-right">{formatPricePerLitre(average.average)}</td>
      <td className="tabular-nums text-right">{formatEuros(referenceCombustionPer100Km(fuel, average.average))}</td>
    </>
  );
}

/** Tabla de provincias por precio medio de combustible; cada provincia enlaza a su página. */
export function ProvinceRanking({ provinces }: ProvinceRankingProps) {
  return (
    <section aria-labelledby="ranking-title">
      <h2 id="ranking-title" className="text-xl font-bold mb-3">
        Provincias: de la gasolina más barata a la más cara
      </h2>
      <div className="table-responsive card table-card">
        <table className="guide-table">
          <caption className="sr-only">
            Precio medio del combustible y coste por 100 km en cada provincia, ordenadas por el precio de la gasolina 95
          </caption>
          <thead>
            <tr>
              <th scope="col">Provincia</th>
              {FUEL_TYPES.map((fuel) => (
                <React.Fragment key={fuel}>
                  <th scope="col" className="text-right">{`${FUEL_LABELS[fuel]} (€/l)`}</th>
                  <th scope="col" className="text-right">{`${FUEL_LABELS[fuel]} (100 km)`}</th>
                </React.Fragment>
              ))}
            </tr>
          </thead>
          <tbody>
            {rankingOrder(provinces).map((province) => (
              <tr key={province.pageSlug}>
                <th scope="row">
                  <Link href={`/${province.pageSlug}`}>{province.name}</Link>
                </th>
                {FUEL_TYPES.map((fuel) => (
                  <RankingCells key={fuel} fuel={fuel} average={province[fuel]} />
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-sm text-muted mt-2">
        El coste por 100 km usa el consumo por defecto de la calculadora ({formatDecimal(DEFAULT_CONSUMPTION_L_100KM.gasolina95)} l en
        gasolina y {formatDecimal(DEFAULT_CONSUMPTION_L_100KM.diesel)} l en diésel).
      </p>
    </section>
  );
}
