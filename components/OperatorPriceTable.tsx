import React from 'react';
import {
  POWER_LEVELS,
  POWER_LEVEL_LABELS,
  type ChargingPrices,
  type PriceByLevel,
} from '@/lib/chargingPrices';
import { formatPricePerKwh } from '@/lib/format';

export interface OperatorPriceTableProps {
  charging: ChargingPrices;
}

const OPERATOR_TABLE_MARKET_LABEL = 'Media del mercado';

function OperatorPriceRow({ name, prices, highlighted }: { name: string; prices: PriceByLevel; highlighted?: boolean }) {
  return (
    <tr className={highlighted ? 'table-row-highlight' : undefined}>
      <th scope="row">{name}</th>
      {POWER_LEVELS.map((level) => (
        <td key={level} className="tabular-nums text-right">
          {formatPricePerKwh(prices[level])}
        </td>
      ))}
    </tr>
  );
}

/** Tarifas de recarga pública por operador y nivel de potencia, con la media del mercado destacada. */
export function OperatorPriceTable({ charging }: OperatorPriceTableProps) {
  return (
    <section aria-labelledby="operators-title">
      <h2 id="operators-title" className="text-xl font-bold mb-3">
        Tarifas de recarga por operador
      </h2>
      <div className="table-responsive card table-card">
        <table className="guide-table">
          <caption className="sr-only">Precio de la recarga pública en euros por kWh, por operador y potencia</caption>
          <thead>
            <tr>
              <th scope="col">Operador</th>
              {POWER_LEVELS.map((level) => (
                <th key={level} scope="col" className="text-right">
                  {POWER_LEVEL_LABELS[level]}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <OperatorPriceRow name={OPERATOR_TABLE_MARKET_LABEL} prices={charging.marketDefault} highlighted />
            {charging.operators.map((operator) => (
              <OperatorPriceRow key={operator.id} name={operator.name} prices={operator.prices} />
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-sm text-muted mt-2">Precios orientativos en euros por kWh, sin suscripción ni promociones.</p>
    </section>
  );
}
