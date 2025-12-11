import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { TreeState } from '../types';
import { easing } from 'maath';

const sparkleVertexShader = `
  uniform float uTime;
  uniform float uPixelRatio;
  attribute float aSize;
  attribute float aRandom;
  
  varying float vAlpha;

  void main() {
    vec3 pos = position;
    
    // Gentle floating movement
    float time = uTime * 0.2;
    pos.x += sin(time + aRandom * 100.0) * 1.0;
    pos.y += cos(time * 0.8 + aRandom * 50.0) * 0.5;
    pos.z += sin(time * 0.5 + aRandom * 20.0) * 1.0;

    vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
    gl_Position = projectionMatrix * mvPosition;

    // Size similar to foliage (approx 0.5 to 1.0 base multiplier)
    gl_PointSize = aSize * uPixelRatio * (120.0 / -mvPosition.z);
  }
`;

const sparkleFragmentShader = `
  uniform float uOpacity;
  
  void main() {
    vec2 center = gl_PointCoord - 0.5;
    float dist = length(center);
    if (dist > 0.5) discard;

    float glow = 1.0 - smoothstep(0.0, 0.5, dist);
    
    // Golden color
    vec3 color = vec3(1.0, 0.85, 0.4); 
    
    gl_FragColor = vec4(color, glow * uOpacity);
  }
`;

interface AmbientSparklesProps {
  treeState: TreeState;
}

export const AmbientSparkles: React.FC<AmbientSparklesProps> = ({ treeState }) => {
  const meshRef = useRef<THREE.Points>(null);
  const shaderRef = useRef<THREE.ShaderMaterial>(null);
  // Increased count for smaller particles
  const count = 400; 

  const { positions, randoms, sizes } = useMemo(() => {
    const pos = new Float32Array(count * 3);
    const rnd = new Float32Array(count);
    const sz = new Float32Array(count);

    for (let i = 0; i < count; i++) {
      const u = Math.random();
      const v = Math.random();
      const theta = 2 * Math.PI * u;
      const phi = Math.acos(2 * v - 1);
      const r = 8 + Math.cbrt(Math.random()) * 15; // Spread out
      
      pos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      pos[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      pos[i * 3 + 2] = r * Math.cos(phi);

      rnd[i] = Math.random();
      // Small size: 0.5 to 1.2
      sz[i] = 0.5 + Math.random() * 0.7; 
    }

    return { positions: pos, randoms: rnd, sizes: sz };
  }, []);

  const uniforms = useMemo(() => ({
    uTime: { value: 0 },
    uPixelRatio: { value: Math.min(window.devicePixelRatio, 2) },
    uOpacity: { value: 1 },
  }), []);

  useFrame((state, delta) => {
    if (shaderRef.current) {
      shaderRef.current.uniforms.uTime.value = state.clock.elapsedTime;
      
      // Visible when Scattered (0.8 opacity), Hidden when Tree (0.0)
      const targetOpacity = treeState === TreeState.SCATTERED ? 0.8 : 0.0;
      easing.damp(shaderRef.current.uniforms.uOpacity, 'value', targetOpacity, 1.0, delta);
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
        vertexShader={sparkleVertexShader}
        fragmentShader={sparkleFragmentShader}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
};