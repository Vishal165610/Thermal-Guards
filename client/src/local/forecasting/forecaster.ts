import type { ModelStatus, ZoneForecast, ZoneId } from '@shared/types';
import { FORECAST_HORIZON, ZONES } from '@shared/zones';
import { trendEstimate } from './trendFallback';

/** Browser-only deployment: transparent trend estimates, not neural-network predictions. */
export class Forecaster {
  status: ModelStatus = {
    state: 'missing',
    message: 'Browser demo: trend-based estimates (not neural-network AI).',
    horizon: FORECAST_HORIZON,
  };
  async load(): Promise<void> { /* No Node filesystem or server required. */ }
  predict(histories: Record<ZoneId, number[]>): Record<ZoneId, ZoneForecast> {
    const out = {} as Record<ZoneId, ZoneForecast>;
    ZONES.forEach((z, i) => { out[z.id] = trendEstimate(histories[z.id], i); });
    return out;
  }
}
