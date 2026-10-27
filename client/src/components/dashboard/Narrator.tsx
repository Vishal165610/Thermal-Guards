import type {
  ScenarioId, SimulationSnapshot, TimelineEntry, ZoneForecast, ZoneState,
} from '@shared/types';
import { getAction } from '@shared/actions';
import { displayLevel, type DisplayLevel } from '../../utils/thermalColors';

const SCENARIO_NAME: Record<ScenarioId, string> = {
  normal: 'Normal operation',
  'cooling-failure': 'Cooling failure',
  'machine-overheating': 'Machine overheating',
  fire: 'Fire scenario',
};

const STAGES = ['Normal', 'Incident', 'Warning', 'Limit crossed', 'Recovery'];
const RANK: Record<DisplayLevel, number> = { normal: 0, recovering: 1, predicted: 2, warning: 3, critical: 4 };
const fmtEta = (n: number | null | undefined) => (n == null ? '?' : n > 100 ? 'more than 100' : String(n));

interface Story {
  stage: number;
  tone: string;
  title: string;
  body: string;
  progress?: number;
  progressLabel?: string;
}

const GREEN = '#16A34A';
const AMBER = '#D97706';
const RED = '#DC2626';
const CYAN = '#0891B2';
const INDIGO = '#4F46E5';

/** Plain-English description of what is happening right now. Built only from real snapshot data. */
function buildStory(snap: SimulationSnapshot): Story {
  const fcOf = (z: ZoneState): ZoneForecast | undefined => snap.forecasts.find((f) => f.zoneId === z.id);
  let worst: ZoneState | undefined;
  let worstLevel: DisplayLevel = 'normal';
  for (const z of snap.zones) {
    const lv = displayLevel(z, fcOf(z));
    if (RANK[lv] > RANK[worstLevel]) { worst = z; worstLevel = lv; }
  }
  const entry: TimelineEntry | undefined = worst ? snap.timeline.find((t) => t.zoneId === worst!.id) : undefined;
  const sc = snap.incident.scenario;
  const out = snap.outcome;
  const info = worst ? snap.recovery.find((r) => r.zoneId === worst!.id) : undefined;
  const progressOf = (peak: number, target: number, limit: number) =>
    Math.min(1, Math.max(0, (limit - peak) / Math.max(1, limit - target)));

  if (worst && worstLevel === 'critical') {
    let body = `${worst.name} is ${worst.peakTemp.toFixed(1)}°C, at or above its ${worst.limit}°C limit. The normal threshold alarm has fired.`;
    if (entry?.verdict === 'early-warning') {
      const who = entry.aiWarningSource === 'trend-fallback' ? 'The trend estimate (not AI)' : 'The AI';
      body += ` ${who} warned ${entry.leadSteps} steps earlier (step ${entry.aiWarningStep}). The alarm fired at step ${entry.breachStep}.`;
    } else if (entry?.verdict === 'no-warning-before-breach') {
      body += ' The forecast did not warn before this: only the reactive alarm fired.';
    }
    if (info?.phase === 'cooling') {
      body += ` It is now falling (${info.trend.toFixed(2)}°C per step). Back to normal below ${info.targetTemp}°C in roughly ${fmtEta(info.etaSteps)} steps.`;
      return { stage: 3, tone: AMBER, title: 'Limit crossed — now cooling down', body };
    }
    const fix = snap.recommendations.find((r) => r.zoneId === worst!.id) ?? snap.recommendations[0];
    if (fix) body += ` Suggested fix: ${getAction(fix.actionId).label} (open the Fix Center).`;
    else body += ' The temperature is not falling yet: the cause is still active.';
    return { stage: 3, tone: RED, title: 'Limit crossed', body };
  }
  if (worst && worstLevel === 'recovering') {
    const target = info?.targetTemp ?? worst.warningTemp - 4;
    const eta = info?.etaSteps != null ? ` Roughly ${fmtEta(info.etaSteps)} steps to go.` : '';
    return {
      stage: 4, tone: CYAN, title: 'Recovering',
      body: `${worst.name} is cooling down (${worst.peakTemp.toFixed(1)}°C). It returns to normal below ${target}°C.${eta}`,
      progress: progressOf(worst.peakTemp, target, worst.limit),
      progressLabel: `${worst.peakTemp.toFixed(1)}°C → below ${target}°C`,
    };
  }
  if (worst && worstLevel === 'predicted') {
    const fc = fcOf(worst)!;
    const ai = fc.source === 'neural-network';
    const when = fc.projectedBreachInSteps !== null ? `in about ${fc.projectedBreachInSteps} steps` : 'within the next 30 steps';
    return {
      stage: 2, tone: AMBER,
      title: ai ? 'AI warning — limit not crossed yet' : 'Trend warning (not AI) — limit not crossed yet',
      body: `${ai ? 'The neural network' : 'A simple trend estimate'} expects ${worst.name} to reach ${worst.limit}°C ${when}. Right now it is ${worst.peakTemp.toFixed(1)}°C. Nothing has been breached.`,
    };
  }
  if (worst && worstLevel === 'warning') {
    return {
      stage: 2, tone: AMBER, title: 'Warning level reached',
      body: `${worst.name} is ${worst.peakTemp.toFixed(1)}°C, above its warning level (${worst.warningTemp}°C). The limit is ${worst.limit}°C.`,
    };
  }

  const open = snap.faults.filter((f) => f.state !== 'fixed');
  const job = open.find((f) => f.state === 'travelling' || f.state === 'waiting' || f.state === 'repairing');
  if (job) {
    return { stage: 4, tone: INDIGO, title: `Technician: ${job.title}`, body: job.note };
  }
  if (out.status === 'closed') {
    return {
      stage: 4, tone: out.breached ? AMBER : GREEN,
      title: `Incident closed — ${out.headline}`,
      body: out.detail,
    };
  }
  if (sc !== 'normal' && open.some((f) => f.state === 'failing')) {
    const z = snap.zones.find((q) => q.id === snap.incident.zoneId);
    return {
      stage: 1, tone: AMBER, title: `${SCENARIO_NAME[sc]} started`,
      body: z
        ? `${z.name} is starting to heat up: ${z.peakTemp.toFixed(1)}°C now, limit ${z.limit}°C. Watch the forecast.`
        : 'The incident is running. Watch the zones.',
    };
  }
  if (open.length > 0) {
    return {
      stage: 4, tone: AMBER, title: 'Running normally, but issues remain',
      body: `${open.length === 1 ? '1 issue needs' : `${open.length} issues need`} an on-site repair: ${open.map((f) => f.title).join(', ')}. Equipment may be running degraded.`,
    };
  }
  return {
    stage: 0, tone: GREEN, title: 'Everything is normal',
    body: `All ${snap.zones.length} zones are below their warning level. Open the Fix Center to start a test incident.`,
  };
}

export function Narrator({ snapshot, compact = false }: { snapshot: SimulationSnapshot; compact?: boolean }) {
  const story = buildStory(snapshot);
  return (
    <div
      className={`rounded-2xl border-2 bg-card shadow-[0_8px_24px_rgba(15,23,42,0.06)] ${compact ? 'px-5 py-3' : 'px-6 py-5'}`}
      style={{ borderColor: `${story.tone}66` }}
    >
      <div className="flex items-center gap-1.5">
        {STAGES.map((s, i) => (
          <div key={s} className="flex flex-1 flex-col gap-1">
            <div
              className="h-2 rounded-full"
              style={{ background: i <= story.stage ? story.tone : '#E3E8F1', opacity: i === story.stage ? 1 : i < story.stage ? 0.45 : 1 }}
            />
            {!compact && (
              <span className={`text-[13px] font-semibold ${i === story.stage ? 'text-ink' : 'text-muted'}`}>{s}</span>
            )}
          </div>
        ))}
      </div>
      <div className={`${compact ? 'mt-2 text-xl' : 'mt-3 text-2xl'} font-extrabold`} style={{ color: story.tone }}>{story.title}</div>
      <p className={`${compact ? 'mt-0.5 text-[15px]' : 'mt-1 text-base'} leading-relaxed text-ink/80`}>{story.body}</p>
      {story.progress !== undefined && (
        <div className="mt-3">
          <div className="h-2.5 overflow-hidden rounded-full bg-soft">
            <div className="h-full rounded-full transition-all duration-500" style={{ width: `${Math.max(4, story.progress * 100)}%`, background: story.tone }} />
          </div>
          <div className="mt-1 text-sm text-muted">Cooling progress · {story.progressLabel}</div>
        </div>
      )}
      {snapshot.control.paused && (
        <span className="mt-2 inline-block rounded-full bg-warn/15 px-3 py-0.5 text-sm font-bold text-warn">Paused</span>
      )}
    </div>
  );
}
