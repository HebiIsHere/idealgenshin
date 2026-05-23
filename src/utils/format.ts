import { PERCENTAGE_STAT_TYPES } from '../data/constants';
import type { SubstatType } from '../types';

/**
 * Format a stat value for display.
 * Percentage types are multiplied by 100 and suffixed with %.
 * Flat types are displayed as-is.
 */
export function formatStatValue(type: SubstatType, value: number): string {
  if (PERCENTAGE_STAT_TYPES.has(type)) {
    return `${(value * 100).toFixed(1)}%`;
  }
  return formatNumber(value);
}

/**
 * Format a number with thousands separators.
 * e.g. 12345.6 → "12,345.6"
 */
export function formatNumber(value: number, decimals: number = 1): string {
  if (Number.isInteger(value) && decimals === 0) {
    return value.toLocaleString('en-US');
  }
  return value.toLocaleString('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: decimals,
  });
}

/**
 * Format damage number for display.
 * Whole numbers with thousands separators.
 * e.g. 1234567 → "1,234,567"
 */
export function formatDamage(value: number): string {
  return Math.round(value).toLocaleString('en-US');
}

/**
 * Format a percentage value for display.
 * Input is decimal (0.153 → "+15.3%")
 */
export function formatPercent(value: number, showSign: boolean = true): string {
  const percent = value * 100;
  const sign = showSign && percent > 0 ? '+' : '';
  return `${sign}${percent.toFixed(1)}%`;
}

/**
 * Format improvement percentage.
 * e.g. 0.153 → "+15.3%"
 * e.g. -0.05 → "-5.0%"
 */
export function formatImprovement(value: number): string {
  const percent = value * 100;
  const sign = percent > 0 ? '+' : '';
  return `${sign}${percent.toFixed(1)}%`;
}
