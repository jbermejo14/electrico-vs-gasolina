import chargingData from '@/data/charging-prices.json';

export type PowerLevel = 'ac_22' | 'dc_50' | 'dc_150' | 'hpc_150_plus';
export type HomeTariff = 'pvpc_valle' | 'tarifa_ve_nocturna' | 'tarifa_unica';
/** €/kWh por nivel de potencia. */
export type PriceByLevel = Record<PowerLevel, number>;

export interface ChargingPrices {
  /** Mes de la recopilación, "2026-11". */
  updatedAt: string;
  /** Orden alfabético por nombre. */
  operators: Array<{ id: string; name: string; prices: PriceByLevel }>;
  marketDefault: PriceByLevel;
  home: Record<HomeTariff, number>;
}

export const POWER_LEVELS: readonly PowerLevel[] = ['ac_22', 'dc_50', 'dc_150', 'hpc_150_plus'];
export const POWER_LEVEL_LABELS: Record<PowerLevel, string> = {
  ac_22: 'Alterna hasta 22 kW',
  dc_50: 'Rápida 50 kW',
  dc_150: 'Rápida 150 kW',
  hpc_150_plus: 'Ultrarrápida de más de 150 kW',
};
export const HOME_TARIFFS: readonly HomeTariff[] = ['pvpc_valle', 'tarifa_ve_nocturna', 'tarifa_unica'];
export const HOME_TARIFF_LABELS: Record<HomeTariff, string> = {
  pvpc_valle: 'PVPC en horas valle',
  tarifa_ve_nocturna: 'Tarifa nocturna para coche eléctrico',
  tarifa_unica: 'Tarifa de precio único',
};
export const OPERATOR_NAMES: Record<string, string> = {
  iberdrola: 'Iberdrola',
  endesa: 'Endesa X Way',
  repsol: 'Repsol',
  zunder: 'Zunder',
  wenea: 'Wenea',
  acciona: 'Acciona',
  tesla: 'Tesla',
  ionity: 'Ionity',
  edp: 'EDP',
  electra: 'Electra',
  fastned: 'Fastned',
  totalenergies: 'TotalEnergies',
  emovili: 'Emovili',
};
/** €/kWh; por encima es un error del dato. */
export const MAX_VALID_KWH_PRICE = 2;

/** Identificador reservado para el precio medio de mercado: ningún operador del fichero puede usarlo. */
export const CHARGING_MARKET_ID = 'market';
/** Etiqueta visible de la media del mercado. */
export const CHARGING_MARKET_LABEL = 'Media del mercado';
const CHARGING_SPANISH_LOCALE = 'es';
const CHARGING_UPDATED_AT_PATTERN = /^(\d{4})-(0[1-9]|1[0-2])$/;
const CHARGING_MONTH_NAMES = [
  'enero',
  'febrero',
  'marzo',
  'abril',
  'mayo',
  'junio',
  'julio',
  'agosto',
  'septiembre',
  'octubre',
  'noviembre',
  'diciembre',
];

function chargingIsRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function chargingRequireRecord(value: unknown, field: string): Record<string, unknown> {
  if (!chargingIsRecord(value)) {
    throw new Error(`Tarifas de recarga inválidas: ${field} debe ser un objeto.`);
  }
  return value;
}

function chargingParsePrice(value: unknown, field: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0 || value > MAX_VALID_KWH_PRICE) {
    throw new Error(
      `Tarifas de recarga inválidas: ${field} debe ser un número mayor que 0 y no superior a ${MAX_VALID_KWH_PRICE} €/kWh.`,
    );
  }
  return value;
}

function chargingParseLevels(value: unknown, field: string): PriceByLevel {
  const record = chargingRequireRecord(value, field);
  const prices = {} as PriceByLevel;
  for (const level of POWER_LEVELS) {
    prices[level] = chargingParsePrice(record[level], `${field}.${level}`);
  }
  return prices;
}

function chargingParseOperators(value: unknown): ChargingPrices['operators'] {
  const record = chargingRequireRecord(value, 'operators');
  return Object.entries(record)
    .map(([id, prices]) => {
      if (id === CHARGING_MARKET_ID) {
        throw new Error(`Tarifas de recarga inválidas: operators.${id} usa el identificador reservado de la media del mercado.`);
      }
      const name = OPERATOR_NAMES[id];
      if (name === undefined) {
        throw new Error(`Tarifas de recarga inválidas: operators.${id} no tiene nombre en OPERATOR_NAMES.`);
      }
      return { id, name, prices: chargingParseLevels(prices, `operators.${id}`) };
    })
    .sort((a, b) => a.name.localeCompare(b.name, CHARGING_SPANISH_LOCALE));
}

function chargingParseHome(value: unknown): Record<HomeTariff, number> {
  const record = chargingRequireRecord(value, 'home_charging_reference');
  const home = {} as Record<HomeTariff, number>;
  for (const tariff of HOME_TARIFFS) {
    home[tariff] = chargingParsePrice(record[tariff], `home_charging_reference.${tariff}`);
  }
  return home;
}

/** Valida el JSON crudo. Lanza Error en español que nombra el campo erróneo (operador sin nombre en OPERATOR_NAMES, nivel ausente, precio <= 0 o > MAX_VALID_KWH_PRICE). */
export function parseChargingPrices(raw: unknown): ChargingPrices {
  const record = chargingRequireRecord(raw, 'el fichero');
  if (typeof record.updated_at !== 'string' || !CHARGING_UPDATED_AT_PATTERN.test(record.updated_at)) {
    throw new Error('Tarifas de recarga inválidas: updated_at debe tener el formato AAAA-MM.');
  }
  return {
    updatedAt: record.updated_at,
    operators: chargingParseOperators(record.operators),
    marketDefault: chargingParseLevels(record.default_fallback, 'default_fallback'),
    home: chargingParseHome(record.home_charging_reference),
  };
}

/** Las tarifas del fichero del proyecto, ya validadas (importa data/charging-prices.json). */
export function getChargingPrices(): ChargingPrices {
  return parseChargingPrices(chargingData);
}

/** Precio público de un operador y nivel; operatorId 'market' devuelve marketDefault. Lanza Error si el operador no existe. */
export function publicPrice(prices: ChargingPrices, operatorId: string, level: PowerLevel): number {
  if (operatorId === CHARGING_MARKET_ID) {
    return prices.marketDefault[level];
  }
  const operator = prices.operators.find((candidate) => candidate.id === operatorId);
  if (!operator) {
    throw new Error(`No existe el operador de recarga "${operatorId}".`);
  }
  return operator.prices[level];
}

/** Texto "noviembre de 2026" a partir de updatedAt "2026-11". */
export function formatUpdatedAt(updatedAt: string): string {
  const match = CHARGING_UPDATED_AT_PATTERN.exec(updatedAt);
  if (!match) {
    throw new Error(`Fecha de actualización inválida "${updatedAt}": se esperaba el formato AAAA-MM.`);
  }
  return `${CHARGING_MONTH_NAMES[Number(match[2]) - 1]} de ${match[1]}`;
}
