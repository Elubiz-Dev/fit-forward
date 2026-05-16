import { MassUnit, VolumeUnit, LengthUnit, EnergyUnit, TempUnit } from '../store/types';

// Mass conversions (base: kg)
const MASS_CONVERSIONS: Record<MassUnit, number> = {
  kg: 1,
  g: 1000,
  lb: 2.20462,
};

export const convertMass = (value: number, from: MassUnit, to: MassUnit): number => {
  if (from === to) return value;
  const inKg = value / MASS_CONVERSIONS[from];
  return inKg * MASS_CONVERSIONS[to];
};

// Volume conversions (base: ml)
const VOLUME_CONVERSIONS: Record<VolumeUnit, number> = {
  ml: 1,
  l: 0.001,
  oz: 0.033814,
};

export const convertVolume = (value: number, from: VolumeUnit, to: VolumeUnit): number => {
  if (from === to) return value;
  const inMl = value / VOLUME_CONVERSIONS[from];
  return inMl * VOLUME_CONVERSIONS[to];
};

// Length conversions (base: cm)
const LENGTH_CONVERSIONS: Record<LengthUnit, number> = {
  cm: 1,
  m: 0.01,
  in: 0.393701,
  ft: 0.0328084,
};

export const convertLength = (value: number, from: LengthUnit, to: LengthUnit): number => {
  if (from === to) return value;
  const inCm = value / LENGTH_CONVERSIONS[from];
  return inCm * LENGTH_CONVERSIONS[to];
};

// Energy conversions (base: kcal)
const ENERGY_CONVERSIONS: Record<EnergyUnit, number> = {
  kcal: 1,
  kj: 4.184,
};

export const convertEnergy = (value: number, from: EnergyUnit, to: EnergyUnit): number => {
  if (from === to) return value;
  const inKcal = value / ENERGY_CONVERSIONS[from];
  return inKcal * ENERGY_CONVERSIONS[to];
};

// Temperature conversions (base: c)
export const convertTemp = (value: number, from: TempUnit, to: TempUnit): number => {
  if (from === to) return value;
  if (from === 'c' && to === 'f') return (value * 9) / 5 + 32;
  if (from === 'f' && to === 'c') return ((value - 32) * 5) / 9;
  return value;
};

export const formatValue = (value: number, precision: number = 1): string => {
  if (value === undefined || value === null) return '--';
  return value.toFixed(precision);
};
