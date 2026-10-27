// Held-out check of the saved model on FRESH simulated incidents.
//   npm run evaluate
//
// The incidents come from a different random seed than training, so the network has never seen
// them. Each zone of each incident is replayed step by step exactly like the live dashboard:
// an AI warning is "confirmed" after AI_CONFIRM_STEPS steps in a row at risk >= AI_WARN_RISK
// while the zone is still below its limit. We compare it with the ordinary WARNING level
// (limit - margin), which is what a plain threshold alarm would give.
//
// This describes the simulator only. It says nothing about real plants.
import fs from 'node:fs';
import type { ModelEvaluation } from '../../../shared/types';
import { FEATURE_COUNT, OUTPUT_COUNT, buildFeatures } from '../../../shared/features';
import { forward, netFromModelFile } from '../../../shared/neuralNet';
import { AI_CONFIRM_STEPS, AI_WARN_RISK, ZONES } from '../../../shared/zones';
import { ThermalSimulation } from '../simulation/thermalSimulation';
import { mulberry32, simulateEpisode } from './dataset';
import { MODEL_FILE } from './modelIO';

export const EVAL_SEED = 90210; // training uses 20260: different incidents
export const EVAL_EPISODES = 300;

const median = (a: number[]): number | null => {
  if (!a.length) return null;
  const s = [...a].sort((x, y) => x - y);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};

export function evaluateModel(raw: unknown, episodes = EVAL_EPISODES, seed = EVAL_SEED): ModelEvaluation {
  const net = netFromModelFile(raw);
  if (net.inputDim !== FEATURE_COUNT || net.outputDim !== OUTPUT_COUNT) throw new Error('model shape mismatch; retrain');
  const rand = mulberry32(seed);
  const sim = new ThermalSimulation();

  let breachRuns = 0, caught = 0, safeRuns = 0, safeWithWarning = 0, earlier = 0;
  const leadAi: number[] = [];
  const leadRule: number[] = [];
  const by = new Map<string, { breaches: number; caught: number; ai: number[]; rule: number[] }>();

  for (let ep = 0; ep < episodes; ep++) {
    const { kind, series } = simulateEpisode(rand, sim);
    const total = series[0].length;
    // one batch per incident: every zone, every step
    const rows: number[][] = [];
    for (let z = 0; z < ZONES.length; z++) {
      for (let t = 0; t < total; t++) rows.push(buildFeatures(series[z].slice(Math.max(0, t - 30), t + 1), z));
    }
    const out = forward(net, rows);

    for (let z = 0; z < ZONES.length; z++) {
      const zone = ZONES[z];
      const s = series[z];
      let breach = -1, ruleWarn = -1, aiWarn = -1, streak = 0;
      for (let t = 0; t < total; t++) {
        if (breach < 0 && s[t] >= zone.limit) breach = t;
        if (ruleWarn < 0 && s[t] >= zone.limit - zone.warningMargin) ruleWarn = t;
        if (breach >= 0 && t >= breach) break; // after the breach only the rule alarm matters
        const risk = out[(z * total + t) * OUTPUT_COUNT];
        if (risk >= AI_WARN_RISK && s[t] < zone.limit) streak++; else streak = 0;
        if (aiWarn < 0 && streak >= AI_CONFIRM_STEPS) aiWarn = t;
      }
      // the confirmed warning must have come BEFORE the breach step
      if (breach >= 0 && aiWarn >= breach) aiWarn = -1;

      if (breach < 0) {
        safeRuns++;
        if (aiWarn >= 0) safeWithWarning++;
        continue;
      }
      breachRuns++;
      const g = by.get(kind) ?? { breaches: 0, caught: 0, ai: [], rule: [] };
      g.breaches++;
      if (aiWarn >= 0) {
        caught++; g.caught++;
        const a = breach - aiWarn;
        const r = ruleWarn >= 0 && ruleWarn <= breach ? breach - ruleWarn : 0;
        leadAi.push(a); leadRule.push(r); g.ai.push(a); g.rule.push(r);
        if (a > r) earlier++;
      }
      by.set(kind, g);
    }
  }

  const round1 = (v: number | null) => (v === null ? null : Math.round(v * 10) / 10);
  return {
    basis: `${episodes} fresh simulated incidents (seed ${seed}, not used in training), each replayed zone by zone like the live dashboard`,
    incidents: episodes,
    breachRuns,
    safeRuns,
    caught,
    detectionRate: breachRuns ? Math.round((caught / breachRuns) * 1000) / 1000 : 0,
    falseAlarmRate: safeRuns ? Math.round((safeWithWarning / safeRuns) * 1000) / 1000 : 0,
    medianLeadAi: round1(median(leadAi)),
    medianLeadRule: round1(median(leadRule)),
    earlierThanRuleRate: caught ? Math.round((earlier / caught) * 1000) / 1000 : null,
    byScenario: [...by.entries()].map(([scenario, g]) => ({
      scenario, breaches: g.breaches, caught: g.caught,
      medianLeadAi: round1(median(g.ai)), medianLeadRule: round1(median(g.rule)),
    })),
  };
}

/** Evaluates the saved model file and stores the result inside it (meta.evaluation). */
export function attachEvaluation(file = MODEL_FILE): ModelEvaluation {
  const raw = JSON.parse(fs.readFileSync(file, 'utf8'));
  const evaluation = evaluateModel(raw);
  raw.meta.evaluation = evaluation;
  fs.writeFileSync(file, JSON.stringify(raw));
  return evaluation;
}

/** Makes sure the plain-JS forward pass used in the browser matches TensorFlow.js. */
async function parityCheck(file = MODEL_FILE): Promise<number> {
  const tf = await import('@tensorflow/tfjs');
  await tf.setBackend('cpu');
  await tf.ready();
  const { loadModel } = await import('./modelIO');
  const { model } = await loadModel(tf, file);
  const raw = JSON.parse(fs.readFileSync(file, 'utf8'));
  const net = netFromModelFile(raw);
  const rand = mulberry32(7);
  const rows = Array.from({ length: 200 }, (_, i) => {
    const h = Array.from({ length: 31 }, (_, k) => 28 + 25 * rand() * (k / 30) + rand());
    return buildFeatures(h, i % ZONES.length);
  });
  const a = forward(net, rows);
  const b = (model.predict(tf.tensor2d(rows, [rows.length, FEATURE_COUNT])) as import('@tensorflow/tfjs').Tensor).dataSync();
  let max = 0;
  for (let i = 0; i < a.length; i++) max = Math.max(max, Math.abs(a[i] - b[i]));
  return max;
}

const pct = (v: number) => `${(v * 100).toFixed(1)}%`;

async function main() {
  const diff = await parityCheck();
  console.log(`Browser forward pass vs TensorFlow.js: max difference ${diff.toExponential(2)} ${diff < 1e-4 ? '(match)' : '(MISMATCH!)'}`);
  if (diff >= 1e-4) process.exit(1);
  const e = attachEvaluation();
  console.log(`\n${e.basis}`);
  console.log(`  Breaches in the test: ${e.breachRuns}   caught early by the AI: ${e.caught} (${pct(e.detectionRate)})`);
  console.log(`  Runs that never breached: ${e.safeRuns}   AI warned anyway: ${pct(e.falseAlarmRate)}`);
  console.log(`  Median lead before breach: AI ${e.medianLeadAi} steps vs plain WARNING level ${e.medianLeadRule} steps`);
  console.log(`  AI warned earlier than the WARNING level in ${e.earlierThanRuleRate === null ? '-' : pct(e.earlierThanRuleRate)} of caught breaches`);
  for (const s of e.byScenario) {
    console.log(`    ${s.scenario.padEnd(20)} breaches ${String(s.breaches).padStart(3)}  caught ${String(s.caught).padStart(3)}  lead AI ${s.medianLeadAi} vs rule ${s.medianLeadRule}`);
  }
  console.log(`\nSaved into ${MODEL_FILE}`);
  console.log('Simulated data only. This is not a claim about real plants.');
}

// run only when started directly (`tsx evaluate.ts`), not when imported by train.ts
if (process.argv[1] && /evaluate\.ts$/.test(process.argv[1])) {
  main().catch((e) => { console.error(e); process.exit(1); });
}
