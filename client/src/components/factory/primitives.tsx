import { useRef, type ReactNode } from 'react';
import { useFrame } from '@react-three/fiber';
import type * as THREE from 'three';
import { useScene } from './SceneContext';

type V3 = [number, number, number];

/** Standard material. In thermal view machinery turns see-through so the heat map shows. */
export function Mat({
  color, emissive, ei = 0, metalness = 0.35, roughness = 0.55,
}: { color: string; emissive?: string; ei?: number; metalness?: number; roughness?: number }) {
  const { thermalView } = useScene();
  return (
    <meshStandardMaterial
      key={thermalView ? 't' : 'n'}
      color={color}
      emissive={emissive ?? '#000000'}
      emissiveIntensity={ei}
      metalness={metalness}
      roughness={roughness}
      transparent={thermalView}
      opacity={thermalView ? 0.25 : 1}
      depthWrite={!thermalView}
    />
  );
}

export function Box({ pos, size, color, rot, emissive, ei }: {
  pos: V3; size: V3; color: string; rot?: V3; emissive?: string; ei?: number;
}) {
  return (
    <mesh position={pos} rotation={rot}>
      <boxGeometry args={size} />
      <Mat color={color} emissive={emissive} ei={ei} />
    </mesh>
  );
}

export function Cyl({ pos, r, h, color, rot, seg = 24 }: {
  pos: V3; r: number; h: number; color: string; rot?: V3; seg?: number;
}) {
  return (
    <mesh position={pos} rotation={rot}>
      <cylinderGeometry args={[r, r, h, seg]} />
      <Mat color={color} />
    </mesh>
  );
}

export function Lamp({ pos, color, r = 0.1 }: { pos: V3; color: string; r?: number }) {
  return (
    <mesh position={pos}>
      <sphereGeometry args={[r, 12, 12]} />
      <meshStandardMaterial color={color} emissive={color} emissiveIntensity={1.6} />
    </mesh>
  );
}

/** Small boxes sliding along a conveyor. */
export function Packages({ length, y, z, count = 5, speed = 0.6, color = '#C08B4C' }: {
  length: number; y: number; z: number; count?: number; speed?: number; color?: string;
}) {
  const refs = useRef<(THREE.Mesh | null)[]>([]);
  useFrame((s) => {
    const t = s.clock.elapsedTime;
    refs.current.forEach((m, i) => {
      if (m) m.position.x = ((t * speed + (i * length) / count) % length) - length / 2;
    });
  });
  return (
    <>
      {Array.from({ length: count }, (_, i) => (
        <mesh key={i} ref={(el) => { refs.current[i] = el; }} position={[0, y, z]}>
          <boxGeometry args={[0.55, 0.42, 0.55]} />
          <Mat color={color} metalness={0.05} roughness={0.9} />
        </mesh>
      ))}
    </>
  );
}

/** A spinning group (fan blades). Speed in radians per second. */
export function Spinner({ speed, children, pos }: { speed: number; children: ReactNode; pos: V3 }) {
  const ref = useRef<THREE.Group>(null);
  const speedRef = useRef(speed);
  speedRef.current = speed;
  useFrame((_, dt) => {
    if (ref.current) ref.current.rotation.y += dt * speedRef.current;
  });
  return <group ref={ref} position={pos}>{children}</group>;
}
