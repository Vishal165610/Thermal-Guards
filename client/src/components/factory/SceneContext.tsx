import { createContext, useContext } from 'react';
import type { ZoneId, ZoneState } from '@shared/types';
import type { DisplayLevel } from '../../utils/thermalColors';

export interface SceneState {
  thermalView: boolean;
  selected: ZoneId;
  levels: Record<ZoneId, DisplayLevel>;
  zones: Record<ZoneId, ZoneState>;
  coolingEffectiveness: number;
  onSelect: (id: ZoneId) => void;
}

export const SceneContext = createContext<SceneState | null>(null);

export function useScene(): SceneState {
  const ctx = useContext(SceneContext);
  if (!ctx) throw new Error('useScene must be used inside SceneContext.Provider');
  return ctx;
}
