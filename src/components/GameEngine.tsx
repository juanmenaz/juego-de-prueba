import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { Programmer } from './Programmer';
import { VoxelObject, DataWaterfall, Portal, BugObstacle, getVoxelData } from './VoxelPlanet';

interface GameEngineProps {
  level: number;
  gameState: string;
  levelData: any;
  onWinLevel: () => void;
  onHitBug: () => void;
}

export const GameEngine = ({ level, gameState, levelData, onWinLevel, onHitBug }: GameEngineProps) => {
  const [isHit, setIsHit] = React.useState(false);
  const playerPosRef = useRef(new THREE.Vector3(0, 10, 0));
  const playerUpRef = useRef(new THREE.Vector3(0, 1, 0));
  const cooldownRef = useRef(0);
  const transitionRef = useRef(false);
  const elapsedRef = useRef(0);
  const lastHitTime = useRef(0);
  const [projectiles, setProjectiles] = React.useState<{ id: number; pos: THREE.Vector3; dir: THREE.Vector3; life: number }[]>([]);
  const activeBugsRef = useRef<boolean[]>([]);
  const bugPositionsRef = useRef<THREE.Vector3[]>([]);
  const lastProjectileId = useRef(0);

  // Initialize active bugs if level changes
  useMemo(() => {
    activeBugsRef.current = new Array(levelData.bugPositions.length).fill(true);
    bugPositionsRef.current = levelData.bugPositions.map((p: any) => new THREE.Vector3(...p));
  }, [levelData]);

  const voxels = useMemo(() => getVoxelData(level), [level]);

  useFrame((state, delta) => {
    if (gameState !== 'playing' || transitionRef.current) return;
    
    elapsedRef.current += delta;
    const now = elapsedRef.current;
    const pos = playerPosRef.current;

    // 1. Portal Check
    const portalPos = new THREE.Vector3(...levelData.portalPos);
    if (pos.distanceTo(portalPos) < 5) {
      transitionRef.current = true;
      onWinLevel();
      setTimeout(() => { transitionRef.current = false; }, 1000);
      return;
    }

    // 2. Hazard & AI Logic
    if (now > cooldownRef.current) {
      bugPositionsRef.current.forEach((bPos, i) => {
        if (!activeBugsRef.current[i]) return;
        
        // Simple Chase AI
        const dist = pos.distanceTo(bPos);
        if (dist < 15) {
          const chaseDir = new THREE.Vector3().subVectors(pos, bPos).normalize();
          chaseDir.y = 0; // Move laterally
          bPos.add(chaseDir.multiplyScalar(delta * 6));
          
          // Clamp to surface (simple approach: stay near the same Y as player or use voxels)
          // Since bugs are in 3D, we'll just ensure they don't go below a certain threshold
          if (bPos.y < 11.2) bPos.y = 11.2;
        }

        if (dist < 2.5) {
          cooldownRef.current = now + 1.5;
          setIsHit(true);
          setTimeout(() => setIsHit(false), 200);
          onHitBug();
        }
      });
    }

    // 3. Projectile Logic (Moved to State Update)
    setProjectiles(prev => {
      const next = prev.map(p => ({
        ...p,
        pos: p.pos.clone().add(p.dir.clone().multiplyScalar(delta * 45)),
        life: p.life - delta
      })).filter(p => {
        if (p.life <= 0) return false;
        
        // Collision with bugs
        let hit = false;
        bugPositionsRef.current.forEach((bPos, i) => {
          if (activeBugsRef.current[i] && p.pos.distanceTo(bPos) < 2.2) {
            activeBugsRef.current[i] = false;
            hit = true;
          }
        });
        return !hit;
      });
      return next;
    });
  });

  const handleShoot = (pos: THREE.Vector3, dir: THREE.Vector3) => {
    lastProjectileId.current++;
    setProjectiles(prev => [...prev, {
      id: lastProjectileId.current,
      pos: pos.clone(),
      dir: dir.clone(),
      life: 2.5
    }]);
  };

  return (
    <group key={level}>
      {voxels.map((v, i) => (
        <VoxelObject key={i} pos={v.pos} type={v.type as any} />
      ))}
      
      <DataWaterfall position={[0, -2, -8]} />
      <DataWaterfall position={[10, -2, 4]} />
      <DataWaterfall position={[-10, 0, 8]} />
      
      <Portal position={levelData.portalPos} />
      
      {bugPositionsRef.current.map((p, i) => (
        activeBugsRef.current[i] && <BugObstacle key={i} position={p.toArray()} />
      ))}
      
      {/* Projectiles */}
      {projectiles.map(p => (
        <mesh key={p.id} position={p.pos}>
          <sphereGeometry args={[0.3, 8, 8]} />
          <meshStandardMaterial color="#00ff88" emissive="#00ff88" emissiveIntensity={10} />
          <pointLight color="#00ff88" intensity={5} distance={3} />
        </mesh>
      ))}
      
      <Programmer 
        voxels={voxels} 
        onShoot={handleShoot}
        isHit={isHit}
        onPositionUpdate={(pos, up) => {
          playerPosRef.current.copy(pos);
          playerUpRef.current.copy(up);
        }} 
      />
    </group>
  );
};
