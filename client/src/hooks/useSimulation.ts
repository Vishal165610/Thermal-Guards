import { useCallback, useEffect, useRef, useState } from 'react';
import type { ActionId, ScenarioId, SimulationSnapshot, ZoneId } from '@shared/types';
import { ACTIONS } from '@shared/actions';
import { ZONE_IDS } from '@shared/zones';
import { SimulationService } from '../local/service';

/** Each browser tab owns its own simulation. No network connection or persistent server. */
export function useSimulation() {
  const [snapshot, setSnapshot] = useState<SimulationSnapshot | null>(null);
  const [connected, setConnected] = useState(false);
  const serviceRef = useRef<SimulationService | null>(null);
  const publish = useCallback(() => {
    const service = serviceRef.current;
    if (service) setSnapshot(service.snapshot());
  }, []);

  useEffect(() => {
    const service = new SimulationService();
    serviceRef.current = service;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const schedule = () => {
      if (cancelled) return;
      timer = setTimeout(() => {
        if (!service.paused) { service.tick(); setSnapshot(service.snapshot()); }
        schedule();
      }, service.tickIntervalMs());
    };
    void service.init().then(() => {
      if (cancelled) return;
      setSnapshot(service.snapshot());
      setConnected(true);
      schedule();
    }).catch((error: unknown) => {
      console.error('Browser simulation failed to initialize', error);
      if (!cancelled) setConnected(false);
    });
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
      serviceRef.current = null;
    };
  }, []);

  const setScenario = useCallback((scenario: ScenarioId, zoneId?: ZoneId) => {
    if (!['normal', 'cooling-failure', 'machine-overheating', 'fire'].includes(scenario)) return;
    serviceRef.current?.setScenario(scenario, zoneId && ZONE_IDS.includes(zoneId) ? zoneId : undefined);
    publish();
  }, [publish]);
  const reset = useCallback(() => { serviceRef.current?.reset(); publish(); }, [publish]);
  const control = useCallback((p: { paused?: boolean; speed?: number; stepOnce?: boolean }) => {
    serviceRef.current?.control(p); publish();
  }, [publish]);
  const applyAction = useCallback((actionId: ActionId, zoneId?: ZoneId, faultId?: string) => {
    if (!ACTIONS.some(a => a.id === actionId)) return;
    serviceRef.current?.applyAction(actionId, zoneId && ZONE_IDS.includes(zoneId) ? zoneId : undefined, faultId);
    publish();
  }, [publish]);
  const acknowledge = useCallback((id: string) => {
    serviceRef.current?.acknowledge(id); publish();
  }, [publish]);
  return { snapshot, connected, setScenario, reset, acknowledge, control, applyAction };
}
