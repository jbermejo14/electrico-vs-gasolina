import { formatUpdatedAt } from './chargingPrices';
import type { Comparison } from './costPerKm';

const FORMAT_LOCALE = 'es-ES';
/** Espacio duro: evita que la cifra y su unidad queden en líneas distintas. */
const FORMAT_NBSP = ' ';
const FORMAT_DEFAULT_EURO_DECIMALS = 2;
const FORMAT_PRICE_PER_LITRE_DECIMALS = 3;
const FORMAT_PRICE_PER_KWH_DECIMALS = 2;
const FORMAT_PERCENT_FACTOR = 100;
/** "18/11/2026 18:03:47": día, mes y año de la fecha de MITECO. */
const FORMAT_MITECO_DATE_PATTERN = /^(\d{2})\/(\d{2})\/(\d{4})/;
const FORMAT_MONTH_PAD_LENGTH = 2;
const FORMAT_DAY_PAD_LENGTH = 2;
const FORMAT_ANNUAL_DECIMALS = 0;

const formatterByDecimals = new Map<number, Intl.NumberFormat>();

function formatNumber(value: number, decimals: number): string {
  let formatter = formatterByDecimals.get(decimals);
  if (!formatter) {
    // 'always' agrupa también los miles de cuatro cifras ("1.234"), que es-ES omite por defecto.
    formatter = new Intl.NumberFormat(FORMAT_LOCALE, {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
      useGrouping: 'always',
    });
    formatterByDecimals.set(decimals, formatter);
  }
  return formatter.format(value);
}

const FORMAT_MAX_FREE_DECIMALS = 2;

/** Número con coma decimal y solo los decimales necesarios (hasta dos): 6.5 se escribe "6,5", 17 se escribe "17". */
export function formatDecimal(value: number): string {
  return new Intl.NumberFormat(FORMAT_LOCALE, { maximumFractionDigits: FORMAT_MAX_FREE_DECIMALS }).format(value);
}

/** "9,75 €" (con espacio duro antes del símbolo). */
export function formatEuros(value: number, decimals: number = FORMAT_DEFAULT_EURO_DECIMALS): string {
  return `${formatNumber(value, decimals)}${FORMAT_NBSP}€`;
}

/** "1,523 €/l". */
export function formatPricePerLitre(value: number): string {
  return `${formatNumber(value, FORMAT_PRICE_PER_LITRE_DECIMALS)}${FORMAT_NBSP}€/l`;
}

/** "0,18 €/kWh". */
export function formatPricePerKwh(value: number): string {
  return `${formatNumber(value, FORMAT_PRICE_PER_KWH_DECIMALS)}${FORMAT_NBSP}€/kWh`;
}

/** "80 %" a partir de una proporción de 0 a 1. */
export function formatPercent(share: number): string {
  return `${formatNumber(share * FORMAT_PERCENT_FACTOR, 0)}${FORMAT_NBSP}%`;
}

/** "15.000 km". */
export function formatKm(kilometres: number): string {
  return `${formatNumber(kilometres, 0)}${FORMAT_NBSP}km`;
}

function formatParseMitecoDate(mitecoDate: string): { day: number; month: number; year: number } {
  const match = FORMAT_MITECO_DATE_PATTERN.exec(mitecoDate);
  if (!match) {
    throw new Error(`Fecha de MITECO inválida "${mitecoDate}": se esperaba el formato dd/mm/aaaa.`);
  }
  return { day: Number(match[1]), month: Number(match[2]), year: Number(match[3]) };
}

/** "noviembre de 2026" a partir de la fecha de MITECO "18/11/2026 18:03:47". */
export function formatMitecoMonth(mitecoDate: string): string {
  const { month, year } = formatParseMitecoDate(mitecoDate);
  return formatUpdatedAt(`${year}-${String(month).padStart(FORMAT_MONTH_PAD_LENGTH, '0')}`);
}

/** Fecha (UTC, sin hora) de la fecha de MITECO; sirve de `lastModified` del sitemap. */
export function mitecoDateToDate(mitecoDate: string): Date {
  const { day, month, year } = formatParseMitecoDate(mitecoDate);
  return new Date(Date.UTC(year, month - 1, day));
}

/** "18/11/2026" (sin hora) a partir de la fecha de MITECO "18/11/2026 18:03:47". */
export function formatMitecoDay(mitecoDate: string): string {
  const { day, month, year } = formatParseMitecoDate(mitecoDate);
  const pad = (value: number, length: number) => String(value).padStart(length, '0');
  return `${pad(day, FORMAT_DAY_PAD_LENGTH)}/${pad(month, FORMAT_MONTH_PAD_LENGTH)}/${year}`;
}

/**
 * Frase de ahorro anual de una comparación. Usa `comparison.cheaper` (el mismo umbral de
 * igualdad que la calculadora) para no contradecirse con ella.
 */
export function formatAnnualSavings(comparison: Comparison): string {
  const amount = formatEuros(Math.abs(comparison.annualSavings), FORMAT_ANNUAL_DECIMALS);
  if (comparison.cheaper === 'electric') return `El eléctrico te ahorra ${amount} al año`;
  if (comparison.cheaper === 'combustion') return `El eléctrico te cuesta ${amount} más al año`;
  return 'El coste anual de los dos es prácticamente igual';
}
