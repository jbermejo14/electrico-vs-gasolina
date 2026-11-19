import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  CALCULATOR_ERROR_NON_NEGATIVE,
  CALCULATOR_ERROR_POSITIVE,
  CALCULATOR_MAX_PERCENT,
  CALCULATOR_OTHER_TARIFF,
  calculatorCompare,
  calculatorInitialState,
  calculatorParse,
  calculatorReduce,
  calculatorValidate,
  type CalculatorAction,
  type CalculatorContext,
  type CalculatorState,
} from '../lib/calculatorState';
import { CHARGING_MARKET_ID, getChargingPrices, publicPrice } from '../lib/chargingPrices';

const GASOLINE_PRICE = 1.5;
const DIESEL_PRICE = 1.7;
const CONTEXT: CalculatorContext = {
  fuelPrices: { gasolina95: GASOLINE_PRICE, diesel: DIESEL_PRICE },
  charging: getChargingPrices(),
};
const ONLY_GASOLINE: CalculatorContext = { ...CONTEXT, fuelPrices: { gasolina95: GASOLINE_PRICE, diesel: null } };
const EXPECTED_HOME_PRICE = 0.18;
const EXPECTED_PVPC_PRICE = 0.1;

function initialState(): CalculatorState {
  return calculatorInitialState(CONTEXT);
}

/** Aplica la acción sobre una copia congelada: si el reductor mutara el estado, la prueba fallaría. */
function reduce(state: CalculatorState, action: CalculatorAction, context: CalculatorContext = CONTEXT): CalculatorState {
  return calculatorReduce(Object.freeze({ ...state }), action, context);
}

test('estado inicial: valores por defecto y precios medios del lugar', () => {
  const state = initialState();
  assert.equal(state.annualKm, '15000');
  assert.equal(state.fuel, 'gasolina95');
  assert.equal(state.consumption, '6.5');
  assert.equal(state.fuelPrice, String(GASOLINE_PRICE));
  assert.equal(state.homePercent, 80);
  assert.equal(state.homeTariff, 'tarifa_unica');
  assert.equal(state.homePrice, String(EXPECTED_HOME_PRICE));
  assert.equal(state.operator, CHARGING_MARKET_ID);
  assert.deepEqual(calculatorValidate(state), {});
});

test('estado inicial: sin gasolina 95 arranca con el combustible que tenga precio', () => {
  const state = calculatorInitialState({ ...CONTEXT, fuelPrices: { gasolina95: null, diesel: DIESEL_PRICE } });
  assert.equal(state.fuel, 'diesel');
  assert.equal(state.fuelPrice, String(DIESEL_PRICE));
});

test('calculatorParse: vacío, espacios y texto dan NaN; Infinity se conserva para que la validación lo rechace', () => {
  assert.ok(Number.isNaN(calculatorParse('')));
  assert.ok(Number.isNaN(calculatorParse('   ')));
  assert.ok(Number.isNaN(calculatorParse('abc')));
  assert.equal(calculatorParse(' 1.5 '), 1.5);
  assert.equal(calculatorParse('Infinity'), Number.POSITIVE_INFINITY);
});

test('validación: vacío, negativo e infinito marcan el campo y nunca lanzan', () => {
  for (const invalid of ['', '-1', '0', 'Infinity', '-Infinity', 'abc']) {
    const errors = calculatorValidate({
      ...initialState(),
      consumption: invalid,
      fuelPrice: invalid,
      evConsumption: invalid,
      homePrice: invalid,
      publicPrice: invalid,
    });
    assert.deepEqual(Object.keys(errors).sort(), ['consumption', 'evConsumption', 'fuelPrice', 'homePrice', 'publicPrice']);
    assert.ok(Object.values(errors).every((message) => message === CALCULATOR_ERROR_POSITIVE), invalid);
  }
});

test('validación de kilómetros: 0 vale, negativo, vacío e infinito no', () => {
  assert.deepEqual(calculatorValidate({ ...initialState(), annualKm: '0' }), {});
  for (const invalid of ['', '-1', 'Infinity']) {
    assert.deepEqual(calculatorValidate({ ...initialState(), annualKm: invalid }), {
      annualKm: CALCULATOR_ERROR_NON_NEGATIVE,
    });
  }
});

test('comparación: null con entradas inválidas y coste anual 0 con annualKm = 0', () => {
  assert.equal(calculatorCompare({ ...initialState(), fuelPrice: '' }), null);
  assert.equal(calculatorCompare({ ...initialState(), annualKm: 'Infinity' }), null);
  const zeroKm = calculatorCompare({ ...initialState(), annualKm: '0' });
  assert.equal(zeroKm?.combustion.annual, 0);
  assert.equal(zeroKm?.electric.annual, 0);
  assert.equal(zeroKm?.cheaper, 'equal');
});

test('comparación: con los valores por defecto gana el eléctrico y la combustión cuesta 9,75 EUR/100 km', () => {
  const comparison = calculatorCompare(initialState());
  assert.ok(comparison);
  assert.ok(Math.abs(comparison.combustion.per100Km - 9.75) < 1e-9);
  assert.equal(comparison.cheaper, 'electric');
});

test('cambio de combustible: rellena consumo y precio del nuevo combustible', () => {
  const diesel = reduce(initialState(), { type: 'setFuel', fuel: 'diesel' });
  assert.equal(diesel.fuel, 'diesel');
  assert.equal(diesel.consumption, '5.5');
  assert.equal(diesel.fuelPrice, String(DIESEL_PRICE));
});

test('cambio de combustible: sin precio medio deja el precio vacío y la validación lo marca', () => {
  const diesel = reduce(initialState(), { type: 'setFuel', fuel: 'diesel' }, ONLY_GASOLINE);
  assert.equal(diesel.fuelPrice, '');
  assert.equal(calculatorValidate(diesel).fuelPrice, CALCULATOR_ERROR_POSITIVE);
  assert.equal(calculatorCompare(diesel), null);
});

test('cambio de combustible desconocido: no cambia el estado', () => {
  const state = initialState();
  const unchanged = reduce(state, { type: 'setFuel', fuel: 'hidrogeno' as never });
  assert.deepEqual(unchanged, state);
});

test('cambio de tarifa de casa: rellena el precio; "Otra tarifa" lo conserva; una desconocida se ignora', () => {
  const pvpc = reduce(initialState(), { type: 'setHomeTariff', tariff: 'pvpc_valle' });
  assert.equal(pvpc.homeTariff, 'pvpc_valle');
  assert.equal(pvpc.homePrice, String(EXPECTED_PVPC_PRICE));
  const other = reduce(pvpc, { type: 'setHomeTariff', tariff: CALCULATOR_OTHER_TARIFF });
  assert.equal(other.homeTariff, CALCULATOR_OTHER_TARIFF);
  assert.equal(other.homePrice, pvpc.homePrice);
  assert.deepEqual(reduce(pvpc, { type: 'setHomeTariff', tariff: 'constructor' }), pvpc);
});

test('escribir un precio de casa pasa la tarifa a "Otra tarifa"', () => {
  const edited = reduce(initialState(), { type: 'editHomePrice', value: '0.25' });
  assert.equal(edited.homePrice, '0.25');
  assert.equal(edited.homeTariff, CALCULATOR_OTHER_TARIFF);
});

test('cambio de operador y de nivel: recalculan el precio público', () => {
  const tesla = reduce(initialState(), { type: 'setOperator', operator: 'tesla' });
  assert.equal(tesla.operator, 'tesla');
  assert.equal(tesla.publicPrice, String(publicPrice(CONTEXT.charging, 'tesla', tesla.level)));
  const slow = reduce(tesla, { type: 'setLevel', level: 'ac_22' });
  assert.equal(slow.level, 'ac_22');
  assert.equal(slow.publicPrice, String(publicPrice(CONTEXT.charging, 'tesla', 'ac_22')));
  const market = reduce(slow, { type: 'setOperator', operator: CHARGING_MARKET_ID });
  assert.equal(market.publicPrice, String(publicPrice(CONTEXT.charging, CHARGING_MARKET_ID, 'ac_22')));
});

test('un operador desconocido no lanza y no cambia el estado', () => {
  const state = initialState();
  assert.deepEqual(reduce(state, { type: 'setOperator', operator: 'nadie' }), state);
});

test('porcentaje en casa: se limita a 0..CALCULATOR_MAX_PERCENT y se ignora si no es finito', () => {
  assert.equal(CALCULATOR_MAX_PERCENT, 100);
  const state = initialState();
  assert.equal(reduce(state, { type: 'setHomePercent', percent: 150 }).homePercent, CALCULATOR_MAX_PERCENT);
  assert.equal(reduce(state, { type: 'setHomePercent', percent: -5 }).homePercent, 0);
  assert.equal(reduce(state, { type: 'setHomePercent', percent: 30 }).homePercent, 30);
  assert.equal(reduce(state, { type: 'setHomePercent', percent: Number.NaN }).homePercent, state.homePercent);
});

test('edición de texto: cambia solo el campo indicado', () => {
  const state = initialState();
  const edited = reduce(state, { type: 'editText', field: 'annualKm', value: '' });
  assert.deepEqual({ ...edited, annualKm: state.annualKm }, state);
  assert.equal(edited.annualKm, '');
});
