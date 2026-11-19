import {
  CHARGING_MARKET_ID,
  HOME_TARIFFS,
  publicPrice,
  type ChargingPrices,
  type HomeTariff,
  type PowerLevel,
} from './chargingPrices';
import {
  DEFAULT_ANNUAL_KM,
  DEFAULT_CONSUMPTION_L_100KM,
  DEFAULT_EV_CONSUMPTION_KWH_100KM,
  DEFAULT_HOME_SHARE,
  DEFAULT_HOME_TARIFF,
  DEFAULT_PUBLIC_LEVEL,
  compareCosts,
  type Comparison,
} from './costPerKm';
import { FUEL_TYPES, type FuelType } from './fuelPrices';

/** Máximo del rango "energía cargada en casa" (y de su marca), en porcentaje. */
export const CALCULATOR_MAX_PERCENT = 100;
/** Paso del rango "energía cargada en casa", en puntos porcentuales. */
export const CALCULATOR_PERCENT_STEP = 10;
/** Valor de la tarifa de casa cuando el usuario escribe un precio propio. */
export const CALCULATOR_OTHER_TARIFF = 'other';
export const CALCULATOR_ERROR_POSITIVE = 'Introduce un número mayor que 0.';
export const CALCULATOR_ERROR_NON_NEGATIVE = 'Introduce un número igual o mayor que 0.';

export type CalculatorHomeTariff = HomeTariff | typeof CALCULATOR_OTHER_TARIFF;

/** Los campos de texto se guardan como texto para poder vaciarlos mientras se escribe. */
export interface CalculatorState {
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

export type CalculatorField = 'annualKm' | 'consumption' | 'fuelPrice' | 'evConsumption' | 'homePrice' | 'publicPrice';
export type CalculatorErrors = Partial<Record<CalculatorField, string>>;

/** Campos de texto que se editan sin efectos secundarios sobre los demás. */
export type CalculatorTextField = Exclude<CalculatorField, 'homePrice'>;

/** Datos del lugar y tarifas que la calculadora necesita para rellenar precios. */
export interface CalculatorContext {
  /** Precio medio del lugar por combustible; null si no hay dato. */
  fuelPrices: Record<FuelType, number | null>;
  charging: ChargingPrices;
}

export type CalculatorAction =
  | { type: 'editText'; field: CalculatorTextField; value: string }
  | { type: 'editHomePrice'; value: string }
  | { type: 'setFuel'; fuel: FuelType }
  | { type: 'setHomeTariff'; tariff: string }
  | { type: 'setHomePercent'; percent: number }
  | { type: 'setOperator'; operator: string }
  | { type: 'setLevel'; level: PowerLevel };

function calculatorPriceText(price: number | null): string {
  return price === null ? '' : String(price);
}

/** Combustibles con precio medio en el lugar. */
export function calculatorAvailableFuels(fuelPrices: CalculatorContext['fuelPrices']): FuelType[] {
  return FUEL_TYPES.filter((fuel) => fuelPrices[fuel] !== null);
}

/** Estado del primer render: valores por defecto y precios medios del lugar. */
export function calculatorInitialState(context: CalculatorContext): CalculatorState {
  const fuel = calculatorAvailableFuels(context.fuelPrices)[0] ?? FUEL_TYPES[0];
  return {
    annualKm: String(DEFAULT_ANNUAL_KM),
    fuel,
    consumption: String(DEFAULT_CONSUMPTION_L_100KM[fuel]),
    fuelPrice: calculatorPriceText(context.fuelPrices[fuel]),
    evConsumption: String(DEFAULT_EV_CONSUMPTION_KWH_100KM),
    homePercent: Math.round(DEFAULT_HOME_SHARE * CALCULATOR_MAX_PERCENT),
    homeTariff: DEFAULT_HOME_TARIFF,
    homePrice: String(context.charging.home[DEFAULT_HOME_TARIFF]),
    operator: CHARGING_MARKET_ID,
    level: DEFAULT_PUBLIC_LEVEL,
    publicPrice: String(publicPrice(context.charging, CHARGING_MARKET_ID, DEFAULT_PUBLIC_LEVEL)),
  };
}

/**
 * Número del campo; NaN si está vacío o no es un número.
 * Los `<input type="number">` entregan siempre el punto como separador decimal, así que no se sustituye la coma.
 */
export function calculatorParse(text: string): number {
  if (text.trim() === '') return Number.NaN;
  return Number(text.trim());
}

function calculatorIsPositive(value: number): boolean {
  return Number.isFinite(value) && value > 0;
}

/** Errores por campo; objeto vacío si todas las entradas son válidas. Nunca lanza. */
export function calculatorValidate(state: CalculatorState): CalculatorErrors {
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

/** Comparación de costes, o null si alguna entrada no es válida. Nunca lanza. */
export function calculatorCompare(state: CalculatorState): Comparison | null {
  if (Object.keys(calculatorValidate(state)).length > 0) return null;
  const annualKm = calculatorParse(state.annualKm);
  return compareCosts(
    {
      consumptionLitresPer100Km: calculatorParse(state.consumption),
      pricePerLitre: calculatorParse(state.fuelPrice),
      annualKm,
    },
    {
      consumptionKwhPer100Km: calculatorParse(state.evConsumption),
      homeShare: state.homePercent / CALCULATOR_MAX_PERCENT,
      homePricePerKwh: calculatorParse(state.homePrice),
      publicPricePerKwh: calculatorParse(state.publicPrice),
      annualKm,
    },
  );
}

function calculatorKnowsOperator(charging: ChargingPrices, operator: string): boolean {
  return operator === CHARGING_MARKET_ID || charging.operators.some((candidate) => candidate.id === operator);
}

function calculatorSetFuel(state: CalculatorState, fuel: FuelType, context: CalculatorContext): CalculatorState {
  if (!FUEL_TYPES.includes(fuel)) return state;
  return {
    ...state,
    fuel,
    consumption: String(DEFAULT_CONSUMPTION_L_100KM[fuel]),
    fuelPrice: calculatorPriceText(context.fuelPrices[fuel]),
  };
}

function calculatorSetHomeTariff(state: CalculatorState, tariff: string, context: CalculatorContext): CalculatorState {
  if (tariff === CALCULATOR_OTHER_TARIFF) return { ...state, homeTariff: CALCULATOR_OTHER_TARIFF };
  const known = HOME_TARIFFS.find((candidate) => candidate === tariff);
  if (known === undefined) return state;
  return { ...state, homeTariff: known, homePrice: String(context.charging.home[known]) };
}

function calculatorSetPublicPrice(
  state: CalculatorState,
  operator: string,
  level: PowerLevel,
  context: CalculatorContext,
): CalculatorState {
  if (!calculatorKnowsOperator(context.charging, operator)) return state;
  return { ...state, operator, level, publicPrice: String(publicPrice(context.charging, operator, level)) };
}

function calculatorSetHomePercent(state: CalculatorState, percent: number): CalculatorState {
  if (!Number.isFinite(percent)) return state;
  return { ...state, homePercent: Math.min(CALCULATOR_MAX_PERCENT, Math.max(0, percent)) };
}

/** Transición de estado de la calculadora. Pura: no lanza ni muta el estado recibido. */
export function calculatorReduce(
  state: CalculatorState,
  action: CalculatorAction,
  context: CalculatorContext,
): CalculatorState {
  switch (action.type) {
    case 'editText':
      return { ...state, [action.field]: action.value };
    case 'editHomePrice':
      // Escribir un precio propio deja de ser una de las tarifas de referencia.
      return { ...state, homePrice: action.value, homeTariff: CALCULATOR_OTHER_TARIFF };
    case 'setFuel':
      return calculatorSetFuel(state, action.fuel, context);
    case 'setHomeTariff':
      return calculatorSetHomeTariff(state, action.tariff, context);
    case 'setHomePercent':
      return calculatorSetHomePercent(state, action.percent);
    case 'setOperator':
      return calculatorSetPublicPrice(state, action.operator, state.level, context);
    case 'setLevel':
      return calculatorSetPublicPrice(state, state.operator, action.level, context);
  }
}
