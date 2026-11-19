import type { HomeTariff, PowerLevel } from './chargingPrices';
import type { FuelType } from './fuelPrices';

export const DEFAULT_ANNUAL_KM = 15000;
export const DEFAULT_CONSUMPTION_L_100KM: Record<FuelType, number> = { gasolina95: 6.5, diesel: 5.5 };
export const DEFAULT_EV_CONSUMPTION_KWH_100KM = 17;
/** 80 % de la energía se carga en casa. */
export const DEFAULT_HOME_SHARE = 0.8;
export const DEFAULT_HOME_TARIFF: HomeTariff = 'tarifa_unica';
export const DEFAULT_PUBLIC_LEVEL: PowerLevel = 'dc_150';
/** Rendimiento de la recarga: parte de la energía que paga el usuario llega a la batería. */
export const CHARGING_EFFICIENCY = 0.9;

export interface CombustionInput {
  consumptionLitresPer100Km: number;
  pricePerLitre: number;
  annualKm: number;
}

export interface ElectricInput {
  /** Consumo del ordenador de a bordo (energía que sale de la batería). */
  consumptionKwhPer100Km: number;
  /** Parte de la energía cargada en casa, de 0 a 1. */
  homeShare: number;
  homePricePerKwh: number;
  publicPricePerKwh: number;
  annualKm: number;
}

/** Importes en euros sin redondear. */
export interface CostResult {
  per100Km: number;
  perKm: number;
  annual: number;
}

export interface Comparison {
  combustion: CostResult;
  electric: CostResult;
  /** combustion.annual - electric.annual (negativo si el eléctrico sale más caro). */
  annualSavings: number;
  cheaper: 'electric' | 'combustion' | 'equal';
}

const COST_KM_PER_BLOCK = 100;
/** Diferencia anual (€) por debajo de la cual se consideran iguales. */
const COST_EQUALITY_THRESHOLD_EUROS = 0.005;

function costRequirePositive(value: number, message: string): void {
  if (!Number.isFinite(value) || value <= 0) {
    throw new RangeError(message);
  }
}

function costRequireAnnualKm(annualKm: number): void {
  if (!Number.isFinite(annualKm) || annualKm < 0) {
    throw new RangeError('Los kilómetros al año deben ser un número igual o mayor que 0.');
  }
}

function costRequireHomeShare(homeShare: number): void {
  if (!Number.isFinite(homeShare) || homeShare < 0 || homeShare > 1) {
    throw new RangeError('La parte de carga en casa debe ser un número entre 0 y 1.');
  }
}

function costBuildResult(per100Km: number, annualKm: number): CostResult {
  return {
    per100Km,
    perKm: per100Km / COST_KM_PER_BLOCK,
    annual: (per100Km * annualKm) / COST_KM_PER_BLOCK,
  };
}

export function combustionCost(input: CombustionInput): CostResult {
  costRequirePositive(input.consumptionLitresPer100Km, 'El consumo de combustible debe ser un número mayor que 0.');
  costRequirePositive(input.pricePerLitre, 'El precio del combustible debe ser un número mayor que 0.');
  costRequireAnnualKm(input.annualKm);
  return costBuildResult(input.consumptionLitresPer100Km * input.pricePerLitre, input.annualKm);
}

/** Precio medio de la energía: homeShare * casa + (1 - homeShare) * pública. */
export function blendedPricePerKwh(
  homeShare: number,
  homePricePerKwh: number,
  publicPricePerKwh: number,
): number {
  costRequireHomeShare(homeShare);
  costRequirePositive(homePricePerKwh, 'El precio de la electricidad en casa debe ser un número mayor que 0.');
  costRequirePositive(publicPricePerKwh, 'El precio de la recarga pública debe ser un número mayor que 0.');
  return homeShare * homePricePerKwh + (1 - homeShare) * publicPricePerKwh;
}

/** per100Km = consumo / CHARGING_EFFICIENCY * precio medio. */
export function electricCost(input: ElectricInput): CostResult {
  costRequirePositive(input.consumptionKwhPer100Km, 'El consumo eléctrico debe ser un número mayor que 0.');
  costRequireAnnualKm(input.annualKm);
  const price = blendedPricePerKwh(input.homeShare, input.homePricePerKwh, input.publicPricePerKwh);
  return costBuildResult((input.consumptionKwhPer100Km / CHARGING_EFFICIENCY) * price, input.annualKm);
}

function costCheaper(annualSavings: number): Comparison['cheaper'] {
  if (Math.abs(annualSavings) < COST_EQUALITY_THRESHOLD_EUROS) return 'equal';
  return annualSavings > 0 ? 'electric' : 'combustion';
}

export function compareCosts(combustion: CombustionInput, electric: ElectricInput): Comparison {
  const combustionResult = combustionCost(combustion);
  const electricResult = electricCost(electric);
  const annualSavings = combustionResult.annual - electricResult.annual;
  return {
    combustion: combustionResult,
    electric: electricResult,
    annualSavings,
    cheaper: costCheaper(annualSavings),
  };
}
