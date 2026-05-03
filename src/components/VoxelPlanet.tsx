import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Float } from '@react-three/drei';
import * as THREE from 'three';

const VOXEL_SIZE = 1.6;
const PLANET_THICKNESS = 8;

export const DIGITS: Record<string, number[][]> = {
  '0': [[1,1,1,1,1,1,1,1],[1,1,1,1,1,1,1,1],[1,1,0,0,0,0,1,1],[1,1,0,0,0,0,1,1],[1,1,0,0,0,0,1,1],[1,1,0,0,0,0,1,1],[1,1,0,0,0,0,1,1],[1,1,1,1,1,1,1,1],[1,1,1,1,1,1,1,1]],
  '1': [[0,0,0,1,1,0,0,0],[0,0,1,1,1,0,0,0],[0,1,1,1,1,0,0,0],[0,0,0,1,1,0,0,0],[0,0,0,1,1,0,0,0],[0,0,0,1,1,0,0,0],[0,0,0,1,1,0,0,0],[1,1,1,1,1,1,1,1],[1,1,1,1,1,1,1,1]],
  '2': [[1,1,1,1,1,1,1,1],[1,1,1,1,1,1,1,1],[0,0,0,0,0,0,1,1],[0,0,0,0,0,0,1,1],[1,1,1,1,1,1,1,1],[1,1,1,1,1,1,1,1],[1,1,0,0,0,0,0,0],[1,1,1,1,1,1,1,1],[1,1,1,1,1,1,1,1]],
  '3': [[1,1,1,1,1,1,1,1],[1,1,1,1,1,1,1,1],[0,0,0,0,0,0,1,1],[0,0,0,0,0,0,1,1],[1,1,1,1,1,1,1,1],[1,1,1,1,1,1,1,1],[0,0,0,0,0,0,1,1],[1,1,1,1,1,1,1,1],[1,1,1,1,1,1,1,1]],
  '4': [[1,1,0,0,0,0,1,1],[1,1,0,0,0,0,1,1],[1,1,0,0,0,0,1,1],[1,1,1,1,1,1,1,1],[1,1,1,1,1,1,1,1],[0,0,0,0,0,0,1,1],[0,0,0,0,0,0,1,1],[0,0,0,0,0,0,1,1]],
  '5': [[1,1,1,1,1,1,1,1],[1,1,0,0,0,0,0,0],[1,1,0,0,0,0,0,0],[1,1,1,1,1,1,1,1],[1,1,1,1,1,1,1,1],[0,0,0,0,0,0,1,1],[0,0,0,0,0,0,1,1],[1,1,1,1,1,1,1,1],[1,1,1,1,1,1,1,1]],
  '6': [[1,1,1,1,1,1,1,1],[1,1,0,0,0,0,0,0],[1,1,1,1,1,1,1,1],[1,1,1,1,1,1,1,1],[1,1,0,0,0,0,1,1],[1,1,0,0,0,0,1,1],[1,1,1,1,1,1,1,1],[1,1,1,1,1,1,1,1]],
  '7': [[1,1,1,1,1,1,1,1],[1,1,1,1,1,1,1,1],[0,0,0,0,0,0,1,1],[0,0,0,0,0,0,1,1],[0,0,0,0,0,0,1,1],[0,0,0,0,0,0,1,1],[0,0,0,0,0,0,1,1]],
  '8': [[1,1,1,1,1,1,1,1],[1,1,0,0,0,0,1,1],[1,1,1,1,1,1,1,1],[1,1,1,1,1,1,1,1],[1,1,0,0,0,0,1,1],[1,1,0,0,0,0,1,1],[1,1,1,1,1,1,1,1],[1,1,1,1,1,1,1,1]],
  '9': [[1,1,1,1,1,1,1,1],[1,1,0,0,0,0,1,1],[1,1,1,1,1,1,1,1],[1,1,1,1,1,1,1,1],[0,0,0,0,0,0,1,1],[0,0,0,0,0,0,1,1],[1,1,1,1,1,1,1,1],[1,1,1,1,1,1,1,1]],
};

export const getSurfacePositions = (number: number) => {
  const points: [number, number][] = [];
  const numberStr = number.toString();
  const digitsCount = numberStr.length;

  numberStr.split('').forEach((char, dIdx) => {
    const map = DIGITS[char] || DIGITS['0'];
    const digitOffsetX = (dIdx - (digitsCount - 1) / 2) * (map[0].length * VOXEL_SIZE + 3);
    const offsetX = (map[0].length * VOXEL_SIZE) / 2;
    const offsetZ = (map.length * VOXEL_SIZE) / 2;

    for (let r = 0; r < map.length; r++) {
      for (let c = 0; c < map[r].length; c++) {
        if (map[r][c] === 1) {
          points.push([
            digitOffsetX + (c * VOXEL_SIZE - offsetX),
            r * VOXEL_SIZE - offsetZ
          ]);
        }
      }
    }
  });
  return points;
};

export const getVoxelData = (number: number) => {
  const voxels: any[] = [];
  const numberStr = number.toString();
  const digitsCount = numberStr.length;

  numberStr.split('').forEach((char, dIdx) => {
    const map = DIGITS[char] || DIGITS['0'];
    const digitOffsetX = (dIdx - (digitsCount - 1) / 2) * (map[0].length * VOXEL_SIZE + 3);
    const offsetX = (map[0].length * VOXEL_SIZE) / 2;
    const offsetZ = (map.length * VOXEL_SIZE) / 2;

    for (let r = 0; r < map.length; r++) {
      for (let c = 0; c < map[r].length; c++) {
        if (map[r][c] === 1) {
          for (let h = 0; h < PLANET_THICKNESS; h++) {
            // Only render if it's an exterior voxel (performance boost)
            const isEdgeX = c === 0 || c === map[r].length - 1 || map[r][c-1] === 0 || map[r][c+1] === 0;
            const isEdgeZ = r === 0 || r === map.length - 1 || (map[r-1] && map[r-1][c] === 0) || (map[r+1] && map[r+1][c] === 0);
            const isEdgeY = h === 0 || h === PLANET_THICKNESS - 1;
            
            if (isEdgeX || isEdgeY || isEdgeZ) {
              const isSurface = h === PLANET_THICKNESS - 1;
              const type = isSurface ? (Math.random() > 0.4 ? 'grass' : 'dirt') : 'dirt';
              const fauna = isSurface && Math.random() > 0.92 ? 'fauna' : type;
              voxels.push({
                pos: new THREE.Vector3(digitOffsetX + (c * VOXEL_SIZE - offsetX), h * VOXEL_SIZE, r * VOXEL_SIZE - offsetZ),
                type: fauna
              });
            }
          }
        }
      }
    }

    if (digitsCount > 1 && dIdx < digitsCount - 1) {
      for (let r = 3; r < 6; r++) {
        for (let h = 0; h < PLANET_THICKNESS; h++) {
          const connectorMapWidth = 4;
          for(let j = 0; j < connectorMapWidth; j++) {
             voxels.push({
               pos: new THREE.Vector3(digitOffsetX + offsetX + (j + 0.5) * VOXEL_SIZE, h * VOXEL_SIZE, (r - 4.5) * VOXEL_SIZE),
               type: h === PLANET_THICKNESS - 1 ? 'grass' : 'dirt'
             });
          }
        }
      }
    }
  });
  return voxels;
};

export const VoxelObject = ({ pos, type }: any) => {
  const color = type === 'grass' ? '#4caf50' : type === 'dirt' ? '#795548' : '#00ffff';
  return (
    <mesh position={pos} castShadow receiveShadow>
      <boxGeometry args={[VOXEL_SIZE - 0.05, VOXEL_SIZE, VOXEL_SIZE - 0.05]} />
      <meshStandardMaterial color={color} roughness={0.8} />
      {type === 'fauna' && (
        <mesh position={[0, VOXEL_SIZE/2 + 0.2, 0]}>
          <boxGeometry args={[0.3, 0.3, 0.3]} />
          <meshStandardMaterial color="#ff5722" emissive="#ff5722" emissiveIntensity={2} />
        </mesh>
      )}
    </mesh>
  );
};

export const DataWaterfall = ({ position }: any) => {
  const points = useMemo(() => Array.from({ length: 15 }, (_, i) => ({
    id: i,
    initialY: i * 0.5,
    speed: 1 + Math.random() * 2
  })), []);

  const elapsedRef = useRef(0);
  const groupRef = useRef<THREE.Group>(null);
  useFrame((state, delta) => {
    if (!groupRef.current) return;
    elapsedRef.current += delta;
    const t = elapsedRef.current;
    points.forEach((p, i) => {
      const child = groupRef.current?.children[i];
      if (child) child.position.y = ((p.initialY - t * p.speed) % 8) + 4;
    });
  });

  return (
    <group position={position}>
      <group ref={groupRef}>
        {points.map(p => (
          <mesh key={p.id}>
            <boxGeometry args={[0.4, 0.4, 0.4]} />
            <meshStandardMaterial color="#00ffff" emissive="#00ffff" emissiveIntensity={3} transparent opacity={0.6} />
          </mesh>
        ))}
      </group>
      <pointLight color="#00ffff" intensity={2} distance={10} />
    </group>
  );
};

export const BugObstacle = ({ position }: any) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const phase = useMemo(() => Math.random() * Math.PI * 2, []);
  const speed = useMemo(() => 1 + Math.random() * 2, []);
  const elapsedRef = useRef(0);

  useFrame((state, delta) => {
    if (meshRef.current) {
      elapsedRef.current += delta;
      const t = elapsedRef.current;
      meshRef.current.position.y = position[1] + Math.sin(t * speed + phase) * 0.4;
      meshRef.current.rotation.x += 0.05;
      meshRef.current.rotation.y += 0.05;
    }
  });

  return (
    <mesh ref={meshRef} position={position}>
      <boxGeometry args={[0.8, 0.8, 0.8]} />
      <meshStandardMaterial color="#ff3333" emissive="#ff0000" emissiveIntensity={2} />
      <pointLight intensity={2} distance={5} color="red" />
    </mesh>
  );
};

export const Portal = ({ position }: any) => {
  return (
    <group position={position}>
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[2.5, 0.2, 16, 48]} />
        <meshStandardMaterial color="#00ffff" emissive="#00ffff" emissiveIntensity={5} />
      </mesh>
      <Float speed={5} rotationIntensity={2}>
        <mesh>
          <octahedronGeometry args={[1, 0]} />
          <meshStandardMaterial color="#fff" emissive="#00ffff" />
        </mesh>
      </Float>
      <pointLight intensity={20} distance={15} color="#00ffff" />
    </group>
  );
};
