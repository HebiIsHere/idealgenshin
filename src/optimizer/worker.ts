import * as Comlink from 'comlink';
import type {
  RedistributeRequest,
  RedistributeResult,
  IdealRequest,
  IdealResult,
} from '../types';
import { RedistributeOptimizer } from './redistribute';
import { IdealTemplateOptimizer } from './ideal';

/**
 * OptimizerWorker — Web Worker entry point.
 * Exposed via Comlink as a proxy object for main-thread usage.
 *
 * Usage in main thread:
 *   const worker = new Worker(new URL('./optimizer/worker.ts', import.meta.url), { type: 'module' });
 *   const api = Comlink.wrap<OptimizerWorkerAPI>(worker);
 *   const result = await api.redistribute(req);
 */
const optimizerWorkerAPI = {
  /**
   * Run sub-stat redistribution optimization.
   * @param req - Request with current build and allocations
   * @param onProgress - Optional progress callback (transferred via Comlink proxy)
   * @returns Optimization result
   */
  async redistribute(
    req: RedistributeRequest,
    onProgress?: (progress: number) => Promise<void>,
  ): Promise<RedistributeResult> {
    // Wrap the Comlink remote callback so it can be called locally
    const progressCallback = onProgress
      ? (progress: number) => { onProgress(progress); }
      : undefined;
    return RedistributeOptimizer.optimize(req, progressCallback);
  },

  /**
   * Generate ideal sub-stat template.
   * @param req - Request with character data and total rolls
   * @param onProgress - Optional progress callback
   * @returns Ideal allocation result
   */
  async generateIdeal(
    req: IdealRequest,
    onProgress?: (progress: number) => Promise<void>,
  ): Promise<IdealResult> {
    const progressCallback = onProgress
      ? (progress: number) => { onProgress(progress); }
      : undefined;
    return IdealTemplateOptimizer.generate(req, progressCallback);
  },
};

export type OptimizerWorkerAPI = typeof optimizerWorkerAPI;

Comlink.expose(optimizerWorkerAPI);
