'use client';

import React, { useReducer } from 'react';
import { CalculatorResults } from '@/components/CalculatorResults';
import { CombustionFields, ElectricFields, UsageFields } from '@/components/CalculatorFields';
import {
  calculatorCompare,
  calculatorInitialState,
  calculatorReduce,
  calculatorValidate,
  type CalculatorAction,
  type CalculatorContext,
  type CalculatorState,
} from '@/lib/calculatorState';
import type { ChargingPrices } from '@/lib/chargingPrices';
import type { FuelType } from '@/lib/fuelPrices';

export interface CostCalculatorProps {
  /** Precio medio del lugar por combustible; null si no hay dato. */
  fuelPrices: Record<FuelType, number | null>;
  charging: ChargingPrices;
  /** "España" o el nombre de la provincia. */
  placeLabel: string;
}

/**
 * Calculadora de coste por kilómetro. El primer render (servidor) ya muestra el resultado
 * con los valores por defecto, así que la página se lee sin JavaScript.
 */
export function CostCalculator({ fuelPrices, charging, placeLabel }: CostCalculatorProps) {
  const context: CalculatorContext = { fuelPrices, charging };
  const [state, dispatch] = useReducer(
    (current: CalculatorState, action: CalculatorAction) => calculatorReduce(current, action, context),
    context,
    calculatorInitialState,
  );
  const errors = calculatorValidate(state);
  const comparison = calculatorCompare(state);

  return (
    <section className="card" aria-labelledby="calculator-title">
      <div className="card-header">
        <div>
          <h2 id="calculator-title" className="card-title">
            Calculadora de coste por km en {placeLabel}
          </h2>
          <p className="card-desc">Cambia los datos para ajustar el resultado a tu coche y a tu forma de cargar.</p>
        </div>
      </div>
      <div className="calculator-grid">
        <form onSubmit={(event) => event.preventDefault()} noValidate>
          <UsageFields state={state} errors={errors} dispatch={dispatch} />
          <CombustionFields
            state={state}
            errors={errors}
            dispatch={dispatch}
            placeLabel={placeLabel}
            fuelPrices={fuelPrices}
          />
          <ElectricFields state={state} errors={errors} dispatch={dispatch} charging={charging} />
        </form>
        <div className="results-card calc-results" aria-live="polite">
          <h3 className="calc-legend">Resultado</h3>
          {comparison === null ? (
            <p className="field-error">Corrige los campos marcados para ver el resultado.</p>
          ) : (
            <CalculatorResults comparison={comparison} fuel={state.fuel} />
          )}
        </div>
      </div>
    </section>
  );
}
