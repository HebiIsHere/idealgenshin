import type { SubstatAllocation, SubstatType } from '../types';

/**
 * Generate a unique ID string (simple implementation for artifact IDs).
 */
export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}
