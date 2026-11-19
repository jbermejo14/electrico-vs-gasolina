'use client';

import React, { useState } from 'react';
import {
  HOME_TARIFFS,
  HOME_TARIFF_LABELS,
  POWER_LEVELS,
  POWER_LEVEL_LABELS,
  publicPrice,
  type ChargingPrices,
  type HomeTariff,
  type PowerLevel,
} from '@/lib/chargingPrices';
import {
  DEFAULT_ANNUAL_KM,
  DEFAULT_CONSUMPTION_L_100KM,
  DEFAULT_EV_CONSUMPTION_KWH_100KM,
  DEFAULT_HOME_SHARE,
  DEFAULT_HOME_TARIFF,
  DEFAULT_PUBLIC_LEVEL,
  compareCosts,
  type Comparison,
  type CostResult,
} from '@/lib/costPerKm';
import { formatEuros } from '@/lib/format';
import { FUEL_LABELS, FUEL_TYPES, type FuelType } from '@/lib/fuelPrices';

export interface CostCalculatorProps {
  /** Precio medio del lugar por combustible; null si no hay dato. */
  fuelPrices: Record<FuelType, number | null>;
  charging: ChargingPrices;
  /** "España" o el nombre de la provincia. */
  placeLabel: string;
}

const CALCULATOR_OTHER_TARIFF = 'other';
const CALCULATOR_MARKET_OPERATOR = 'market';
const CALCULATOR_MARKET_LABEL = 'Media del mercado';
const CALCULATOR_OTHER_TARIFF_LABEL = 'Otra tarifa';
const CALCULATOR_PERCENT_FACTOR = 100;
const CALCULATOR_SHARE_STEP_PERCENT = 10;
const CALCULATOR_ERROR_POSITIVE = 'Introduce un número mayor que 0.';
const CALCULATOR_ERROR_NON_NEGATIVE = 'Introduce un número igual o mayor que 0.';
const CALCULATOR_ANNUAL_DECIMALS = 0;
const CALCULATOR_PER_KM_DECIMALS = 3;

type CalculatorHomeTariff = HomeTariff | typeof CALCULATOR_OTHER_TARIFF;

/** Los campos de texto se guardan como texto para poder vaciarlos mientras se escribe. */
interface CalculatorState {
  annualKm: string;
  fuel: FuelType;
  consumption: string;
  fuelPrice: string;
  evConsumption: string;
  homePercent: number;
  homeTariff: CalculatorHomeTariff;
  homePrice: string;
  operator: string;
  level: PowerLevel;
  publicPrice: string;
}

type CalculatorField = 'annualKm' | 'consumption' | 'fuelPrice' | 'evConsumption' | 'homePrice' | 'publicPrice';
type CalculatorErrors = Partial<Record<CalculatorField, string>>;

function calculatorPriceText(price: number | null): string {
  return price === null ? '' : String(price);
}

function calculatorAvailableFuels(fuelPrices: CostCalculatorProps['fuelPrices']): FuelType[] {
  return FUEL_TYPES.filter((fuel) => fuelPrices[fuel] !== null);
}

function calculatorInitialState(props: CostCalculatorProps): CalculatorState {
  const fuel = calculatorAvailableFuels(props.fuelPrices)[0] ?? FUEL_TYPES[0];
  return {
    annualKm: String(DEFAULT_ANNUAL_KM),
    fuel,
    consumption: String(DEFAULT_CONSUMPTION_L_100KM[fuel]),
    fuelPrice: calculatorPriceText(props.fuelPrices[fuel]),
    evConsumption: String(DEFAULT_EV_CONSUMPTION_KWH_100KM),
    homePercent: Math.round(DEFAULT_HOME_SHARE * CALCULATOR_PERCENT_FACTOR),
    homeTariff: DEFAULT_HOME_TARIFF,
    homePrice: String(props.charging.home[DEFAULT_HOME_TARIFF]),
    operator: CALCULATOR_MARKET_OPERATOR,
    level: DEFAULT_PUBLIC_LEVEL,
    publicPrice: String(publicPrice(props.charging, CALCULATOR_MARKET_OPERATOR, DEFAULT_PUBLIC_LEVEL)),
  };
}

/** Número del campo; NaN si está vacío o no es un número. Acepta coma decimal. */
function calculatorParse(text: string): number {
  if (text.trim() === '') return Number.NaN;
  return Number(text.trim().replace(',', '.'));
}

function calculatorIsPositive(value: number): boolean {
  return Number.isFinite(value) && value > 0;
}

function calculatorValidate(state: CalculatorState): CalculatorErrors {
  const errors: CalculatorErrors = {};
  const annualKm = calculatorParse(state.annualKm);
  if (!Number.isFinite(annualKm) || annualKm < 0) errors.annualKm = CALCULATOR_ERROR_NON_NEGATIVE;
  const positiveFields: Array<[CalculatorField, string]> = [
    ['consumption', state.consumption],
    ['fuelPrice', state.fuelPrice],
    ['evConsumption', state.evConsumption],
    ['homePrice', state.homePrice],
    ['publicPrice', state.publicPrice],
  ];
  for (const [field, text] of positiveFields) {
    if (!calculatorIsPositive(calculatorParse(text))) errors[field] = CALCULATOR_ERROR_POSITIVE;
  }
  return errors;
}

/** Calcula la comparación con las entradas ya validadas. */
function calculatorCompare(state: CalculatorState): Comparison {
  const annualKm = calculatorParse(state.annualKm);
  return compareCosts(
    {
      consumptionLitresPer100Km: calculatorParse(state.consumption),
      pricePerLitre: calculatorParse(state.fuelPrice),
      annualKm,
    },
    {
      consumptionKwhPer100Km: calculatorParse(state.evConsumption),
      homeShare: state.homePercent / CALCULATOR_PERCENT_FACTOR,
      homePricePerKwh: calculatorParse(state.homePrice),
      publicPricePerKwh: calculatorParse(state.publicPrice),
      annualKm,
    },
  );
}

function calculatorSavingsText(comparison: Comparison): string {
  const amount = formatEuros(Math.abs(comparison.annualSavings), CALCULATOR_ANNUAL_DECIMALS);
  if (comparison.cheaper === 'electric') return `El eléctrico te ahorra ${amount} al año`;
  if (comparison.cheaper === 'combustion') return `El eléctrico te cuesta ${amount} más al año`;
  return 'El coste anual de los dos es prácticamente igual';
}

function calculatorSavingsClass(comparison: Comparison): string {
  if (comparison.cheaper === 'electric') return 'savings savings-positive';
  if (comparison.cheaper === 'combustion') return 'savings savings-negative';
  return 'savings';
}

interface NumberFieldProps {
  id: string;
  label: string;
  value: string;
  error?: string;
  onChange: (value: string) => void;
}

function CalculatorNumberField({ id, label, value, error, onChange }: NumberFieldProps) {
  const errorId = `${id}-error`;
  return (
    <div className="form-group">
      <label className="form-label" htmlFor={id}>
        {label}
      </label>
      <input
        id={id}
        className="form-control tabular-nums"
        type="number"
        inputMode="decimal"
        step="any"
        value={value}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
        onChange={(event) => onChange(event.target.value)}
      />
      {error && (
        <p id={errorId} className="field-error">
          {error}
        </p>
      )}
    </div>
  );
}

interface SelectFieldProps {
  id: string;
  label: string;
  value: string;
  options: Array<{ value: string; label: string }>;
  onChange: (value: string) => void;
}

function CalculatorSelectField({ id, label, value, options, onChange }: SelectFieldProps) {
  return (
    <div className="form-group">
      <label className="form-label" htmlFor={id}>
        {label}
      </label>
      <select id={id} className="form-control" value={value} onChange={(event) => onChange(event.target.value)}>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}

interface ResultCardProps {
  title: string;
  result: CostResult;
  isCheaper: boolean;
}

function CalculatorResultCard({ title, result, isCheaper }: ResultCardProps) {
  return (
    <div className="result-card">
      <div className="result-card-header">
        <h3 className="result-card-title">{title}</h3>
        {isCheaper && <span className="tag tag-green">Más barato</span>}
      </div>
      <p className="result-value">{formatEuros(result.per100Km)}</p>
      <p className="result-unit text-muted">por 100 km</p>
      <dl className="result-figures">
        <div>
          <dt className="text-muted">Por km</dt>
          <dd>{formatEuros(result.perKm, CALCULATOR_PER_KM_DECIMALS)}</dd>
        </div>
        <div>
          <dt className="text-muted">Por año</dt>
          <dd>{formatEuros(result.annual, CALCULATOR_ANNUAL_DECIMALS)}</dd>
        </div>
      </dl>
    </div>
  );
}

function CalculatorResults({ comparison, fuel }: { comparison: Comparison; fuel: FuelType }) {
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
      <p className={calculatorSavingsClass(comparison)}>{calculatorSavingsText(comparison)}</p>
    </>
  );
}

/**
 * Calculadora de coste por kilómetro. El primer render (servidor) ya muestra el resultado
 * con los valores por defecto, así que la página se lee sin JavaScript.
 */
export function CostCalculator(props: CostCalculatorProps) {
  const { fuelPrices, charging, placeLabel } = props;
  const [state, setState] = useState<CalculatorState>(() => calculatorInitialState(props));
  const update = (changes: Partial<CalculatorState>) => setState((current) => ({ ...current, ...changes }));

  const errors = calculatorValidate(state);
  const hasErrors = Object.keys(errors).length > 0;
  const fuelOptions = calculatorAvailableFuels(fuelPrices).map((fuel) => ({ value: fuel, label: FUEL_LABELS[fuel] }));

  const changeFuel = (value: string) => {
    const fuel = value as FuelType;
    update({
      fuel,
      consumption: String(DEFAULT_CONSUMPTION_L_100KM[fuel]),
      fuelPrice: calculatorPriceText(fuelPrices[fuel]),
    });
  };
  const changeHomeTariff = (value: string) => {
    if (value === CALCULATOR_OTHER_TARIFF) {
      update({ homeTariff: CALCULATOR_OTHER_TARIFF });
      return;
    }
    const tariff = value as HomeTariff;
    update({ homeTariff: tariff, homePrice: String(charging.home[tariff]) });
  };
  const changeOperator = (operator: string) =>
    update({ operator, publicPrice: String(publicPrice(charging, operator, state.level)) });
  const changeLevel = (value: string) => {
    const level = value as PowerLevel;
    update({ level, publicPrice: String(publicPrice(charging, state.operator, level)) });
  };

  const tariffOptions = [
    ...HOME_TARIFFS.map((tariff) => ({ value: tariff, label: HOME_TARIFF_LABELS[tariff] })),
    { value: CALCULATOR_OTHER_TARIFF, label: CALCULATOR_OTHER_TARIFF_LABEL },
  ];
  const operatorOptions = [
    { value: CALCULATOR_MARKET_OPERATOR, label: CALCULATOR_MARKET_LABEL },
    ...charging.operators.map((operator) => ({ value: operator.id, label: operator.name })),
  ];
  const levelOptions = POWER_LEVELS.map((level) => ({ value: level, label: POWER_LEVEL_LABELS[level] }));

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
          <fieldset className="calc-fieldset">
            <legend className="calc-legend">Uso</legend>
            <CalculatorNumberField
              id="calc-annual-km"
              label="Kilómetros al año"
              value={state.annualKm}
              error={errors.annualKm}
              onChange={(annualKm) => update({ annualKm })}
            />
          </fieldset>
          <fieldset className="calc-fieldset">
            <legend className="calc-legend">Coche de combustión</legend>
            <CalculatorSelectField id="calc-fuel" label="Combustible" value={state.fuel} options={fuelOptions} onChange={changeFuel} />
            <CalculatorNumberField
              id="calc-consumption"
              label="Consumo (l/100 km)"
              value={state.consumption}
              error={errors.consumption}
              onChange={(consumption) => update({ consumption })}
            />
            <CalculatorNumberField
              id="calc-fuel-price"
              label={`Precio del combustible (€/l), media de ${placeLabel}`}
              value={state.fuelPrice}
              error={errors.fuelPrice}
              onChange={(fuelPrice) => update({ fuelPrice })}
            />
          </fieldset>
          <fieldset className="calc-fieldset">
            <legend className="calc-legend">Coche eléctrico</legend>
            <CalculatorNumberField
              id="calc-ev-consumption"
              label="Consumo (kWh/100 km)"
              value={state.evConsumption}
              error={errors.evConsumption}
              onChange={(evConsumption) => update({ evConsumption })}
            />
            <div className="form-group">
              <label className="form-label" htmlFor="calc-home-percent">
                Energía cargada en casa: {state.homePercent} %
              </label>
              <div className="range-container">
                <input
                  id="calc-home-percent"
                  className="range-slider"
                  type="range"
                  min={0}
                  max={CALCULATOR_PERCENT_FACTOR}
                  step={CALCULATOR_SHARE_STEP_PERCENT}
                  value={state.homePercent}
                  onChange={(event) => update({ homePercent: Number(event.target.value) })}
                />
                <div className="range-marks" aria-hidden="true">
                  <span>0 %</span>
                  <span>100 %</span>
                </div>
              </div>
            </div>
            <CalculatorSelectField
              id="calc-home-tariff"
              label="Tarifa de casa"
              value={state.homeTariff}
              options={tariffOptions}
              onChange={changeHomeTariff}
            />
            <CalculatorNumberField
              id="calc-home-price"
              label="Precio en casa (€/kWh)"
              value={state.homePrice}
              error={errors.homePrice}
              onChange={(homePrice) => update({ homePrice, homeTariff: CALCULATOR_OTHER_TARIFF })}
            />
            <CalculatorSelectField
              id="calc-operator"
              label="Operador de recarga pública"
              value={state.operator}
              options={operatorOptions}
              onChange={changeOperator}
            />
            <CalculatorSelectField id="calc-level" label="Potencia de recarga" value={state.level} options={levelOptions} onChange={changeLevel} />
            <CalculatorNumberField
              id="calc-public-price"
              label="Precio de recarga pública (€/kWh)"
              value={state.publicPrice}
              error={errors.publicPrice}
              onChange={(publicPrice) => update({ publicPrice })}
            />
          </fieldset>
        </form>
        <div className="results-card calc-results" aria-live="polite">
          <h3 className="calc-legend">Resultado</h3>
          {hasErrors ? (
            <p className="field-error">Corrige los campos marcados para ver el resultado.</p>
          ) : (
            <CalculatorResults comparison={calculatorCompare(state)} fuel={state.fuel} />
          )}
        </div>
      </div>
    </section>
  );
}
