import React, { useRef, useMemo } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { useKeyboardControls } from '@react-three/drei';
import * as THREE from 'three';
import { audio } from '../utils/AudioSystem';

const PLAYER_SPEED = 14;
const VOXEL_SIZE = 1.6;

interface ProgrammerProps {
  voxels: { pos: THREE.Vector3; type: string }[];
  onShoot: (pos: THREE.Vector3, dir: THREE.Vector3) => void;
  isHit: boolean;
  onPositionUpdate: (pos: THREE.Vector3, up: THREE.Vector3) => void;
}

const JUMP_FORCE = 12;
const GRAVITY = 55;
const MAX_SPEED = 20;
const ACCEL = 120;
const FRICTION = 0.82;
const LERP_SPEED = 0.2;

export const Programmer = ({ voxels, onShoot, isHit, onPositionUpdate }: ProgrammerProps) => {
  const groupRef = useRef<THREE.Group>(null);
  const meshRef = useRef<THREE.Group>(null);
  const bodyRef = useRef<THREE.Group>(null);
  
  // Audio/Visual refs
  const leftLegRef = useRef<THREE.Mesh>(null);
  const rightLegRef = useRef<THREE.Mesh>(null);

  const [, getKeys] = useKeyboardControls();
  const { camera } = useThree();

  const voxelGrid = useMemo(() => {
    const grid: Record<string, THREE.Vector3[]> = {};
    const cellSize = 8;
    voxels.forEach(v => {
      const gx = Math.floor(v.pos.x / cellSize);
      const gz = Math.floor(v.pos.z / cellSize);
      const key = `${gx},${gz}`;
      if (!grid[key]) grid[key] = [];
      grid[key].push(v.pos);
    });
    return { grid, cellSize };
  }, [voxels]);

  const state = useRef({
    position: new THREE.Vector3(0, 15, 0),
    velocity: new THREE.Vector3(0, 0, 0),
    up: new THREE.Vector3(0, 1, 0),
    targetUp: new THREE.Vector3(0, 1, 0),
    rotation: 0,
    grounded: false,
    jumpCount: 0,
    dashCooldown: 0,
    dashTime: 0,
    shootCooldown: 0,
    walkCycle: 0,
    isWalking: false,
    squashStretch: new THREE.Vector3(1, 1, 1),
    camShake: new THREE.Vector3(0,0,0)
  });

  useFrame((_state, delta) => {
    if (!groupRef.current || !meshRef.current || !bodyRef.current) return;

    // Limit delta to avoid physics explosions during lag
    const dt = Math.min(delta, 0.05);

    const { forward, backward, left, right, jump, dash, shoot } = getKeys();
    
    // Update Cooldowns
    state.current.dashCooldown = Math.max(0, state.current.dashCooldown - dt);
    state.current.dashTime = Math.max(0, state.current.dashTime - dt);
    state.current.shootCooldown = Math.max(0, state.current.shootCooldown - dt);

    // 1. SURFACE DETECTION (Enhanced)
    const gx = Math.floor(state.current.position.x / voxelGrid.cellSize);
    const gz = Math.floor(state.current.position.z / voxelGrid.cellSize);
    
    let nearestDistSq = Infinity;
    let groundNormal = new THREE.Vector3(0, 1, 0);
    let surfacePoint = new THREE.Vector3(0, -100, 0);

    for (let dx = -2; dx <= 2; dx++) {
      for (let dz = -2; dz <= 2; dz++) {
        const cell = voxelGrid.grid[`${gx + dx},${gz + dz}`];
        if (cell) {
          cell.forEach(vPos => {
            const dSq = state.current.position.distanceToSquared(vPos);
            if (dSq < 80) {
              const toV = new THREE.Vector3().subVectors(state.current.position, vPos);
              const n = new THREE.Vector3();
              const ax = Math.abs(toV.x); const ay = Math.abs(toV.y); const az = Math.abs(toV.z);
              if (ax > ay && ax > az) n.set(Math.sign(toV.x), 0, 0);
              else if (ay > ax && ay > az) n.set(0, Math.sign(toV.y), 0);
              else n.set(0, 0, Math.sign(toV.z));

              if (dSq < nearestDistSq) {
                nearestDistSq = dSq;
                groundNormal.copy(n);
                surfacePoint.copy(vPos);
              }
            }
          });
        }
      }
    }

    state.current.targetUp.lerp(groundNormal, 0.2);
    state.current.up.lerp(state.current.targetUp, 0.1);

    const hoverHeight = VOXEL_SIZE * 0.5 + 0.45;
    const distToSurface = new THREE.Vector3().subVectors(state.current.position, surfacePoint).dot(state.current.up);
    const wasGrounded = state.current.grounded;
    state.current.grounded = distToSurface <= hoverHeight + 0.3;

    if (state.current.grounded && !wasGrounded) {
       state.current.jumpCount = 0;
       state.current.squashStretch.set(1.4, 0.6, 1.4); // Land squash
    }

    // 2. MOVEMENT (Snappy)
    const localRight = new THREE.Vector3(1, 0, 0).applyQuaternion(groupRef.current.quaternion);
    const localForward = new THREE.Vector3(0, 0, 1).applyQuaternion(groupRef.current.quaternion);

    const wishDir = new THREE.Vector3();
    if (forward) wishDir.add(localForward);
    if (backward) wishDir.sub(localForward);
    if (left) wishDir.sub(localRight);
    if (right) wishDir.add(localRight);

    if (wishDir.length() > 0) {
      wishDir.normalize();
      state.current.isWalking = true;
      state.current.walkCycle += dt * 15;
      
      // Fixed rotation for Three.js (atan2(-x, z)) to match clockwise movement
      const targetRot = Math.atan2(-wishDir.dot(localRight), wishDir.dot(localForward));
      state.current.rotation = THREE.MathUtils.lerp(state.current.rotation, targetRot, 0.25);
      
      const accel = state.current.grounded ? ACCEL : ACCEL * 0.5;
      const speedMult = state.current.dashTime > 0 ? 2.5 : 1;
      const moveVel = wishDir.multiplyScalar(accel * dt * speedMult);
      state.current.velocity.add(moveVel);
    } else {
      state.current.isWalking = false;
      state.current.walkCycle = THREE.MathUtils.lerp(state.current.walkCycle, 0, 0.1);
    }

    // Friction
    const upV = state.current.velocity.dot(state.current.up);
    const latV = state.current.velocity.clone().sub(state.current.up.clone().multiplyScalar(upV));
    latV.multiplyScalar(FRICTION);
    if (latV.length() > MAX_SPEED * (state.current.dashTime > 0 ? 2.5 : 1)) {
        latV.normalize().multiplyScalar(MAX_SPEED * (state.current.dashTime > 0 ? 2.5 : 1));
    }
    state.current.velocity.copy(latV).add(state.current.up.clone().multiplyScalar(upV));

    // Actions
    if (jump && state.current.jumpCount < 2) {
      const jumpV = state.current.velocity.dot(state.current.up);
      if (jumpV < 4) {
        audio.playJump();
        state.current.velocity.sub(state.current.up.clone().multiplyScalar(jumpV)); // Reset vertical
        state.current.velocity.add(state.current.up.clone().multiplyScalar(JUMP_FORCE));
        state.current.jumpCount++;
        state.current.grounded = false;
        state.current.squashStretch.set(0.7, 1.5, 0.7); // Jump stretch
      }
    }

    if (dash && state.current.dashCooldown <= 0 && wishDir.length() > 0) {
      audio.playDash();
      state.current.dashCooldown = 1.2;
      state.current.dashTime = 0.2;
      state.current.velocity.add(wishDir.clone().normalize().multiplyScalar(35));
    }

    if (shoot && state.current.shootCooldown <= 0) {
      audio.playShoot();
      state.current.shootCooldown = 0.2;
      const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,1,0), state.current.up);
      const dir = new THREE.Vector3(0,0,1).applyAxisAngle(new THREE.Vector3(0,1,0), state.current.rotation).applyQuaternion(q);
      onShoot(state.current.position.clone().add(state.current.up.clone().multiplyScalar(1)), dir);
    }

    // Physics Integration
    if (state.current.grounded) {
       const snap = (hoverHeight - distToSurface) * 20;
       state.current.position.add(state.current.up.clone().multiplyScalar(snap * dt));
    } else {
       state.current.velocity.sub(state.current.up.clone().multiplyScalar(GRAVITY * dt));
    }

    // Hard floor collision (prevent clipping)
    if (distToSurface < hoverHeight - 0.2) {
       const correction = (hoverHeight - distToSurface);
       state.current.position.add(state.current.up.clone().multiplyScalar(correction));
       if (state.current.velocity.dot(state.current.up) < 0) {
          const vMask = state.current.velocity.dot(state.current.up);
          state.current.velocity.sub(state.current.up.clone().multiplyScalar(vMask));
       }
    }

    state.current.position.add(state.current.velocity.clone().multiplyScalar(dt));

    // Squash & Stretch Lerp back
    state.current.squashStretch.lerp(new THREE.Vector3(1,1,1), 0.15);

    // Transforms
    groupRef.current.position.copy(state.current.position);
    const targetQuat = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), state.current.up);
    groupRef.current.quaternion.slerp(targetQuat, 0.2);
    meshRef.current.rotation.y = state.current.rotation;
    meshRef.current.scale.copy(state.current.squashStretch);

    // Leaning
    const leanAmount = state.current.isWalking ? 0.25 : 0;
    bodyRef.current.rotation.x = THREE.MathUtils.lerp(bodyRef.current.rotation.x, -leanAmount, 0.2);

    // Procedural Anim
    const legS = Math.sin(state.current.walkCycle) * 0.6;
    const bodyB = Math.abs(Math.sin(state.current.walkCycle)) * 0.2;
    bodyRef.current.position.y = 0.5 + bodyB;
    if (leftLegRef.current) leftLegRef.current.rotation.x = legS;
    if (rightLegRef.current) rightLegRef.current.rotation.x = -legS;

    // Advanced Camera (Positioned BEHIND)
    const camTarget = state.current.position.clone().add(state.current.up.clone().multiplyScalar(3));
    const backDir = localForward.clone().multiplyScalar(-22); // localForward is +Z, so backDir is -Z
    const upDir = state.current.up.clone().multiplyScalar(16);
    const targetCamPos = state.current.position.clone().add(backDir).add(upDir);
    
    // Screen Shake
    if (isHit) {
      state.current.camShake.set(
        (Math.random() - 0.5) * 1.5,
        (Math.random() - 0.5) * 1.5,
        (Math.random() - 0.5) * 1.5
      );
      targetCamPos.add(state.current.camShake);
    }

    camera.position.lerp(targetCamPos, 0.12);
    camera.lookAt(camTarget);
    camera.up.lerp(state.current.up, 0.1);

    onPositionUpdate(state.current.position, state.current.up);
  });

  return (
    <group ref={groupRef}>
      <group ref={meshRef}>
        <group ref={bodyRef}>
          {/* Main Body */}
          <mesh position={[0, 0.3, 0]} castShadow>
            <boxGeometry args={[0.7, 0.8, 0.5]} />
            <meshStandardMaterial color="#2d3436" roughness={0.4} />
          </mesh>
          
          {/* Monitor Head */}
          <group position={[0, 1, 0]}>
            <mesh castShadow>
              <boxGeometry args={[1, 0.8, 0.4]} />
            <meshStandardMaterial color={isHit ? "#ff0000" : "#1a1a1a"} metalness={0.8} />
            </mesh>
            <mesh position={[0, 0, 0.21]}>
              <planeGeometry args={[0.8, 0.6]} />
              <meshStandardMaterial color={isHit ? "#ff0000" : "#00ff88"} emissive={isHit ? "#ff0000" : "#00ff88"} emissiveIntensity={isHit ? 10 : 4} />
            </mesh>
          </group>

          {/* Arms */}
          <mesh position={[0.5, 0.3, 0]} rotation={[0.4, 0, 0]}>
            <boxGeometry args={[0.15, 0.6, 0.15]} />
            <meshStandardMaterial color="#2d3436" />
          </mesh>
          <mesh position={[-0.5, 0.3, 0]} rotation={[0.4, 0, 0]}>
            <boxGeometry args={[0.15, 0.6, 0.15]} />
            <meshStandardMaterial color="#2d3436" />
          </mesh>

          {/* Procedural Legs */}
          <mesh ref={leftLegRef} position={[0.25, -0.3, 0]} castShadow>
             <boxGeometry args={[0.2, 0.6, 0.2]} />
             <meshStandardMaterial color="#1a1a1a" />
          </mesh>
          <mesh ref={rightLegRef} position={[-0.25, -0.3, 0]} castShadow>
             <boxGeometry args={[0.2, 0.6, 0.2]} />
             <meshStandardMaterial color="#1a1a1a" />
          </mesh>
        </group>
      </group>
    </group>
  );
};
