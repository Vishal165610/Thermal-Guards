import type { ModelStatus, ZoneForecast, ZoneId } from '@shared/types';
import { FEATURE_COUNT, OUTPUT_COUNT, buildFeatures, decodeDelta } from '@shared/features';
import { forward, netFromModelFile, type Net } from '@shared/neuralNet';
import { AI_WARN_RISK, FORECAST_HORIZON, FORECAST_POINTS, ZONES } from '@shared/zones';
import modelFile from '../../../../server/models/thermal-guard-model.json';
import { trendEstimate } from './trendFallback';

/**
 * Browser build: runs the SAME trained neural network as the server (weights trained with
 * TensorFlow.js, stored in server/models/thermal-guard-model.json, bundled into the page).
 * If the weights cannot be read for any reason, clearly labelled trend estimates take over.
 */
export class Forecaster {
  private net: Net | null = null;
  status: ModelStatus = {
    state: 'missing',
    message: 'Model not loaded yet',
    horizon: FORECAST_HORIZON,
  };

  async load(): Promise<void> {
    try {
      const net = netFromModelFile(modelFile);
      if (net.inputDim !== FEATURE_COUNT || net.outputDim !== OUTPUT_COUNT) {
        throw new Error(`model shape ${net.inputDim}->${net.outputDim} does not match ${FEATURE_COUNT}->${OUTPUT_COUNT}`);
      }
      this.net = net;
      const meta = (modelFile as { meta: { trainedAt: string; trainingSamples: number; epochs: number; evaluation?: ModelStatus['evaluation'] } }).meta;
      this.status = {
        state: 'ready',
        message: 'Neural network loaded (runs inside this browser)',
        horizon: FORECAST_HORIZON,
        trainedAt: meta.trainedAt,
        trainingSamples: meta.trainingSamples,
        epochs: meta.epochs,
        evaluation: meta.evaluation,
      };
    } catch (err) {
      this.net = null;
      this.status = {
        state: 'error',
        message: `Model failed to load (${(err as Error).message}). Showing trend estimates instead (not AI).`,
        horizon: FORECAST_HORIZON,
      };
    }
  }

  predict(histories: Record<ZoneId, number[]>): Record<ZoneId, ZoneForecast> {
    const out = {} as Record<ZoneId, ZoneForecast>;
    if (!this.net) {
      ZONES.forEach((z, i) => { out[z.id] = trendEstimate(histories[z.id], i); });
      return out;
    }
    try {
      const result = forward(this.net, ZONES.map((z, i) => buildFeatures(histories[z.id], i)));
      ZONES.forEach((z, i) => {
        const h = histories[z.id];
        const t = h[h.length - 1];
        const risk = result[i * OUTPUT_COUNT];
        const predicted = FORECAST_POINTS.map((s, k) => ({
          step: s,
          temp: t + decodeDelta(result[i * OUTPUT_COUNT + 1 + k]),
        }));
        out[z.id] = {
          zoneId: z.id,
          source: 'neural-network',
          riskScore: Math.round(risk * 1000) / 1000,
          warning: risk >= AI_WARN_RISK && t < z.limit,
          horizon: FORECAST_HORIZON,
          predicted,
          projectedBreachInSteps: firstCrossing(t, predicted, z.limit),
          slope: h.length > 8 ? (t - h[h.length - 9]) / 8 : 0,
        };
      });
      return out;
    } catch (err) {
      this.net = null;
      this.status = {
        state: 'error',
        message: `Inference failed (${(err as Error).message}). Showing trend estimates instead (not AI).`,
        horizon: FORECAST_HORIZON,
      };
      ZONES.forEach((z, i) => { out[z.id] = trendEstimate(histories[z.id], i); });
      return out;
    }
  }
}

/** First step where the estimated trajectory reaches the limit (linear between sample points). */
function firstCrossing(t0: number, pts: { step: number; temp: number }[], limit: number): number | null {
  if (t0 >= limit) return null;
  let prevStep = 0;
  let prevTemp = t0;
  for (const p of pts) {
    if (p.temp >= limit) {
      const f = (limit - prevTemp) / (p.temp - prevTemp);
      return Math.max(1, Math.round(prevStep + f * (p.step - prevStep)));
    }
    prevStep = p.step;
    prevTemp = p.temp;
  }
  return null;
}
