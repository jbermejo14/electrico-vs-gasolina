export type FuelType = 'gasolina95' | 'diesel';

export interface FuelAverage {
  /** €/l, media aritmética redondeada a 3 decimales. */
  average: number;
  /** Estaciones con precio válido que entran en la media. */
  stations: number;
}

export interface ProvinceFuelPrices {
  /** Slug de MITECO tal cual; sirve para enlazar a la web de gasolineras. */
  slug: string;
  /** Slug de las URL de esta web, derivado del nombre con `provincePageSlug`. */
  pageSlug: string;
  name: string;
  gasolina95: FuelAverage | null;
  diesel: FuelAverage | null;
}

export interface FuelPriceSummary {
  source: string;
  sourceUrl: string;
  mitecoDate: string;
  national: Record<FuelType, FuelAverage>;
  provinces: ProvinceFuelPrices[];
}

export interface SummaryReport {
  summary: FuelPriceSummary;
  discardedPrices: number;
}

export const FUEL_TYPES: readonly FuelType[] = ['gasolina95', 'diesel'];
export const FUEL_LABELS: Record<FuelType, string> = {
  gasolina95: 'Gasolina 95',
  diesel: 'Diésel',
};
/** €/l; por debajo es un error del dato. */
export const MIN_VALID_PRICE = 0.5;
/** €/l; por encima es un error del dato. */
export const MAX_VALID_PRICE = 4;
/** Umbral de estaciones para publicar la media de una provincia. */
export const MIN_STATIONS_FOR_AVERAGE = 10;

const FUEL_SOURCE = 'Ministerio para la Transición Ecológica y el Reto Demográfico (MITECO)';
const FUEL_SOURCE_URL =
  'https://sedeaplicaciones.minetur.gob.es/ServiciosRESTCarburantes/PreciosCarburantes/';
const THOUSANDTHS_PER_EURO = 1000;
const SPANISH_LOCALE = 'es';
const PAGE_SLUG_NAME_SEPARATOR = '/';
const PAGE_SLUG_JOINER = '-';
const PAGE_SLUG_DIACRITICS = /[\u0300-\u036f]/g;
const PAGE_SLUG_INVALID_CHARACTERS = /[^a-z0-9]+/g;
const PAGE_SLUG_EDGE_HYPHENS = /^-+|-+$/g;

/** Acumulador en milésimas de euro (enteros) para evitar errores de coma flotante. */
interface FuelPricesAccumulator {
  sumThousandths: number;
  stations: number;
}

type FuelPricesTotals = Record<FuelType, FuelPricesAccumulator>;

interface FuelPricesProvinceAccumulator {
  slug: string;
  name: string;
  totals: FuelPricesTotals;
}

function fuelPricesNewTotals(): FuelPricesTotals {
  return {
    gasolina95: { sumThousandths: 0, stations: 0 },
    diesel: { sumThousandths: 0, stations: 0 },
  };
}

function fuelPricesIsRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function fuelPricesIsNonEmptyText(value: unknown): value is string {
  return typeof value === 'string' && value.trim() !== '';
}

function fuelPricesIsValidPrice(value: unknown): value is number {
  return (
    typeof value === 'number' &&
    Number.isFinite(value) &&
    value >= MIN_VALID_PRICE &&
    value <= MAX_VALID_PRICE
  );
}

function fuelPricesToAverage(total: FuelPricesAccumulator): FuelAverage {
  return {
    average: Math.round(total.sumThousandths / total.stations) / THOUSANDTHS_PER_EURO,
    stations: total.stations,
  };
}

function fuelPricesPublishable(total: FuelPricesAccumulator): FuelAverage | null {
  return total.stations >= MIN_STATIONS_FOR_AVERAGE ? fuelPricesToAverage(total) : null;
}

function fuelPricesAdd(total: FuelPricesAccumulator, price: number): void {
  // Los precios de MITECO vienen con 3 decimales, así que el redondeo a milésimas no los altera.
  // Si algún día llegaran con más, se redondean aquí, antes de promediar, para sumar enteros exactos.
  total.sumThousandths += Math.round(price * THOUSANDTHS_PER_EURO);
  total.stations += 1;
}

/** Suma los precios de una estación; devuelve cuántos se descartaron. */
function fuelPricesAddStation(
  prices: unknown,
  national: FuelPricesTotals,
  province: FuelPricesTotals,
): number {
  const source = fuelPricesIsRecord(prices) ? prices : {};
  let discarded = 0;
  for (const fuel of FUEL_TYPES) {
    const price = source[fuel];
    // null o ausente: la estación no vende ese combustible, no es un descarte.
    if (price === null || price === undefined) continue;
    if (!fuelPricesIsValidPrice(price)) {
      discarded += 1;
      continue;
    }
    fuelPricesAdd(national[fuel], price);
    fuelPricesAdd(province[fuel], price);
  }
  return discarded;
}

function fuelPricesCheckPayload(payload: unknown): { mitecoDate: string; stations: unknown[] } {
  if (!fuelPricesIsRecord(payload) || !fuelPricesIsNonEmptyText(payload.fechaMiteco)) {
    throw new Error('El listado de estaciones no tiene fechaMiteco.');
  }
  if (!Array.isArray(payload.estaciones)) {
    throw new Error('El listado de estaciones no tiene un array estaciones.');
  }
  return { mitecoDate: payload.fechaMiteco, stations: payload.estaciones };
}

function fuelPricesHasProvince(
  station: unknown,
): station is { provinciaSlug: string; provincia: string; precios?: unknown } {
  return (
    fuelPricesIsRecord(station) &&
    fuelPricesIsNonEmptyText(station.provinciaSlug) &&
    fuelPricesIsNonEmptyText(station.provincia)
  );
}

function fuelPricesSlugify(text: string): string {
  return text
    .normalize('NFD')
    .replace(PAGE_SLUG_DIACRITICS, '')
    .toLowerCase()
    .replace(PAGE_SLUG_INVALID_CHARACTERS, PAGE_SLUG_JOINER)
    .replace(PAGE_SLUG_EDGE_HYPHENS, '');
}

/**
 * Slug de URL a partir del nombre legible: minúsculas, sin tildes ni diacríticos,
 * guiones entre palabras. Si el nombre tiene "/" ("Castellón / Castelló") se unen las mitades
 * distintas; si dan el mismo slug ("Valencia / València") queda una sola.
 */
export function provincePageSlug(name: string): string {
  const parts = name.split(PAGE_SLUG_NAME_SEPARATOR).map(fuelPricesSlugify).filter((part) => part !== '');
  return [...new Set(parts)].join(PAGE_SLUG_JOINER);
}

function fuelPricesToProvince(province: FuelPricesProvinceAccumulator): ProvinceFuelPrices {
  return {
    slug: province.slug,
    pageSlug: provincePageSlug(province.name),
    name: province.name,
    gasolina95: fuelPricesPublishable(province.totals.gasolina95),
    diesel: fuelPricesPublishable(province.totals.diesel),
  };
}

/** Lanza Error si un nombre no produce slug de página o si dos provincias producen el mismo. */
function fuelPricesCheckPageSlugs(provinces: ProvinceFuelPrices[]): void {
  const namesBySlug = new Map<string, string>();
  for (const province of provinces) {
    if (province.pageSlug === '') {
      throw new Error(`La provincia "${province.name}" no produce un slug de página válido.`);
    }
    const previous = namesBySlug.get(province.pageSlug);
    if (previous !== undefined) {
      throw new Error(
        `Las provincias "${previous}" y "${province.name}" producen el mismo slug de página "${province.pageSlug}".`,
      );
    }
    namesBySlug.set(province.pageSlug, province.name);
  }
}

/** Valida la estructura y calcula las medias. Lanza Error en español si falta fechaMiteco, estaciones no es un array o dos provincias comparten pageSlug. */
export function summarizeFuelPrices(payload: unknown): SummaryReport {
  const { mitecoDate, stations } = fuelPricesCheckPayload(payload);
  const national = fuelPricesNewTotals();
  const provinces = new Map<string, FuelPricesProvinceAccumulator>();
  let discardedPrices = 0;

  for (const station of stations) {
    if (!fuelPricesHasProvince(station)) {
      discardedPrices += 1;
      continue;
    }
    let province = provinces.get(station.provinciaSlug);
    if (!province) {
      province = { slug: station.provinciaSlug, name: station.provincia, totals: fuelPricesNewTotals() };
      provinces.set(station.provinciaSlug, province);
    }
    discardedPrices += fuelPricesAddStation(station.precios, national, province.totals);
  }

  for (const fuel of FUEL_TYPES) {
    if (national[fuel].stations === 0) {
      throw new Error(`El listado de estaciones no contiene ningún precio válido de ${FUEL_LABELS[fuel]}.`);
    }
  }

  const provinceList = [...provinces.values()]
    .map(fuelPricesToProvince)
    .sort((a, b) => a.name.localeCompare(b.name, SPANISH_LOCALE));
  fuelPricesCheckPageSlugs(provinceList);

  const summary: FuelPriceSummary = {
    source: FUEL_SOURCE,
    sourceUrl: FUEL_SOURCE_URL,
    mitecoDate,
    national: {
      gasolina95: fuelPricesToAverage(national.gasolina95),
      diesel: fuelPricesToAverage(national.diesel),
    },
    provinces: provinceList,
  };
  return { summary, discardedPrices };
}

function fuelPricesParseAverage(value: unknown, field: string): FuelAverage {
  if (
    !fuelPricesIsRecord(value) ||
    typeof value.average !== 'number' ||
    !Number.isFinite(value.average) ||
    value.average <= 0 ||
    typeof value.stations !== 'number' ||
    !Number.isInteger(value.stations) ||
    value.stations <= 0
  ) {
    throw new Error(`Precios de combustible inválidos: ${field} debe tener average y stations positivos.`);
  }
  return { average: value.average, stations: value.stations };
}

function fuelPricesParseOptionalAverage(value: unknown, field: string): FuelAverage | null {
  return value === null ? null : fuelPricesParseAverage(value, field);
}

function fuelPricesParseProvince(value: unknown, index: number): ProvinceFuelPrices {
  const field = `provinces[${index}]`;
  if (
    !fuelPricesIsRecord(value) ||
    !fuelPricesIsNonEmptyText(value.slug) ||
    !fuelPricesIsNonEmptyText(value.pageSlug) ||
    !fuelPricesIsNonEmptyText(value.name)
  ) {
    throw new Error(`Precios de combustible inválidos: ${field} necesita slug, pageSlug y name.`);
  }
  return {
    slug: value.slug,
    pageSlug: value.pageSlug,
    name: value.name,
    gasolina95: fuelPricesParseOptionalAverage(value.gasolina95, `${field}.gasolina95`),
    diesel: fuelPricesParseOptionalAverage(value.diesel, `${field}.diesel`),
  };
}

function fuelPricesParseText(value: Record<string, unknown>, field: string): string {
  const text = value[field];
  if (!fuelPricesIsNonEmptyText(text)) {
    throw new Error(`Precios de combustible inválidos: falta ${field}.`);
  }
  return text;
}

/** Valida un FuelPriceSummary ya generado (al leer data/fuel-prices.json). Lanza Error si no cumple el tipo. */
export function parseFuelPriceSummary(value: unknown): FuelPriceSummary {
  if (!fuelPricesIsRecord(value)) {
    throw new Error('Precios de combustible inválidos: el contenido no es un objeto.');
  }
  if (!fuelPricesIsRecord(value.national)) {
    throw new Error('Precios de combustible inválidos: falta national.');
  }
  if (!Array.isArray(value.provinces)) {
    throw new Error('Precios de combustible inválidos: provinces debe ser un array.');
  }
  return {
    source: fuelPricesParseText(value, 'source'),
    sourceUrl: fuelPricesParseText(value, 'sourceUrl'),
    mitecoDate: fuelPricesParseText(value, 'mitecoDate'),
    national: {
      gasolina95: fuelPricesParseAverage(value.national.gasolina95, 'national.gasolina95'),
      diesel: fuelPricesParseAverage(value.national.diesel, 'national.diesel'),
    },
    provinces: value.provinces.map(fuelPricesParseProvince),
  };
}

/** Provincias con al menos una media publicable (las que tienen página). */
export function provincesWithData(summary: FuelPriceSummary): ProvinceFuelPrices[] {
  return summary.provinces.filter((province) => province.gasolina95 !== null || province.diesel !== null);
}

/** Busca una provincia por el slug de página (`pageSlug`); undefined si no existe o no tiene datos. */
export function findProvince(summary: FuelPriceSummary, pageSlug: string): ProvinceFuelPrices | undefined {
  return provincesWithData(summary).find((province) => province.pageSlug === pageSlug);
}

/**
 * Provincias con precio de gasolina 95, de la más barata a la más cara.
 * Empates por nombre. Es el orden del ranking de la web.
 */
export function rankProvincesByGasoline(provinces: ProvinceFuelPrices[]): ProvinceFuelPrices[] {
  return provinces
    .filter((province) => province.gasolina95 !== null)
    .sort((a, b) => {
      const difference = (a.gasolina95?.average ?? 0) - (b.gasolina95?.average ?? 0);
      return difference !== 0 ? difference : a.name.localeCompare(b.name, SPANISH_LOCALE);
    });
}

/** Precios medios por combustible (€/l), en el formato que reciben la calculadora y los escenarios. */
export function averagePricesOf(
  averages: Record<FuelType, FuelAverage | null>,
): Record<FuelType, number | null> {
  return {
    gasolina95: averages.gasolina95?.average ?? null,
    diesel: averages.diesel?.average ?? null,
  };
}
