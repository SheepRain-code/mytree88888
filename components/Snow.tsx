import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { TreeState } from '../types';
import { easing } from 'maath';

const snowVertexShader = `
  uniform float uTime;
  uniform float uHeight;
  uniform float uSpeed;
  attribute float aRandom;
  attribute float aSize;
  
  varying float vAlpha;

  void main() {
    vec3 pos = position;
    
    // Falling logic
    float fallOffset = uTime * uSpeed * (0.5 + aRandom);
    pos.y = mod(pos.y - fallOffset, uHeight) - (uHeight * 0.5);
    
    // Gentle swaying logic
    pos.x += sin(uTime * 0.5 + aRandom * 10.0) * 0.5;
    pos.z += cos(uTime * 0.3 + aRandom * 10.0) * 0.5;

    vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
    gl_Position = projectionMatrix * mvPosition;

    // Size attenuation - reduced multiplier for smaller snow
    gl_PointSize = aSize * (100.0 / -mvPosition.z);
  }
`;

const snowFragmentShader = `
  uniform float uOpacity;
  
  void main() {
    // Circular particle
    vec2 center = gl_PointCoord - 0.5;
    float dist = length(center);
    if (dist > 0.5) discard;

    // Soft edge
    float alpha = (1.0 - smoothstep(0.3, 0.5, dist)) * uOpacity;
    
    // Snow is white
    gl_FragColor = vec4(1.0, 1.0, 1.0, alpha);
  }
`;

interface SnowProps {
  treeState: TreeState;
}

export const Snow: React.FC<SnowProps> = ({ treeState }) => {
  const meshRef = useRef<THREE.Points>(null);
  const shaderRef = useRef<THREE.ShaderMaterial>(null);
  
  // Drastically reduced count for subtle ambience
  const count = 300; 
  const height = 25;

  const { positions, randoms, sizes } = useMemo(() => {
    const pos = new Float32Array(count * 3);
    const rnd = new Float32Array(count);
    const sz = new Float32Array(count);

    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 25; // Wider x spread
      pos[i * 3 + 1] = (Math.random() - 0.5) * height; 
      pos[i * 3 + 2] = (Math.random() - 0.5) * 25; // Wider z spread

      rnd[i] = Math.random();
      // Size: 0.5 to 1.5 (Much smaller than foliage which is ~1.0-3.0 range visually)
      sz[i] = 0.5 + Math.random(); 
    }

    return { positions: pos, randoms: rnd, sizes: sz };
  }, []);

  const uniforms = useMemo(() => ({
    uTime: { value: 0 },
    uHeight: { value: height },
    uSpeed: { value: 1.5 }, // Slower fall
    uOpacity: { value: 0 },
  }), [height]);

  useFrame((state, delta) => {
    if (shaderRef.current) {
      shaderRef.current.uniforms.uTime.value = state.clock.elapsedTime;
      
      // Only show snow when tree is formed, max opacity reduced to 0.4 for subtlety
      const targetOpacity = treeState === TreeState.TREE_SHAPE ? 0.4 : 0.0;
      easing.damp(shaderRef.current.uniforms.uOpacity, 'value', targetOpacity, 2.0, delta);
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
        vertexShader={snowVertexShader}
        fragmentShader={snowFragmentShader}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
};