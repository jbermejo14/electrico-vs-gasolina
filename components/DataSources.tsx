import React from 'react';
import { formatUpdatedAt } from '@/lib/chargingPrices';
import { formatMitecoDay } from '@/lib/format';
import type { FuelPriceSummary } from '@/lib/fuelPrices';

export interface DataSourcesProps {
  summary: FuelPriceSummary;
  /** Fecha de las tarifas de recarga, "2026-11". */
  chargingUpdatedAt: string;
}

/** Fuente y fecha de los datos, con el aviso de que los precios son orientativos. */
export function DataSources({ summary, chargingUpdatedAt }: DataSourcesProps) {
  return (
    <section className="card" aria-labelledby="sources-title">
      <h2 id="sources-title" className="text-xl font-bold mb-3">
        Fuentes de los datos
      </h2>
      <ul className="data-sources-list">
        <li>
          Combustible: precios medios de las gasolineras según{' '}
          <a href={summary.sourceUrl} rel="noopener noreferrer" target="_blank">
            {summary.source}
          </a>
          , con datos del {formatMitecoDay(summary.mitecoDate)}.
        </li>
        <li>Electricidad: tarifas de recarga recopiladas por Ododex, {formatUpdatedAt(chargingUpdatedAt)}.</li>
      </ul>
      <p className="text-sm text-muted mt-3">
        Los precios de recarga son orientativos: los precios reales dependen del operador, de la tarifa que tengas
        contratada y de las promociones vigentes. El resultado de la calculadora no es una oferta ni un dato oficial.
      </p>
    </section>
  );
}
