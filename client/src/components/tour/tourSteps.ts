import type { ActionId, ScenarioId, SimulationSnapshot, TimelineEntry, ZoneForecast, ZoneId, ZoneState } from '@shared/types';
import type { PageId } from '../../hooks/usePage';
import type { TwinView } from '../../pages/TwinPage';

/** Everything the tour is allowed to do to the app. */
export interface TourApi {
  go: (p: PageId) => void;
  select: (z: ZoneId) => void;
  view: (v: TwinView) => void;
  reset: () => void;
  scenario: (s: ScenarioId, z?: ZoneId) => void;
  action: (a: ActionId, z?: ZoneId) => void;
  control: (p: { paused?: boolean; speed?: number }) => void;
}

type Snap = SimulationSnapshot;

export interface TourStep {
  id: string;
  page: PageId;
  /** Short page name for the chip. */
  label: string;
  title: string;
  /** What the audience is looking at (can show live numbers). */
  see: (s: Snap) => string[];
  /** What the presenter says. */
  say: (s: Snap) => string;
  /** Seconds the step stays (minimum, when `until` is set). */
  sec: number;
  /** Step ends once this is true (and `sec` has passed), or after `maxSec`. */
  until?: (s: Snap) => boolean;
  maxSec?: number;
  /** Shown while waiting for `until`. */
  waitingFor?: string;
  /** Reset the simulation first if an earlier run left it in a used state. */
  fresh?: boolean;
  /** The simulation is paused during this step (so the presenter can talk). */
  simPaused?: boolean;
  enter?: (api: TourApi, s: Snap) => void;
  /** CSS selector scrolled into view after the page changes. */
  focus?: string;
}

// ---------- small helpers (all read live values, nothing is made up) ----------
const zone = (s: Snap, id: ZoneId): ZoneState => s.zones.find((z) => z.id === id)!;
const fc = (s: Snap, id: ZoneId): ZoneForecast => s.forecasts.find((f) => f.zoneId === id)!;
const entry = (s: Snap, id: ZoneId): TimelineEntry | undefined => s.timeline.find((t) => t.zoneId === id);
export const aiWarned = (s: Snap) => entry(s, 'cooling')?.aiWarningStep != null;
export const simUsed = (s: Snap) =>
  s.incident.scenario !== 'normal' || s.timeline.length > 0 || s.actions.length > 0 || s.alerts.length > 0 || s.outcome.status !== 'idle';
const risk = (s: Snap) => {
  const f = fc(s, 'cooling');
  return f.riskScore === null ? null : Math.round(f.riskScore * 100);
};
const deg = (v: number) => `${v.toFixed(1)}°C`;
const pct = (v: number) => `${(v * 100).toFixed(1)}%`;

export const TOUR_STEPS: TourStep[] = [
  {
    id: 'welcome', page: 'overview', label: 'Overview', fresh: true, sec: 12,
    title: 'THERMAL GUARD',
    enter: (api) => { api.reset(); api.control({ paused: false, speed: 0.5 }); },
    see: () => [
      'A live digital twin of a factory.',
      'All six zones are GREEN: everything is normal.',
      'Every number is SIMULATED. There are no real sensors.',
    ],
    say: () =>
      'Factories usually learn about overheating after the alarm goes off. Thermal Guard watches the heat build, warns the operator BEFORE the limit is crossed, and shows what to do about it. Everything you will see is simulated data.',
  },
  {
    id: 'zones', page: 'overview', label: 'Overview', fresh: true, sec: 14,
    title: 'Six zones. One big meter each.',
    see: () => [
      'Boiler · Production · Cooling · Storage · Electrical · Packaging.',
      'Each meter shows the HOTTEST point of its zone.',
      'GREEN = normal   AMBER = warning   RED = limit crossed.',
    ],
    say: (s) =>
      `Every zone has a warning level and a hard limit. Look at the Cooling Unit: its limit is ${zone(s, 'cooling').limit}°C and right now it is at ${deg(zone(s, 'cooling').peakTemp)}. Healthy.`,
  },
  {
    id: 'twin', page: 'twin', label: 'Live Twin', fresh: true, sec: 12,
    title: 'The factory as a 3D digital twin',
    enter: (api) => { api.select('cooling'); api.view({ two: false, thermal: false }); },
    see: () => [
      'Click any machine: its zone is selected.',
      'The two fans on the Cooling Unit are spinning.',
      'The card at the bottom left shows the live temperature.',
    ],
    say: () =>
      'This is the digital twin. It is driven by a 40-by-25 grid of temperatures that the simulator updates every single step. The browser never invents a number.',
  },
  {
    id: 'heatmap', page: 'twin', label: 'Live Twin', fresh: true, sec: 12,
    title: 'Machines and heat map, side by side',
    enter: (api) => api.view({ two: true, thermal: false }),
    see: () => [
      'LEFT: the machines, as the operator sees them.',
      'RIGHT: the heat map, showing where the heat really is.',
      'Heat spreads, so a problem in one zone warms its neighbours.',
    ],
    say: () =>
      'On the left you see the equipment. On the right you see the heat. Point at a machine and its temperature at the same moment.',
  },
  {
    id: 'break', page: 'fix', label: 'Fix Center', sec: 9, focus: '#tour-fix-list',
    title: 'Now we BREAK the cooling unit',
    enter: (api, s) => {
      if (s.incident.scenario === 'normal') api.scenario('cooling-failure');
      api.control({ paused: false, speed: 1 });
    },
    see: (s) => [
      'The tour just pressed COOLING FAILURE (a test button).',
      'Cooling power drops and the fans slow down.',
      `Open issue in the list: ${s.faults.find((f) => f.zoneId === 'cooling')?.title ?? 'Cooling pump failing'}.`,
    ],
    say: () =>
      'We simulate a failing cooling pump. Notice that nothing has crossed any limit yet: the zone is still green. This is exactly the moment where a normal alarm says nothing.',
  },
  {
    id: 'watch', page: 'twin', label: 'Live Twin', sec: 7, until: aiWarned, maxSec: 45,
    waitingFor: 'Waiting for the AI warning…',
    title: 'Watch the heat build',
    enter: (api, s) => {
      if (s.incident.scenario === 'normal') api.scenario('cooling-failure');
      api.select('cooling');
      api.view({ two: false, thermal: true });
      api.control({ paused: false, speed: 1 });
    },
    see: (s) => {
      const z = zone(s, 'cooling');
      const r = risk(s);
      return [
        `Cooling Unit: ${deg(z.peakTemp)}   ·   limit ${z.limit}°C`,
        `Heating about ${Math.max(0, z.trend).toFixed(2)}°C every step.`,
        r === null ? 'AI estimate unavailable.' : `AI breach risk right now: ${r}%`,
      ];
    },
    say: () =>
      'Look at the heat map: the cooling zone is getting warmer, but the limit is still far away. The AI is reading the shape of the temperature curve, not just the number.',
  },
  {
    id: 'warning', simPaused: true, page: 'overview', label: 'Overview', sec: 18,
    title: 'AI WARNING: before anything breaks',
    enter: (api) => { api.select('cooling'); api.control({ paused: true }); },
    see: (s) => {
      const z = zone(s, 'cooling');
      const f = fc(s, 'cooling');
      const e = entry(s, 'cooling');
      return [
        `Cooling Unit is ${deg(z.peakTemp)}. The limit is ${z.limit}°C and has NOT been crossed.`,
        e?.aiWarningStep != null
          ? `AI confirmed the warning at step ${e.aiWarningStep}: breach risk ${risk(s)}%${f.projectedBreachInSteps !== null ? `, limit expected in about ${f.projectedBreachInSteps} steps` : ''}.`
          : 'The AI has not confirmed a warning yet.',
        'The zone turned AMBER and an AI item appeared in the alert feed.',
      ];
    },
    say: () =>
      'This is our main feature. The red limit alarm is still silent, but the neural network has seen the curve bending upward and warns us now. That is time to act. We paused the simulation so we can talk.',
  },
  {
    id: 'todo', simPaused: true, page: 'fix', label: 'Fix Center', sec: 12, focus: '#tour-fix-list',
    title: 'WHAT TO DO, and what it costs',
    enter: (api) => { api.select('cooling'); api.control({ paused: true }); },
    see: (s) => {
      const rec = s.recommendations.find((r) => r.zoneId === 'cooling');
      return [
        `Suggested now: ${rec ? rec.actionId.replace(/-/g, ' ').toUpperCase() : 'RESTART COOLING'}.`,
        'Every action shows its cost: nothing is free.',
        'These suggestions are plain rules, not AI. The operator decides.',
      ];
    },
    say: () =>
      'The AI tells us WHEN. Simple rules tell us WHAT. Every action lists what it costs, because every fix is a trade-off. We choose the online fix: restart the cooling remotely.',
  },
  {
    id: 'act', page: 'twin', label: 'Live Twin', sec: 9, maxSec: 28,
    // wait until the zone is back to NORMAL and the timeline entry is closed, so the result page is complete
    until: (s) => zone(s, 'cooling').status === 'NORMAL' && entry(s, 'cooling')?.resolvedStep != null,
    waitingFor: 'Cooling down…',
    title: 'The operator presses RESTART COOLING',
    enter: (api) => {
      api.select('cooling');
      api.view({ two: false, thermal: true });
      api.action('restart-cooling', 'cooling');
      api.control({ paused: false, speed: 2 });
    },
    see: (s) => {
      const z = zone(s, 'cooling');
      return [
        `Cooling Unit: ${deg(z.peakTemp)} and ${z.trend < -0.02 ? 'FALLING' : z.trend > 0.02 ? 'still rising' : 'holding'}.   Status: ${z.status}`,
        'The fans speed up again.',
        'The pump is still damaged: cooling runs at about 70% until a technician repairs it.',
      ];
    },
    say: () =>
      'Watch the heat map cool down. The online fix contains the problem right now. The root cause is not repaired, so the Fix Center keeps that issue open until a technician fixes the pump on site.',
  },
  {
    id: 'result', simPaused: true, page: 'analytics', label: 'Analytics', sec: 18, focus: '#tour-early-warning',
    title: 'RESULT: the breach was avoided',
    enter: (api) => { api.select('cooling'); api.control({ paused: true }); },
    see: (s) => {
      const e = entry(s, 'cooling');
      return [
        s.outcome.headline,
        s.outcome.detail,
        e ? e.summary : 'No timeline entry yet.',
      ];
    },
    say: () =>
      'Same incident, different outcome, because we acted on the early warning. Without any action the temperature keeps climbing past the limit. These lines are not scripted: they are built from the real events of this run.',
  },
  {
    id: 'numbers', simPaused: true, page: 'analytics', label: 'Analytics', sec: 22, focus: '#tour-evaluation',
    title: 'How good is the AI? (simulated test)',
    enter: (api) => api.control({ paused: true }),
    see: (s) => {
      const e = s.model.evaluation;
      if (!e) return ['No evaluation numbers are stored with this model.', 'Run  npm run evaluate  to create them.'];
      return [
        `${e.caught} of ${e.breachRuns} real breaches had an AI warning first (${pct(e.detectionRate)}).`,
        `Median warning: ${e.medianLeadAi} steps before the breach, against ${e.medianLeadRule} for the plain WARNING level.`,
        `Warnings in runs that never breached: ${pct(e.falseAlarmRate)}.`,
      ];
    },
    say: (s) => {
      const n = s.model.evaluation?.incidents;
      return `We tested on ${n ?? 'hundreds of'} fresh simulated incidents that the network never saw in training. To be honest: this is the same simulator, not a real plant, so we claim nothing about real equipment. Slow cooling failures give less advantage, fast problems like fire and machines gain the most.`;
    },
  },
  {
    id: 'alerts', simPaused: true, page: 'alerts', label: 'Alerts', sec: 9,
    title: 'Everything is logged',
    enter: (api) => api.control({ paused: true }),
    see: () => [
      'RULE alerts (limit crossed) and AI predictions are kept apart.',
      'Every operator action is logged with its step number.',
      'Acknowledge buttons keep a human in the loop.',
    ],
    say: () =>
      'Measurements, AI predictions and operator actions each have their own record. The human stays in charge: the AI advises, the operator acts.',
  },
  {
    id: 'close', page: 'overview', label: 'Overview', sec: 14,
    title: 'See the heat. Predict the risk. Act before failure.',
    enter: (api) => api.control({ paused: false, speed: 0.5 }),
    see: () => [
      'NEXT: real sensor feeds instead of the simulator.',
      'NEXT: validate on real plant data.',
      'NEXT: one model per machine, and learn from operator feedback.',
    ],
    say: () =>
      'Thermal Guard: a digital twin that predicts the risk and tells the operator what to do before failure. It is a prototype, not a certified safety system. Thank you. Questions?',
  },
];

export const TOTAL_STEPS = TOUR_STEPS.length;
/** Nominal tour length in seconds (steps that wait for the AI count their minimum plus ~12 s). */
export const NOMINAL_SECONDS = TOUR_STEPS.reduce((a, s) => a + s.sec + (s.until ? 8 : 0), 0);
