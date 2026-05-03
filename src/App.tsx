import React, { useState, useEffect, Suspense, useMemo } from 'react';
import { Canvas } from '@react-three/fiber';
import { Float, Text, OrbitControls, Environment, KeyboardControls } from '@react-three/drei';
import * as THREE from 'three';
import { AnimatePresence } from 'motion/react';
import { GameEngine } from './components/GameEngine';
import { GameUI } from './components/GameUI';
import { getSurfacePositions } from './components/VoxelPlanet';
import { EffectComposer, Bloom, Vignette, Scanline } from '@react-three/postprocessing';
import { audio } from './utils/AudioSystem';

type GameState = 'start' | 'playing' | 'gameOver' | 'won';

const BUG_COUNT = 15;
const VOXEL_SIZE = 1.6;
const PLANET_THICKNESS = 8;
const PLANET_SURFACE_Y = (PLANET_THICKNESS - 1) * VOXEL_SIZE + VOXEL_SIZE / 2;

export default function App() {
  const [gameState, setGameState] = useState<GameState>('start');
  const [level, setLevel] = useState(10);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(45);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [flash, setFlash] = useState(0);

  const levelData = useMemo(() => {
    const surfacePoints = getSurfacePositions(level);
    if (surfacePoints.length === 0) return { portalPos: [0, 0, 0], bugPositions: [] };

    const portalIdx = Math.floor(surfacePoints.length * 0.85);
    const pPoint = surfacePoints[Math.min(portalIdx, surfacePoints.length - 1)];
    const portalPos: [number, number, number] = [pPoint[0], PLANET_SURFACE_Y + 1, pPoint[1]];

    const bugPositions = Array.from({ length: BUG_COUNT }, () => {
      const bIdx = Math.floor(Math.random() * surfacePoints.length);
      const bPoint = surfacePoints[bIdx];
      return [bPoint[0], PLANET_SURFACE_Y + 0.5, bPoint[1]] as [number, number, number];
    });

    return { portalPos, bugPositions };
  }, [level]);

  useEffect(() => {
    if (gameState === 'playing') {
      const timer = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) { setGameState('gameOver'); return 0; }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [gameState]);

  const handleWin = () => {
    audio.playWin();
    if (level > 0) {
      setLevel(l => l - 1);
      setScore(s => s + 1000);
      setTimeLeft(t => Math.min(99, t + 30));
    } else {
      setGameState('won');
    }
  };

  const handleHit = () => {
    audio.playHit();
    setScore(s => Math.max(0, s - 200));
    setFlash(f => f + 1);
  };

  const keyMap = [
    { name: 'forward', keys: ['ArrowUp', 'KeyW'] },
    { name: 'backward', keys: ['ArrowDown', 'KeyS'] },
    { name: 'left', keys: ['ArrowRight', 'KeyD'] },
    { name: 'right', keys: ['ArrowLeft', 'KeyA'] },
    { name: 'jump', keys: ['Space'] },
    { name: 'dash', keys: ['ShiftLeft', 'ShiftRight'] },
    { name: 'shoot', keys: ['KeyE', 'Enter'] },
  ];

  return (
    <div className="relative w-full h-screen bg-[#050505] overflow-hidden select-none">
      <KeyboardControls map={keyMap}>
        <Canvas shadows={{ type: THREE.PCFShadowMap }} camera={{ position: [0, 20, 35], fov: 60 }}>
          <fog attach="fog" args={['#050505', 20, 100]} />

          <Suspense fallback={null}>
            {gameState === 'playing' ? (
              <GameEngine
                level={level}
                gameState={gameState}
                levelData={levelData}
                onWinLevel={handleWin}
                onHitBug={handleHit}
                gravity={-35}
              />
            ) : (
              <group>
                <Float speed={1.5} rotationIntensity={0.5}>
                  <Text fontSize={4} position={[0, 10, 0]} color="#00ff88" anchorX="center" font="https://fonts.gstatic.com/s/spacegrotesk/v15/V8mQoQDjQSkFtoMM3T6rjS3F9_PtcWID2eA.woff">
                    {gameState === 'start' ? 'MATRIX GALAXY' : gameState === 'won' ? 'COMPILATION COMPLETE' : 'SYSTEM HALTED'}
                  </Text>
                  <Text fontSize={1.5} position={[0, 6, 0]} color="#00ff88" anchorX="center">
                    {gameState === 'start' ? 'CONTADOR' : ''}
                  </Text>
                  {gameState !== 'start' && (
                    <Text fontSize={1.5} position={[0, 5, 0]} color="white" anchorX="center">
                      {gameState === 'won' ? 'ALL WORLDS COMPILED' : `LEVEL ${level} FAILED`}
                    </Text>
                  )}
                </Float>
                <OrbitControls autoRotate enableZoom={false} enablePan={false} />
              </group>
            )}

            <EffectComposer disableNormalPass>
              <Bloom
                intensity={1.5}
                luminanceThreshold={0.4}
                luminanceSmoothing={0.9}
                mipmapBlur
              />
              <Vignette eskil={false} offset={0.1} darkness={1.1} />
              <Scanline opacity={0.05} />
            </EffectComposer>

            <Environment preset="night" />
            <ambientLight intensity={0.5} />
            <spotLight position={[30, 50, 30]} angle={0.25} penumbra={1} intensity={2} castShadow />
          </Suspense>
        </Canvas>
      </KeyboardControls>

      <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-[#00ff88]/10 to-transparent pointer-events-none" />

      <GameUI
        level={level}
        score={score}
        timeLeft={timeLeft}
        gameState={gameState}
        onStart={() => {
          audio.init();
          if (gameState !== 'playing') {
            setScore(0);
            setTimeLeft(45);
            setLevel(10);
            setGameState('playing');
          }
        }}
      />
    </div>
  );
}
