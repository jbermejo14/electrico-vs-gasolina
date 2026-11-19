import React from 'react';
import type { Comparison, CostResult } from '@/lib/costPerKm';
import { formatAnnualSavings, formatEuros } from '@/lib/format';
import { FUEL_LABELS, type FuelType } from '@/lib/fuelPrices';

const RESULT_ANNUAL_DECIMALS = 0;
const RESULT_PER_KM_DECIMALS = 3;

interface ResultCardProps {
  title: string;
  result: CostResult;
  isCheaper: boolean;
}

function CalculatorResultCard({ title, result, isCheaper }: ResultCardProps) {
  return (
    <div className="result-card">
      <div className="result-card-header">
        <h4 className="result-card-title">{title}</h4>
        {isCheaper && <span className="tag tag-green">Más barato</span>}
      </div>
      <p className="result-value">{formatEuros(result.per100Km)}</p>
      <p className="result-unit text-muted">por 100 km</p>
      <dl className="result-figures">
        <div>
          <dt className="text-muted">Por km</dt>
          <dd>{formatEuros(result.perKm, RESULT_PER_KM_DECIMALS)}</dd>
        </div>
        <div>
          <dt className="text-muted">Por año</dt>
          <dd>{formatEuros(result.annual, RESULT_ANNUAL_DECIMALS)}</dd>
        </div>
      </dl>
    </div>
  );
}

function calculatorSavingsClass(comparison: Comparison): string {
  if (comparison.cheaper === 'electric') return 'savings savings-positive';
  if (comparison.cheaper === 'combustion') return 'savings savings-negative';
  return 'savings';
}

/** Las dos tarjetas de resultado y la frase de ahorro anual. */
export function CalculatorResults({ comparison, fuel }: { comparison: Comparison; fuel: FuelType }) {
  return (
    <>
      <div className="grid gap-3 sm:grid-cols-2 min-[961px]:grid-cols-1">
        <CalculatorResultCard
          title={`Combustión (${FUEL_LABELS[fuel]})`}
          result={comparison.combustion}
          isCheaper={comparison.cheaper === 'combustion'}
        />
        <CalculatorResultCard
          title="Eléctrico"
          result={comparison.electric}
          isCheaper={comparison.cheaper === 'electric'}
        />
      </div>
      <p className={calculatorSavingsClass(comparison)}>{formatAnnualSavings(comparison)}</p>
    </>
  );
}
