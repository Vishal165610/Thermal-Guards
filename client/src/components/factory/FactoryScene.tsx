import { Suspense, useEffect, useMemo, useRef, useState, type ElementRef, type MutableRefObject, type ReactNode } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Grid, Html, Line, OrbitControls, useCursor } from '@react-three/drei';
import type { SimulationSnapshot, ZoneId } from '@shared/types';
import { ZONES, type ZoneConfig } from '@shared/zones';
import { LEVEL_COLOR, displayLevel, fmtTemp, type DisplayLevel } from '../../utils/thermalColors';
import { FLOOR_D, FLOOR_W, zoneRect } from './layout';
import { SceneContext, useScene, type SceneState } from './SceneContext';
import { ThermalOverlay } from './ThermalOverlay';
import {
  BoilerUnit, CoolingUnit, ElectricalControl, PackagingArea, ProductionArea, StorageArea,
} from './ZoneModels';
import type * as THREE from 'three';

export interface CameraApi {
  zoomIn: () => void;
  zoomOut: () => void;
  reset: () => void;
}

const MODEL: Record<ZoneId, () => ReactNode> = {
  boiler: () => <BoilerUnit />,
  production: () => <ProductionArea />,
  cooling: () => <CoolingUnit />,
  storage: () => <StorageArea />,
  electrical: () => <ElectricalControl />,
  packaging: () => <PackagingArea />,
};

const LABEL_HEIGHT: Record<ZoneId, number> = {
  boiler: 5.2, production: 3.3, cooling: 3.5, storage: 3.4, electrical: 3.5, packaging: 3.4,
};

function Beacon({ level, y }: { level: DisplayLevel; y: number }) {
  const ref = useRef<THREE.Mesh>(null);
  const color = LEVEL_COLOR[level];
  useFrame((s) => {
    if (!ref.current) return;
    const pulse = level === 'normal' ? 1 : 1 + 0.35 * Math.sin(s.clock.elapsedTime * 6);
    ref.current.scale.setScalar(pulse);
  });
  return (
    <mesh ref={ref} position={[0, y, 0]}>
      <sphereGeometry args={[0.14, 12, 12]} />
      <meshStandardMaterial color={color} emissive={color} emissiveIntensity={2} />
    </mesh>
  );
}

function ZoneShell({ zone }: { zone: ZoneConfig }) {
  const scene = useScene();
  const [hover, setHover] = useState(false);
  useCursor(hover);
  const rect = zoneRect(zone);
  const level = scene.levels[zone.id];
  const color = LEVEL_COLOR[level];
  const selected = scene.selected === zone.id;
  const state = scene.zones[zone.id];
  const hw = rect.w / 2 - 0.08;
  const hd = rect.d / 2 - 0.08;
  const outline = useMemo<[number, number, number][]>(
    () => [[-hw, 0.09, -hd], [hw, 0.09, -hd], [hw, 0.09, hd], [-hw, 0.09, hd], [-hw, 0.09, -hd]],
    [hw, hd],
  );
  const handlers = {
    onClick: (e: { stopPropagation: () => void }) => { e.stopPropagation(); scene.onSelect(zone.id); },
    onPointerOver: (e: { stopPropagation: () => void }) => { e.stopPropagation(); setHover(true); },
    onPointerOut: () => setHover(false),
  };
  const tint = scene.thermalView ? 0 : selected ? 0.24 : hover ? 0.17 : 0.08;

  return (
    <group position={[rect.cx, 0, rect.cz]}>
      {/* clickable floor tile with status tint */}
      <mesh rotation-x={-Math.PI / 2} position={[0, 0.04, 0]} {...handlers}>
        <planeGeometry args={[rect.w - 0.1, rect.d - 0.1]} />
        <meshBasicMaterial color={color} transparent opacity={tint} depthWrite={false} />
      </mesh>
      <Line
        points={outline}
        color={selected ? '#4F46E5' : color}
        lineWidth={selected ? 3 : 1.5}
        dashed={level === 'predicted'}
        dashSize={0.35}
        gapSize={0.22}
      />
      {/* machinery: clicking any part selects the zone */}
      <group {...handlers}>{MODEL[zone.id]()}</group>
      <Beacon level={level} y={LABEL_HEIGHT[zone.id] - 0.5} />
      <Html position={[0, LABEL_HEIGHT[zone.id], 0]} center zIndexRange={[20, 0]} style={{ pointerEvents: 'none' }}>
        <div
          className="whitespace-nowrap rounded-xl border-2 bg-white/95 px-3 py-1.5 text-center shadow-lg"
          style={{ borderColor: selected ? '#4F46E5' : color, minWidth: 112 }}
        >
          <div className="text-[12px] font-extrabold tracking-wider" style={{ color }}>{zone.shortName}</div>
          <div className="text-xl font-extrabold tabular-nums text-ink">{fmtTemp(state.peakTemp)}</div>
          {level === 'predicted' && <div className="text-[12px] font-bold text-warn">Forecast risk</div>}
          {state.status === 'CRITICAL' && <div className="text-[12px] font-bold text-crit">Limit crossed</div>}
        </div>
      </Html>
    </group>
  );
}

function CameraRig({ apiRef }: { apiRef: MutableRefObject<CameraApi | null> }) {
  const { camera, size } = useThree();
  const controls = useRef<ElementRef<typeof OrbitControls>>(null);
  const baseZoom = Math.max(8, Math.min(size.width / 30, size.height / 19));
  const prevBase = useRef<number | null>(null);

  // Keep the factory the same relative size when the canvas is measured or resized.
  useEffect(() => {
    camera.zoom = prevBase.current === null ? baseZoom : camera.zoom * (baseZoom / prevBase.current);
    prevBase.current = baseZoom;
    camera.updateProjectionMatrix();
  }, [camera, baseZoom]);

  useEffect(() => {
    apiRef.current = {
      zoomIn: () => {
        camera.zoom = Math.min(camera.zoom * 1.25, baseZoom * 5);
        camera.updateProjectionMatrix();
        controls.current?.update();
      },
      zoomOut: () => {
        camera.zoom = Math.max(camera.zoom / 1.25, baseZoom * 0.5);
        camera.updateProjectionMatrix();
        controls.current?.update();
      },
      reset: () => {
        camera.position.set(18, 16, 18);
        camera.zoom = baseZoom;
        camera.updateProjectionMatrix();
        controls.current?.target.set(0, 0, 0);
        controls.current?.update();
      },
    };
  }, [camera, baseZoom, apiRef]);

  return (
    <OrbitControls
      ref={controls}
      makeDefault
      enableDamping
      dampingFactor={0.08}
      maxPolarAngle={Math.PI / 2.15}
      minZoom={baseZoom * 0.5}
      maxZoom={baseZoom * 5}
    />
  );
}

interface Props {
  snapshot: SimulationSnapshot;
  selected: ZoneId;
  onSelect: (id: ZoneId) => void;
  thermalView: boolean;
  apiRef: MutableRefObject<CameraApi | null>;
}

export function FactoryScene({ snapshot, selected, onSelect, thermalView, apiRef }: Props) {
  const scene = useMemo<SceneState>(() => {
    const zones = {} as SceneState['zones'];
    const levels = {} as SceneState['levels'];
    for (const z of snapshot.zones) {
      zones[z.id] = z;
      levels[z.id] = displayLevel(z, snapshot.forecasts.find((f) => f.zoneId === z.id));
    }
    return {
      thermalView, selected, levels, zones, onSelect,
      coolingEffectiveness: snapshot.incident.coolingEffectiveness,
    };
  }, [snapshot.zones, snapshot.forecasts, snapshot.incident.coolingEffectiveness, thermalView, selected, onSelect]);

  const nominal = useMemo(() => {
    const n = {} as Record<ZoneId, number>;
    for (const z of snapshot.zones) n[z.id] = z.nominalTemp;
    return n;
  }, [snapshot.zones]);

  return (
    <Canvas orthographic camera={{ position: [18, 16, 18], zoom: 30, near: 0.1, far: 500 }} dpr={[1, 2]}>
      <color attach="background" args={['#EAF0F9']} />
      <SceneContext.Provider value={scene}>
        <ambientLight intensity={0.95} />
        <hemisphereLight args={['#FFFFFF', '#9FB0C9', 0.6]} />
        <directionalLight position={[10, 16, 8]} intensity={1.1} />

        <Suspense fallback={null}>
          {/* factory floor */}
          <mesh position={[0, -0.2, 0]}>
            <boxGeometry args={[FLOOR_W + 1.2, 0.4, FLOOR_D + 1.2]} />
            <meshStandardMaterial color="#CBD5E4" metalness={0.05} roughness={0.9} />
          </mesh>
          <mesh rotation-x={-Math.PI / 2} position={[0, 0.005, 0]}>
            <planeGeometry args={[FLOOR_W, FLOOR_D]} />
            <meshStandardMaterial color="#F3F6FB" roughness={0.95} />
          </mesh>
          {!thermalView && (
            <Grid
              position={[0, 0.02, 0]}
              args={[FLOOR_W, FLOOR_D]}
              cellSize={0.6}
              cellThickness={0.5}
              cellColor="#D5DDEB"
              sectionSize={2.4}
              sectionThickness={0.9}
              sectionColor="#B8C4D9"
              fadeDistance={80}
              infiniteGrid={false}
            />
          )}
          {ZONES.map((z) => <ZoneShell key={z.id} zone={z} />)}
          {thermalView && <ThermalOverlay values={snapshot.grid.values} ambient={snapshot.ambient} nominal={nominal} />}
        </Suspense>
        <CameraRig apiRef={apiRef} />
      </SceneContext.Provider>
    </Canvas>
  );
}
