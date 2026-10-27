import { Box, Cyl, Lamp, Mat, Packages, Spinner } from './primitives';
import { useScene } from './SceneContext';
import { LEVEL_COLOR } from '../../utils/thermalColors';
import type { ZoneId } from '@shared/types';

// Each model is built from simple primitives, centred on its zone, ~7 x 6 world units.
// Heights are modest so the thermal floor stays readable from the isometric camera.

function useLampColor(id: ZoneId) {
  const { levels } = useScene();
  return LEVEL_COLOR[levels[id]];
}

export function BoilerUnit() {
  const lamp = useLampColor('boiler');
  return (
    <group>
      <Box pos={[0, 0.12, 0]} size={[3.2, 0.24, 3.2]} color="#334155" />
      <Cyl pos={[0, 1.65, 0]} r={1.25} h={3} color="#8B97A8" />
      <mesh position={[0, 3.15, 0]}>
        <sphereGeometry args={[1.25, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <Mat color="#8B97A8" />
      </mesh>
      <Cyl pos={[0, 0.75, 0]} r={1.29} h={0.14} color="#475569" />
      <Cyl pos={[0, 2.4, 0]} r={1.29} h={0.14} color="#475569" />
      {/* pipe 1: rises from the dome then runs sideways */}
      <Cyl pos={[0.5, 3.9, 0]} r={0.17} h={1.4} color="#B45309" />
      <Cyl pos={[2.0, 4.55, 0]} r={0.17} h={3.2} color="#B45309" rot={[0, 0, Math.PI / 2]} />
      {/* pipe 2: low outlet to the other side */}
      <Cyl pos={[-1.9, 0.95, 0.4]} r={0.17} h={1.6} color="#0E7490" rot={[0, 0, Math.PI / 2]} />
      <Cyl pos={[-2.7, 0.55, 0.4]} r={0.17} h={0.8} color="#0E7490" />
      <Box pos={[1.45, 1.6, 0.9]} size={[0.5, 0.7, 0.5]} color="#1E293B" />
      <Lamp pos={[1.45, 2.1, 0.9]} color={lamp} />
    </group>
  );
}

function Machine({ x, lamp }: { x: number; lamp: string }) {
  return (
    <group position={[x, 0, -0.6]}>
      <Box pos={[0, 0.7, 0]} size={[1.7, 1.4, 1.5]} color="#3B6FA0" />
      <Box pos={[0, 1.7, 0]} size={[1.0, 0.6, 0.9]} color="#94A3B8" />
      <Cyl pos={[0.55, 2.2, 0]} r={0.12} h={0.5} color="#64748B" />
      <Box pos={[0, 0.7, 0.78]} size={[1.2, 0.5, 0.06]} color="#0F172A" />
      <Lamp pos={[0.6, 1.25, 0.78]} color={lamp} r={0.08} />
    </group>
  );
}

export function ProductionArea() {
  const lamp = useLampColor('production');
  return (
    <group>
      <Machine x={-1.9} lamp={lamp} />
      <Machine x={1.9} lamp={lamp} />
      {/* small conveyor in front of the machines */}
      <Box pos={[0, 0.3, 1.9]} size={[5.6, 0.3, 1.0]} color="#334155" />
      <Box pos={[0, 0.48, 1.9]} size={[5.4, 0.06, 0.8]} color="#0F172A" />
      {[-2.5, 0, 2.5].map((x) => (
        <Box key={x} pos={[x, 0.12, 1.9]} size={[0.15, 0.24, 1.0]} color="#475569" />
      ))}
      <Packages length={5.4} y={0.75} z={1.9} count={4} speed={0.5} color="#94A3B8" />
    </group>
  );
}

export function CoolingUnit() {
  const { coolingEffectiveness } = useScene();
  const lamp = useLampColor('cooling');
  const fanSpeed = 1 + coolingEffectiveness * 11; // slows down when cooling is failing
  return (
    <group>
      <Box pos={[0, 1.0, 0]} size={[5.2, 2.0, 2.8]} color="#5B7B99" />
      {[-1.8, -1.2, -0.6, 0, 0.6, 1.2, 1.8].map((x) => (
        <Box key={x} pos={[x, 1.0, 1.42]} size={[0.28, 1.3, 0.05]} color="#1E293B" />
      ))}
      {[-1.4, 1.4].map((x) => (
        <group key={x} position={[x, 2.02, 0]}>
          <mesh rotation-x={Math.PI / 2}>
            <torusGeometry args={[0.85, 0.08, 10, 28]} />
            <Mat color="#334155" />
          </mesh>
          <Cyl pos={[0, -0.02, 0]} r={0.82} h={0.04} color="#0F172A" />
          <Spinner speed={fanSpeed} pos={[0, 0.06, 0]}>
            {[0, Math.PI / 2, Math.PI, (3 * Math.PI) / 2].map((a) => (
              <mesh key={a} rotation={[0, a, 0]} position={[Math.cos(a) * 0.4, 0, -Math.sin(a) * 0.4]}>
                <boxGeometry args={[0.7, 0.03, 0.22]} />
                <Mat color="#CBD5E1" />
              </mesh>
            ))}
            <Cyl pos={[0, 0.02, 0]} r={0.12} h={0.08} color="#475569" />
          </Spinner>
        </group>
      ))}
      <Box pos={[-2.5, 0.35, 1.8]} size={[0.5, 0.7, 0.5]} color="#1E293B" />
      <Lamp pos={[-2.5, 0.85, 1.8]} color={lamp} />
    </group>
  );
}

function Shelf({ x, z }: { x: number; z: number }) {
  const levels = [0.25, 1.15, 2.05];
  return (
    <group position={[x, 0, z]}>
      {[[-1.05, -0.38], [1.05, -0.38], [-1.05, 0.38], [1.05, 0.38]].map(([px, pz]) => (
        <Box key={`${px}${pz}`} pos={[px, 1.3, pz]} size={[0.08, 2.6, 0.08]} color="#1D4ED8" />
      ))}
      {levels.map((y, i) => (
        <group key={y}>
          <Box pos={[0, y, 0]} size={[2.2, 0.06, 0.85]} color="#64748B" />
          <Box pos={[-0.55, y + 0.3, 0]} size={[0.75, 0.5, 0.6]} color={i % 2 ? '#B45309' : '#A16207'} />
          <Box pos={[0.45, y + 0.25, 0]} size={[0.6, 0.4, 0.6]} color={i % 2 ? '#A16207' : '#92400E'} />
        </group>
      ))}
    </group>
  );
}

export function StorageArea() {
  const lamp = useLampColor('storage');
  return (
    <group>
      <Shelf x={-1.9} z={-1.5} />
      <Shelf x={1.9} z={-1.5} />
      {/* stacked boxes */}
      <Box pos={[-1.2, 0.45, 1.7]} size={[0.9, 0.9, 0.9]} color="#B45309" />
      <Box pos={[-0.2, 0.45, 1.7]} size={[0.9, 0.9, 0.9]} color="#A16207" />
      <Box pos={[-0.7, 1.35, 1.7]} size={[0.9, 0.9, 0.9]} color="#92400E" />
      <Box pos={[1.6, 0.35, 1.8]} size={[1.1, 0.7, 0.8]} color="#A16207" />
      <Lamp pos={[2.6, 0.2, 2.4]} color={lamp} />
    </group>
  );
}

export function ElectricalControl() {
  const lamp = useLampColor('electrical');
  return (
    <group>
      {[-2.2, 0, 2.2].map((x) => (
        <group key={x} position={[x, 0, -0.4]}>
          <Box pos={[0, 1.2, 0]} size={[1.6, 2.4, 0.9]} color="#64748B" />
          <Box pos={[0, 1.2, 0.47]} size={[1.3, 2.0, 0.04]} color="#475569" />
          <Box pos={[0.5, 1.3, 0.5]} size={[0.08, 0.5, 0.05]} color="#0F172A" />
          {[-0.4, 0, 0.4].map((lx, i) => (
            <Lamp key={lx} pos={[lx, 2.05, 0.52]} r={0.07} color={i === 0 ? lamp : i === 1 ? '#22D3EE' : '#64748B'} />
          ))}
        </group>
      ))}
      <Box pos={[0, 0.1, 1.5]} size={[6.2, 0.2, 0.6]} color="#1E293B" />
      <Box pos={[0, 0.25, 1.5]} size={[6.0, 0.06, 0.45]} color="#CA8A04" />
    </group>
  );
}

export function PackagingArea() {
  const lamp = useLampColor('packaging');
  return (
    <group>
      <Box pos={[0, 0.3, 0.8]} size={[6.2, 0.3, 1.2]} color="#334155" />
      <Box pos={[0, 0.48, 0.8]} size={[6.0, 0.06, 1.0]} color="#0F172A" />
      <Packages length={6.0} y={0.76} z={0.8} count={6} speed={0.7} />
      {/* packing machine arch over the belt */}
      <Box pos={[0.8, 1.1, 0.0]} size={[0.25, 2.2, 0.25]} color="#0E7490" />
      <Box pos={[0.8, 1.1, 1.6]} size={[0.25, 2.2, 0.25]} color="#0E7490" />
      <Box pos={[0.8, 2.25, 0.8]} size={[0.5, 0.4, 2.0]} color="#0891B2" />
      <Lamp pos={[0.8, 2.6, 0.8]} color={lamp} />
      {/* pallet of finished packages */}
      <Box pos={[-2.2, 0.1, -1.6]} size={[1.4, 0.2, 1.4]} color="#78350F" />
      <Box pos={[-2.2, 0.6, -1.6]} size={[1.2, 0.8, 1.2]} color="#C08B4C" />
      <Box pos={[2.2, 0.1, -1.6]} size={[1.4, 0.2, 1.4]} color="#78350F" />
      <Box pos={[2.2, 0.6, -1.6]} size={[1.2, 0.8, 1.2]} color="#C08B4C" />
    </group>
  );
}
