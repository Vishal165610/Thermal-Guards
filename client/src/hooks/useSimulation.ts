import { useCallback, useEffect, useRef, useState } from 'react';
import { io, type Socket } from 'socket.io-client';
import type {
  ActionId, ClientToServerEvents, ScenarioId, ServerToClientEvents, SimulationSnapshot, ZoneId,
} from '@shared/types';

type AppSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

/** Connects to the simulation server. The client never invents temperatures: it only displays snapshots. */
export function useSimulation() {
  const [snapshot, setSnapshot] = useState<SimulationSnapshot | null>(null);
  const [connected, setConnected] = useState(false);
  const socketRef = useRef<AppSocket | null>(null);

  useEffect(() => {
    // VITE_SERVER_URL must be set to the public backend URL in Vercel.
    // Keep localhost as a fallback only for local development.
    const configuredUrl = (import.meta.env.VITE_SERVER_URL as string | undefined)?.trim();
    const url = configuredUrl?.replace(/\/$/, '') ||
      (import.meta.env.DEV ? 'http://localhost:4000' : window.location.origin);
    const socket: AppSocket = io(url, { reconnectionDelayMax: 2000 });
    socketRef.current = socket;
    socket.on('connect', () => setConnected(true));
    socket.on('disconnect', () => setConnected(false));
    socket.on('connect_error', () => setConnected(false));
    socket.on('snapshot', (s) => setSnapshot(s));
    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, []);

  const setScenario = useCallback((scenario: ScenarioId, zoneId?: ZoneId) => {
    socketRef.current?.emit('scenario:set', { scenario, zoneId });
  }, []);
  const reset = useCallback(() => {
    socketRef.current?.emit('simulation:reset');
  }, []);
  const control = useCallback((p: { paused?: boolean; speed?: number; stepOnce?: boolean }) => {
    socketRef.current?.emit('simulation:control', p);
  }, []);
  const applyAction = useCallback((actionId: ActionId, zoneId?: ZoneId, faultId?: string) => {
    socketRef.current?.emit('action:apply', { actionId, zoneId, faultId });
  }, []);
  const acknowledge = useCallback((id: string) => {
    socketRef.current?.emit('alert:ack', { id });
  }, []);

  return { snapshot, connected, setScenario, reset, acknowledge, control, applyAction };
}
