import React, { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { easing } from 'maath';
import { TreeState } from '../types';
import { getRandomSpherePoint } from '../utils/math';

const spiralVertexShader = `
  uniform float uTime;
  uniform float uProgress;
  uniform float uPixelRatio;
  
  attribute vec3 aScatterPos;
  attribute vec3 aTreePos;
  attribute float aSize;
  attribute float aRandom;
  attribute vec3 aColor;
  
  varying float vAlpha;
  varying vec3 vColor;
  
  float easeInOutCubic(float x) {
    return x < 0.5 ? 4.0 * x * x * x : 1.0 - pow(-2.0 * x + 2.0, 3.0) / 2.0;
  }

  void main() {
    float t = easeInOutCubic(uProgress);
    // Add randomness to the transition timing per particle
    float delayedT = clamp(t * 1.5 - (aRandom * 0.5), 0.0, 1.0);

    vec3 pos = mix(aScatterPos, aTreePos, delayedT);

    // Add some organic movement when scattered
    if (uProgress < 0.95) {
       pos.y += sin(uTime + aRandom * 10.0) * 0.1 * (1.0 - uProgress);
    }

    vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
    gl_Position = projectionMatrix * mvPosition;

    gl_PointSize = aSize * uPixelRatio * (100.0 / -mvPosition.z);
    
    // Fade out slightly when scattered
    vAlpha = 0.4 + 0.6 * uProgress;
    vColor = aColor;
  }
`;

const spiralFragmentShader = `
  uniform float uTime;
  varying float vAlpha;
  varying vec3 vColor;
  
  void main() {
    vec2 center = gl_PointCoord - 0.5;
    float dist = length(center);
    if (dist > 0.5) discard;
    
    // Soft core
    float glow = 1.0 - smoothstep(0.1, 0.5, dist);
    
    gl_FragColor = vec4(vColor, vAlpha * glow);
  }
`;

interface SpiralGarlandProps {
  treeState: TreeState;
}

export const SpiralGarland: React.FC<SpiralGarlandProps> = ({ treeState }) => {
  const shaderRef = useRef<THREE.ShaderMaterial>(null);

  // Generate data for both the core wire (dense) and the bulbs (sparse)
  const { positions, scatterPositions, treePositions, sizes, randoms, colors } = useMemo(() => {
    // 1. Generate the curve
    const points = [];
    const yStart = -5.0;
    const yEnd = 5.0; 
    const turns = 3.5;
    const curveSteps = 150; // Used for CatmullRom calculation
    
    for (let i = 0; i <= curveSteps; i++) {
      const t = i / curveSteps;
      const y = THREE.MathUtils.lerp(yStart, yEnd, t);
      const relativeH = (y - yStart) / (yEnd - yStart);
      const radius = (5.5 * (1 - relativeH)) + 0.6; 
      const angle = t * Math.PI * 2 * turns;
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;
      points.push(new THREE.Vector3(x, y, z));
    }
    const curve = new THREE.CatmullRomCurve3(points);
    
    // 2. Define particle counts
    const wireCount = 3500; // Dense particles to form the line
    const bulbCount = 600;  // Surrounding glow lights
    const totalCount = wireCount + bulbCount;

    const pos = new Float32Array(totalCount * 3);
    const scatter = new Float32Array(totalCount * 3);
    const tree = new Float32Array(totalCount * 3);
    const sz = new Float32Array(totalCount);
    const rnd = new Float32Array(totalCount);
    const col = new Float32Array(totalCount * 3);

    // 3. Fill Wire Particles
    for (let i = 0; i < wireCount; i++) {
        const t = i / wireCount;
        const pt = curve.getPointAt(t);
        
        // Tree Position: Exact curve
        tree[i*3] = pt.x;
        tree[i*3+1] = pt.y;
        tree[i*3+2] = pt.z;

        // Scatter Position: Random
        const sPos = getRandomSpherePoint(18);
        scatter[i*3] = sPos.x;
        scatter[i*3+1] = sPos.y;
        scatter[i*3+2] = sPos.z;

        // Initial Pos
        pos[i*3] = sPos.x;
        pos[i*3+1] = sPos.y;
        pos[i*3+2] = sPos.z;
        
        // Size: Small for wire
        sz[i] = 0.3; 
        
        // Color: Warm Luxurious Gold (Lower intensity than previous)
        // Previous was vec3(2.5, 2.1, 0.3)
        // New: More amber/warm, less blinding
        col[i*3] = 1.3;
        col[i*3+1] = 0.95;
        col[i*3+2] = 0.4;
        
        rnd[i] = Math.random();
    }

    // 4. Fill Bulb Particles
    for (let i = wireCount; i < totalCount; i++) {
        const t = Math.random();
        const pt = curve.getPointAt(t);
        const jitter = 0.35;
        
        // Tree Position: Near curve
        tree[i*3] = pt.x + (Math.random() - 0.5) * jitter;
        tree[i*3+1] = pt.y + (Math.random() - 0.5) * jitter;
        tree[i*3+2] = pt.z + (Math.random() - 0.5) * jitter;

        // Scatter Position
        const sPos = getRandomSpherePoint(20);
        scatter[i*3] = sPos.x;
        scatter[i*3+1] = sPos.y;
        scatter[i*3+2] = sPos.z;
        
        // Initial Pos
        pos[i*3] = sPos.x;
        pos[i*3+1] = sPos.y;
        pos[i*3+2] = sPos.z;

        // Size: Reduced (was 0.8 + rand*0.5)
        sz[i] = 0.5 + Math.random() * 0.4;

        // Color: Keep bulbs slightly brighter to sparkle
        col[i*3] = 2.0;
        col[i*3+1] = 1.7;
        col[i*3+2] = 0.8;

        rnd[i] = Math.random();
    }

    return { 
        positions: pos, 
        scatterPositions: scatter, 
        treePositions: tree, 
        sizes: sz, 
        randoms: rnd,
        colors: col
    };
  }, []);

  const uniforms = useMemo(() => ({
    uTime: { value: 0 },
    uProgress: { value: 0 },
    uPixelRatio: { value: Math.min(window.devicePixelRatio, 2) }
  }), []);

  useFrame((state, delta) => {
    if (shaderRef.current) {
        shaderRef.current.uniforms.uTime.value = state.clock.elapsedTime;
        
        const targetProgress = treeState === TreeState.TREE_SHAPE ? 1.0 : 0.0;
        // Use smooth damping for the transition
        easing.damp(shaderRef.current.uniforms.uProgress, 'value', targetProgress, 1.2, delta);
    }
  });

  return (
    <points>
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
            attach="attributes-aSize" 
            count={sizes.length} 
            array={sizes} 
            itemSize={1} 
        />
        <bufferAttribute 
            attach="attributes-aRandom" 
            count={randoms.length} 
            array={randoms} 
            itemSize={1} 
        />
        <bufferAttribute 
            attach="attributes-aColor" 
            count={colors.length / 3} 
            array={colors} 
            itemSize={3} 
        />
      </bufferGeometry>
      <shaderMaterial 
        ref={shaderRef}
        vertexShader={spiralVertexShader}
        fragmentShader={spiralFragmentShader}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
};