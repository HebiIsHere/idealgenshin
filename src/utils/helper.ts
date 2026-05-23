import type { SubstatAllocation, SubstatType } from '../types';

/**
 * General helper utilities used across the application.
 */

/**
 * Clamp a number within a range.
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/**
 * Calculate the total number of rolls from an allocation array.
 */
export function sumRolls(allocations: SubstatAllocation[]): number {
  return allocations.reduce((sum, a) => sum + a.rolls, 0);
}

/**
 * Create a map from SubstatType to roll count from an allocation array.
 */
export function allocationToMap(allocations: SubstatAllocation[]): Map<SubstatType, number> {
  const map = new Map<SubstatType, number>();
  for (const alloc of allocations) {
    map.set(alloc.type, alloc.rolls);
  }
  return map;
}

/**
 * Generate a unique ID string (simple implementation for artifact IDs).
 */
export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Deep clone a simple object (no functions, no circular refs).
 */
export function deepClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

/**
 * Check if two sets have the same elements.
 */
export function setsEqual<T>(a: Set<T>, b: Set<T>): boolean {
  if (a.size !== b.size) return false;
  for (const item of a) {
    if (!b.has(item)) return false;
  }
  return true;
}

/**
 * Debounce a function call.
 */
export function debounce<T extends (...args: any[]) => any>(
  fn: T,
  delayMs: number,
): (...args: Parameters<T>) => void {
  let timer: ReturnType<typeof setTimeout> | null = null;
  return (...args: Parameters<T>) => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      fn(...args);
      timer = null;
    }, delayMs);
  };
}
