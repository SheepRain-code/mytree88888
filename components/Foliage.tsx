import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { getRandomSpherePoint } from '../utils/math';
import { TreeState } from '../types';
import { easing } from 'maath';

// --- SHADERS ---
const vertexShader = `
  uniform float uTime;
  uniform float uProgress; // 0.0 = Scattered, 1.0 = Tree
  uniform float uPixelRatio;

  attribute vec3 aScatterPos;
  attribute vec3 aTreePos;
  attribute float aRandom;
  attribute float aSize;

  varying float vAlpha;
  varying vec3 vColor;
  varying float vSparkle;

  float easeInOutCubic(float x) {
    return x < 0.5 ? 4.0 * x * x * x : 1.0 - pow(-2.0 * x + 2.0, 3.0) / 2.0;
  }

  void main() {
    float t = easeInOutCubic(uProgress);
    float delayedT = clamp(t * 1.2 - (aRandom * 0.2), 0.0, 1.0);

    vec3 pos = mix(aScatterPos, aTreePos, delayedT);

    // Breathing effect
    float breath = sin(uTime * 1.5 + aRandom * 10.0) * 0.03;
    pos += normalize(pos) * breath * (0.5 + 0.5 * uProgress);

    if (uProgress < 0.9) {
       pos.x += sin(uTime * 0.5 + pos.y) * 0.2 * (1.0 - uProgress);
       pos.y += cos(uTime * 0.3 + pos.x) * 0.2 * (1.0 - uProgress);
    }

    vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
    gl_Position = projectionMatrix * mvPosition;

    // --- SPARKLE LOGIC ---
    float sparkleCycle = sin(uTime * 5.0 + aRandom * 50.0);
    float isSparkle = smoothstep(0.992, 1.0, sin(uTime * 3.0 + aRandom * 100.0));
    
    float stateMultiplier = 0.3 + 0.7 * uProgress; 
    float sparkleIntensity = isSparkle * stateMultiplier;

    // --- SIZE CONTROL ---
    // Reduced base size significantly (was 1.1) to resemble fine needles
    float baseSize = aSize * 0.6; 
    
    if (sparkleIntensity > 0.1) {
        baseSize *= 0.6; // Keep sparkles sharp
    }
    
    gl_PointSize = baseSize * uPixelRatio * (200.0 / -mvPosition.z);
    
    // --- COLOR ---
    float heightMix = (aTreePos.y + 5.0) / 10.0;
    vec3 deepPine = vec3(0.005, 0.02, 0.01); 
    vec3 pineTip = vec3(0.02, 0.15, 0.06); 
    vec3 baseColor = mix(deepPine, pineTip, heightMix * 0.8 + breath);
    
    vec3 diamondGold = vec3(1.0, 0.95, 0.8);
    
    vColor = mix(baseColor, diamondGold, sparkleIntensity);
    
    // --- ALPHA CONTROL ---
    float baseAlpha = 0.7 + 0.15 * sparkleCycle; 
    float transparencyFade = 0.6 + 0.4 * uProgress; 

    vAlpha = (baseAlpha * transparencyFade) + (sparkleIntensity * 0.8);
    vSparkle = sparkleIntensity;
  }
`;

const fragmentShader = `
  varying float vAlpha;
  varying vec3 vColor;
  varying float vSparkle;

  void main() {
    vec2 center = gl_PointCoord - 0.5;
    float dist = length(center);
    if (dist > 0.5) discard;

    float glow = 1.0 - smoothstep(0.3, 0.5, dist);
    
    vec3 finalColor = vColor;
    
    if (vSparkle > 0.1) {
        float core = 1.0 - smoothstep(0.0, 0.1, dist);
        finalColor += vec3(1.0, 1.0, 1.0) * core * 2.0; 
    }

    gl_FragColor = vec4(finalColor, vAlpha * glow);
  }
`;

interface FoliageProps {
  count?: number;
  treeState: TreeState;
}

// Local helper to get weighted cone point
const getWeightedFoliagePoint = (height: number, baseRadius: number, yOffset: number): THREE.Vector3 => {
  // Use power function to bias foliage density towards the bottom
  // y goes from 0 (bottom relative) to 1 (top relative) BEFORE scaling
  const r = Math.random();
  // Extreme bias towards bottom (power 6.0) to create a heavy base
  const bias = Math.pow(r, 6.0); 
  
  const y = yOffset - (height / 2) + (bias * height);
  
  const relativeHeight = (y - yOffset + height / 2) / height; 
  const radiusAtHeight = baseRadius * (1 - relativeHeight);
  
  const theta = Math.random() * Math.PI * 2;
  // Slightly increased volume jitter for fluffier look
  const rRad = radiusAtHeight * (0.8 + Math.random() * 0.3); 
  
  const x = rRad * Math.cos(theta);
  const z = rRad * Math.sin(theta);
  
  return new THREE.Vector3(x, y, z);
};

export const Foliage: React.FC<FoliageProps> = ({ count = 140000, treeState }) => {
  const meshRef = useRef<THREE.Points>(null);
  const shaderRef = useRef<THREE.ShaderMaterial>(null);

  const { positions, scatterPositions, treePositions, randoms, sizes } = useMemo(() => {
    const pos = new Float32Array(count * 3);
    const scatter = new Float32Array(count * 3);
    const tree = new Float32Array(count * 3);
    const rnd = new Float32Array(count);
    const sz = new Float32Array(count);

    for (let i = 0; i < count; i++) {
      // Use custom weighted distribution for foliage
      const tPos = getWeightedFoliagePoint(12, 4.5, -1);
      tree[i * 3] = tPos.x;
      tree[i * 3 + 1] = tPos.y;
      tree[i * 3 + 2] = tPos.z;

      const sPos = getRandomSpherePoint(18);
      scatter[i * 3] = sPos.x;
      scatter[i * 3 + 1] = sPos.y;
      scatter[i * 3 + 2] = sPos.z;

      pos[i * 3] = sPos.x;
      pos[i * 3 + 1] = sPos.y;
      pos[i * 3 + 2] = sPos.z;

      rnd[i] = Math.random();
      // Smaller, more uniform needles
      sz[i] = Math.random() < 0.8 ? 0.5 + Math.random() * 0.3 : 1.0 + Math.random() * 0.5; 
    }

    return {
      positions: pos,
      scatterPositions: scatter,
      treePositions: tree,
      randoms: rnd,
      sizes: sz
    };
  }, [count]);

  const uniforms = useMemo(() => ({
    uTime: { value: 0 },
    uProgress: { value: 0 },
    uPixelRatio: { value: Math.min(window.devicePixelRatio, 2) }
  }), []);

  useFrame((state, delta) => {
    if (shaderRef.current) {
      shaderRef.current.uniforms.uTime.value = state.clock.elapsedTime;
      const targetProgress = treeState === TreeState.TREE_SHAPE ? 1.0 : 0.0;
      easing.damp(shaderRef.current.uniforms.uProgress, 'value', targetProgress, 1.5, delta);
    }
  });

  return (
    <points ref={meshRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={positions.length / 3}
          array={positions}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-aScatterPos"
          count={scatterPositions.length / 3}
          array={scatterPositions}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-aTreePos"
          count={treePositions.length / 3}
          array={treePositions}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-aRandom"
          count={randoms.length}
          array={randoms}
          itemSize={1}
        />
        <bufferAttribute
          attach="attributes-aSize"
          count={sizes.length}
          array={sizes}
          itemSize={1}
        />
      </bufferGeometry>
      <shaderMaterial
        ref={shaderRef}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        blending={THREE.NormalBlending} 
      />
    </points>
  );
};