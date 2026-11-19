import React from 'react';
import {
  CHARGING_MARKET_ID,
  CHARGING_MARKET_LABEL,
  HOME_TARIFFS,
  HOME_TARIFF_LABELS,
  POWER_LEVELS,
  POWER_LEVEL_LABELS,
  type ChargingPrices,
  type PowerLevel,
} from '@/lib/chargingPrices';
import {
  CALCULATOR_MAX_PERCENT,
  CALCULATOR_OTHER_TARIFF,
  CALCULATOR_PERCENT_STEP,
  calculatorAvailableFuels,
  type CalculatorAction,
  type CalculatorErrors,
  type CalculatorState,
} from '@/lib/calculatorState';
import { FUEL_LABELS, type FuelType } from '@/lib/fuelPrices';

const CALCULATOR_OTHER_TARIFF_LABEL = 'Otra tarifa';

export type CalculatorDispatch = (action: CalculatorAction) => void;

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

interface FieldsProps {
  state: CalculatorState;
  errors: CalculatorErrors;
  dispatch: CalculatorDispatch;
}

/** Kilómetros al año. */
export function UsageFields({ state, errors, dispatch }: FieldsProps) {
  return (
    <fieldset className="calc-fieldset">
      <legend className="calc-legend">Uso</legend>
      <CalculatorNumberField
        id="calc-annual-km"
        label="Kilómetros al año"
        value={state.annualKm}
        error={errors.annualKm}
        onChange={(value) => dispatch({ type: 'editText', field: 'annualKm', value })}
      />
    </fieldset>
  );
}

/** Combustible, consumo y precio del coche de combustión. */
export function CombustionFields({
  state,
  errors,
  dispatch,
  placeLabel,
  fuelPrices,
}: FieldsProps & { placeLabel: string; fuelPrices: Record<FuelType, number | null> }) {
  const fuelOptions = calculatorAvailableFuels(fuelPrices).map((fuel) => ({ value: fuel, label: FUEL_LABELS[fuel] }));
  return (
    <fieldset className="calc-fieldset">
      <legend className="calc-legend">Coche de combustión</legend>
      <CalculatorSelectField
        id="calc-fuel"
        label="Combustible"
        value={state.fuel}
        options={fuelOptions}
        onChange={(fuel) => dispatch({ type: 'setFuel', fuel: fuel as FuelType })}
      />
      <CalculatorNumberField
        id="calc-consumption"
        label="Consumo (l/100 km)"
        value={state.consumption}
        error={errors.consumption}
        onChange={(value) => dispatch({ type: 'editText', field: 'consumption', value })}
      />
      <CalculatorNumberField
        id="calc-fuel-price"
        label={`Precio del combustible (€/l), media de ${placeLabel}`}
        value={state.fuelPrice}
        error={errors.fuelPrice}
        onChange={(value) => dispatch({ type: 'editText', field: 'fuelPrice', value })}
      />
    </fieldset>
  );
}

function CalculatorHomeShareField({ state, dispatch }: Pick<FieldsProps, 'state' | 'dispatch'>) {
  return (
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
          max={CALCULATOR_MAX_PERCENT}
          step={CALCULATOR_PERCENT_STEP}
          value={state.homePercent}
          onChange={(event) => dispatch({ type: 'setHomePercent', percent: Number(event.target.value) })}
        />
        <div className="range-marks" aria-hidden="true">
          <span>0 %</span>
          <span>{CALCULATOR_MAX_PERCENT} %</span>
        </div>
      </div>
    </div>
  );
}

function calculatorTariffOptions(): Array<{ value: string; label: string }> {
  return [
    ...HOME_TARIFFS.map((tariff) => ({ value: tariff, label: HOME_TARIFF_LABELS[tariff] })),
    { value: CALCULATOR_OTHER_TARIFF, label: CALCULATOR_OTHER_TARIFF_LABEL },
  ];
}

function calculatorOperatorOptions(charging: ChargingPrices): Array<{ value: string; label: string }> {
  return [
    { value: CHARGING_MARKET_ID, label: CHARGING_MARKET_LABEL },
    ...charging.operators.map((operator) => ({ value: operator.id, label: operator.name })),
  ];
}

/** Consumo, reparto casa/pública, tarifa de casa y recarga pública del coche eléctrico. */
export function ElectricFields({
  state,
  errors,
  dispatch,
  charging,
}: FieldsProps & { charging: ChargingPrices }) {
  const levelOptions = POWER_LEVELS.map((level) => ({ value: level, label: POWER_LEVEL_LABELS[level] }));
  return (
    <fieldset className="calc-fieldset">
      <legend className="calc-legend">Coche eléctrico</legend>
      <CalculatorNumberField
        id="calc-ev-consumption"
        label="Consumo (kWh/100 km)"
        value={state.evConsumption}
        error={errors.evConsumption}
        onChange={(value) => dispatch({ type: 'editText', field: 'evConsumption', value })}
      />
      <CalculatorHomeShareField state={state} dispatch={dispatch} />
      <CalculatorSelectField
        id="calc-home-tariff"
        label="Tarifa de casa"
        value={state.homeTariff}
        options={calculatorTariffOptions()}
        onChange={(tariff) => dispatch({ type: 'setHomeTariff', tariff })}
      />
      <CalculatorNumberField
        id="calc-home-price"
        label="Precio en casa (€/kWh)"
        value={state.homePrice}
        error={errors.homePrice}
        onChange={(value) => dispatch({ type: 'editHomePrice', value })}
      />
      <CalculatorSelectField
        id="calc-operator"
        label="Operador de recarga pública"
        value={state.operator}
        options={calculatorOperatorOptions(charging)}
        onChange={(operator) => dispatch({ type: 'setOperator', operator })}
      />
      <CalculatorSelectField
        id="calc-level"
        label="Potencia de recarga"
        value={state.level}
        options={levelOptions}
        onChange={(level) => dispatch({ type: 'setLevel', level: level as PowerLevel })}
      />
      <CalculatorNumberField
        id="calc-public-price"
        label="Precio de recarga pública (€/kWh)"
        value={state.publicPrice}
        error={errors.publicPrice}
        onChange={(value) => dispatch({ type: 'editText', field: 'publicPrice', value })}
      />
    </fieldset>
  );
}
