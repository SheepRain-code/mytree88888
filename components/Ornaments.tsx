import React, { useMemo, useRef, useLayoutEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { getRandomSpherePoint } from '../utils/math';
import { TreeState } from '../types';

interface OrnamentGroupProps {
  count: number;
  treeState: TreeState;
  color: string;
  type: 'sphere' | 'diamond';
  weight: number; 
  scaleMultiplier: number;
  roughness?: number;
  metalness?: number;
  spiralPhase?: number; // Offset for spiral rotation
}

const tempObject = new THREE.Object3D();
const tempColor = new THREE.Color();
const tempRibbonColor = new THREE.Color();

// --- POSITIONING HELPERS ---

// 1. Gift Boxes: Bottom heavy piles, random angles
const getGiftBoxPoint = (height: number, baseRadius: number, yOffset: number): THREE.Vector3 => {
  const r = Math.random();
  const bias = Math.pow(r, 2.8); // Very bottom heavy
  const maxRelativeHeight = 0.6;
  const y = yOffset - (height / 2) + (bias * height * maxRelativeHeight);
  
  const relativeHeight = (y - yOffset + height / 2) / height;
  const radiusAtHeight = baseRadius * (1 - relativeHeight);
  
  const theta = Math.random() * Math.PI * 2;
  const dist = radiusAtHeight * (0.5 + Math.random() * 0.7); 
  
  const x = dist * Math.cos(theta);
  const z = dist * Math.sin(theta);
  
  return new THREE.Vector3(x, y, z);
};

// 2. Spheres: Spiral distribution
const getSpiralPoint = (height: number, baseRadius: number, yOffset: number, phase: number): THREE.Vector3 => {
  const t = Math.random();
  const biasedT = Math.pow(t, 1.5); 
  const maxH = 0.85; 
  const relativeHeight = biasedT * maxH;
  const y = yOffset - (height / 2) + (relativeHeight * height);
  const radiusAtHeight = baseRadius * (1 - relativeHeight);
  
  const turns = 3.5;
  const baseTheta = relativeHeight * Math.PI * 2 * turns + phase;
  const noiseSpread = 0.6;
  const theta = baseTheta + (Math.random() - 0.5) * noiseSpread;
  const r = radiusAtHeight * (0.95 + Math.random() * 0.15);
  
  const x = r * Math.cos(theta);
  const z = r * Math.sin(theta);
  
  return new THREE.Vector3(x, y, z);
};

// 3. Tiny Baubles: General distribution but bottom heavy
const getTinyBaublePoint = (height: number, baseRadius: number, yOffset: number): THREE.Vector3 => {
  const r = Math.random();
  // Bias towards bottom (power > 1)
  const bias = Math.pow(r, 2.5); 
  
  // Cap height slightly below top to avoid star collision
  const maxRelativeHeight = 0.9;
  
  const y = yOffset - (height / 2) + (bias * height * maxRelativeHeight);
  
  const relativeHeight = (y - yOffset + height / 2) / height;
  const radiusAtHeight = baseRadius * (1 - relativeHeight);
  
  const theta = Math.random() * Math.PI * 2;
  // Sit on surface
  const rad = radiusAtHeight * (0.9 + Math.random() * 0.15); 
  
  const x = rad * Math.cos(theta);
  const z = rad * Math.sin(theta);
  
  return new THREE.Vector3(x, y, z);
};


// --- STAR TOPPER COMPONENT ---
const TopStar: React.FC<{ treeState: TreeState }> = ({ treeState }) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const lightRef = useRef<THREE.PointLight>(null);
  
  // Raised height
  const treePos = new THREE.Vector3(0, 5.6, 0);
  const scatterPos = useMemo(() => getRandomSpherePoint(15), []);
  const currentPos = useRef(scatterPos.clone());

  const starGeometry = useMemo(() => {
    const shape = new THREE.Shape();
    const points = 5;
    const outerRadius = 0.45;
    const innerRadius = 0.18;
    
    shape.moveTo(0, outerRadius);
    for (let i = 1; i < points * 2; i++) {
        const radius = i % 2 === 0 ? outerRadius : innerRadius;
        const angle = (i / (points * 2)) * Math.PI * 2;
        const x = Math.sin(i * Math.PI / points) * radius;
        const y = Math.cos(i * Math.PI / points) * radius;
        shape.lineTo(x, y);
    }
    shape.closePath();

    return new THREE.ExtrudeGeometry(shape, {
      steps: 1,
      depth: 0.1, 
      bevelEnabled: true,
      bevelThickness: 0.03,
      bevelSize: 0.03,
      bevelSegments: 2
    });
  }, []);
  
  useFrame((state, delta) => {
    if (!meshRef.current) return;
    const target = treeState === TreeState.TREE_SHAPE ? treePos : scatterPos;
    currentPos.current.lerp(target, delta * 1.5);
    
    meshRef.current.position.copy(currentPos.current);
    
    if (treeState === TreeState.TREE_SHAPE) {
        // Reversed rotation direction (+=) to match tree spin
        meshRef.current.rotation.y += delta * 0.2; 
        meshRef.current.rotation.x = 0;
        meshRef.current.rotation.z = 0;
    } else {
        meshRef.current.rotation.y += delta;
        meshRef.current.rotation.z += delta;
    }
    
    const scale = 1.0 + Math.sin(state.clock.elapsedTime * 2) * 0.05;
    meshRef.current.scale.setScalar(scale);
  });

  return (
    <mesh ref={meshRef} geometry={starGeometry}>
      <meshStandardMaterial 
        color="#FFD700" 
        emissive="#FFD700" 
        emissiveIntensity={0.5} 
        toneMapped={false}
        roughness={0.1}
        metalness={1.0}
      />
      <pointLight ref={lightRef} distance={6} intensity={1.0} color="#FFD700" /> 
    </mesh>
  );
};

// --- GIFT BOX COMPONENT ---
const GiftBoxGroup: React.FC<{ count: number; treeState: TreeState }> = ({ count, treeState }) => {
  const boxRef = useRef<THREE.InstancedMesh>(null);
  const ribbonRef = useRef<THREE.InstancedMesh>(null);

  const data = useMemo(() => {
    const items = [];
    const minDistance = 2.0; 
    
    // Updated palette: Mixed luxurious colors
    // Weights: Reduced gold weight to ~6% (was 10%)
    const boxPalette = [
        { color: '#7a1f1f', name: 'burgundy', weight: 0.31 }, 
        { color: '#f2e8d5', name: 'cream', weight: 0.31 }, 
        { color: '#0f3b26', name: 'emerald', weight: 0.32 },
        { color: '#d4af37', name: 'gold', weight: 0.06 } 
    ];

    // Helper to pick random color based on weight
    const pickColor = () => {
        const r = Math.random();
        let sum = 0;
        for (const p of boxPalette) {
            sum += p.weight;
            if (r <= sum) return p;
        }
        return boxPalette[0];
    };

    for (let i = 0; i < count; i++) {
      const tPos = getGiftBoxPoint(12, 5.5, -1);
      
      let sPos = new THREE.Vector3();
      let validPosition = false;
      let attempts = 0;
      while (!validPosition && attempts < 50) {
        sPos = getRandomSpherePoint(18); 
        validPosition = true;
        for (const existingItem of items) {
           if (sPos.distanceTo(existingItem.scatterPos) < minDistance) {
               validPosition = false;
               break;
           }
        }
        attempts++;
      }
      if (!validPosition) sPos = getRandomSpherePoint(22);

      const scale = 0.6 + Math.random() * 0.4; 
      const paletteChoice = pickColor();
      const boxColor = paletteChoice.color;
      
      // Determine ribbon color based on box color for luxury contrast
      let ribbonColor = '#8b0000'; // Default dark red
      if (paletteChoice.name === 'burgundy') ribbonColor = '#d4af37'; // Gold on Red
      if (paletteChoice.name === 'emerald') ribbonColor = '#d4af37'; // Gold on Green
      if (paletteChoice.name === 'gold') ribbonColor = '#7a1f1f'; // Red on Gold
      if (paletteChoice.name === 'cream') ribbonColor = '#7a1f1f'; // Red on Cream

      items.push({
        treePos: tPos,
        scatterPos: sPos,
        currentPos: sPos.clone(),
        scale: new THREE.Vector3(scale, scale, scale),
        rotation: new THREE.Euler(Math.random() * Math.PI, Math.random() * Math.PI, 0),
        rotationSpeed: (Math.random() - 0.5) * 0.02,
        color: boxColor,
        ribbonColor: ribbonColor
      });
    }
    return items;
  }, [count]);

  useFrame((state, delta) => {
    if (!boxRef.current || !ribbonRef.current) return;
    const targetIsTree = treeState === TreeState.TREE_SHAPE;
    const lerpFactor = THREE.MathUtils.clamp(delta * 1.2, 0, 1);

    data.forEach((d, i) => {
      const target = targetIsTree ? d.treePos : d.scatterPos;
      d.currentPos.lerp(target, lerpFactor);
      
      if (!targetIsTree) {
         d.currentPos.y += Math.sin(state.clock.elapsedTime + i) * 0.005;
         d.rotation.x += d.rotationSpeed;
         d.rotation.y += d.rotationSpeed;
      } else {
         d.rotation.y += d.rotationSpeed * 0.1;
      }

      tempObject.position.copy(d.currentPos);
      tempObject.rotation.copy(d.rotation);
      tempObject.scale.copy(d.scale);
      tempObject.updateMatrix();
      
      boxRef.current!.setMatrixAt(i, tempObject.matrix);
      ribbonRef.current!.setMatrixAt(i, tempObject.matrix);
    });
    boxRef.current.instanceMatrix.needsUpdate = true;
    ribbonRef.current.instanceMatrix.needsUpdate = true;
  });

  useLayoutEffect(() => {
    if (boxRef.current && ribbonRef.current) {
        data.forEach((d, i) => {
            tempColor.set(d.color);
            boxRef.current!.setColorAt(i, tempColor);
            tempRibbonColor.set(d.ribbonColor);
            ribbonRef.current!.setColorAt(i, tempRibbonColor);
            
            tempObject.position.copy(d.scatterPos);
            tempObject.updateMatrix();
            boxRef.current!.setMatrixAt(i, tempObject.matrix);
            ribbonRef.current!.setMatrixAt(i, tempObject.matrix);
        });
        boxRef.current.instanceMatrix.needsUpdate = true;
        if (boxRef.current.instanceColor) boxRef.current.instanceColor.needsUpdate = true;
        if (ribbonRef.current.instanceColor) ribbonRef.current.instanceColor.needsUpdate = true;
    }
  }, [data]);

  const boxGeo = useMemo(() => new THREE.BoxGeometry(1, 0.8, 1), []);
  const ribbonGeo = useMemo(() => new THREE.BoxGeometry(0.2, 0.82, 1.02), []);
  const ribbonHGeo = useMemo(() => new THREE.BoxGeometry(1.02, 0.82, 0.2), []);

  return (
    <group>
      <instancedMesh ref={boxRef} args={[boxGeo, undefined, count]} castShadow receiveShadow>
        <meshStandardMaterial roughness={0.6} metalness={0.1} />
      </instancedMesh>
      <instancedMesh ref={ribbonRef} args={[ribbonGeo, undefined, count]}>
        <meshStandardMaterial roughness={0.4} metalness={0.3} /> 
      </instancedMesh>
      <RibbonHorizontal data={data} geometry={ribbonHGeo} treeState={treeState} />
    </group>
  );
};

const RibbonHorizontal: React.FC<{ data: any[], geometry: THREE.BufferGeometry, treeState: TreeState }> = ({ data, geometry, treeState }) => {
    const meshRef = useRef<THREE.InstancedMesh>(null);
    useLayoutEffect(() => {
        if (meshRef.current) {
            data.forEach((d, i) => {
                tempRibbonColor.set(d.ribbonColor);
                meshRef.current!.setColorAt(i, tempRibbonColor);
                tempObject.position.copy(d.scatterPos);
                tempObject.updateMatrix();
                meshRef.current!.setMatrixAt(i, tempObject.matrix);
            });
            meshRef.current.instanceMatrix.needsUpdate = true;
            if (meshRef.current.instanceColor) meshRef.current.instanceColor.needsUpdate = true;
        }
    }, [data]);
    useFrame((state, delta) => {
        if (!meshRef.current) return;
        data.forEach((d, i) => {
            tempObject.position.copy(d.currentPos);
            tempObject.rotation.copy(d.rotation);
            tempObject.scale.copy(d.scale);
            tempObject.updateMatrix();
            meshRef.current!.setMatrixAt(i, tempObject.matrix);
        });
        meshRef.current.instanceMatrix.needsUpdate = true;
    });
    return (
        <instancedMesh ref={meshRef} args={[geometry, undefined, data.length]}>
            <meshStandardMaterial roughness={0.4} metalness={0.3} />
        </instancedMesh>
    );
}

// --- TINY BAUBLES COMPONENT (REPLACING BOWS) ---
const TinyBaublesGroup: React.FC<{ count: number; treeState: TreeState }> = ({ count, treeState }) => {
    const meshRef = useRef<THREE.InstancedMesh>(null);
    
    const data = useMemo(() => {
        return Array.from({ length: count }).map(() => {
            // Helper that biases towards bottom
            const tPos = getTinyBaublePoint(11, 4.6, -1);
            const sPos = getRandomSpherePoint(20);
            
            // Mix of pearl white and soft champagne
            const color = Math.random() > 0.6 ? '#f0f0f0' : '#ffe4b5'; 
            
            return {
                treePos: tPos,
                scatterPos: sPos,
                currentPos: sPos.clone(),
                scale: new THREE.Vector3(0.5, 0.5, 0.5), // Small spheres
                rotation: new THREE.Euler(Math.random() * Math.PI, Math.random() * Math.PI, 0),
                color: color
            };
        });
    }, [count]);
    
    useLayoutEffect(() => {
        if (meshRef.current) {
            data.forEach((d, i) => {
                tempColor.set(d.color);
                meshRef.current!.setColorAt(i, tempColor);
                tempObject.position.copy(d.scatterPos);
                tempObject.scale.copy(d.scale);
                tempObject.updateMatrix();
                meshRef.current!.setMatrixAt(i, tempObject.matrix);
            });
            meshRef.current.instanceMatrix.needsUpdate = true;
            if (meshRef.current.instanceColor) meshRef.current.instanceColor.needsUpdate = true;
        }
    }, [data]);

    useFrame((state, delta) => {
        if (!meshRef.current) return;
        const targetIsTree = treeState === TreeState.TREE_SHAPE;
        const lerpFactor = THREE.MathUtils.clamp(delta * 1.5, 0, 1);
    
        data.forEach((d, i) => {
          const target = targetIsTree ? d.treePos : d.scatterPos;
          d.currentPos.lerp(target, lerpFactor);
          
          if (!targetIsTree) {
             d.currentPos.y += Math.sin(state.clock.elapsedTime + i) * 0.005;
          }
    
          tempObject.position.copy(d.currentPos);
          tempObject.scale.copy(d.scale);
          tempObject.updateMatrix();
          meshRef.current!.setMatrixAt(i, tempObject.matrix);
        });
        meshRef.current.instanceMatrix.needsUpdate = true;
    });

    const geometry = useMemo(() => new THREE.SphereGeometry(0.25, 16, 16), []);

    return (
        <instancedMesh ref={meshRef} args={[geometry, undefined, count]} castShadow receiveShadow>
            <meshStandardMaterial roughness={0.1} metalness={0.8} />
        </instancedMesh>
    );
};

const OrnamentGroup: React.FC<OrnamentGroupProps> = ({ 
  count, 
  treeState, 
  color, 
  type,
  weight,
  scaleMultiplier,
  roughness = 0.1,
  metalness = 0.9,
  spiralPhase = 0
}) => {
  const meshRef = useRef<THREE.InstancedMesh>(null);

  const data = useMemo(() => {
    return Array.from({ length: count }).map(() => {
      const tPos = getSpiralPoint(11, 4.8, -1, spiralPhase); 
      const sPos = getRandomSpherePoint(20);
      const scale = (Math.random() * 0.4 + 0.6) * scaleMultiplier;
      return {
        treePos: tPos,
        scatterPos: sPos,
        currentPos: sPos.clone(), 
        scale: new THREE.Vector3(scale, scale, scale),
        rotation: new THREE.Euler(Math.random() * Math.PI, Math.random() * Math.PI, 0),
        rotationSpeed: (Math.random() - 0.5) * 0.02
      };
    });
  }, [count, scaleMultiplier, spiralPhase]);

  useLayoutEffect(() => {
    if (meshRef.current) {
      data.forEach((d, i) => {
        tempObject.position.copy(d.scatterPos);
        tempObject.rotation.copy(d.rotation);
        tempObject.scale.copy(d.scale);
        tempObject.updateMatrix();
        meshRef.current!.setMatrixAt(i, tempObject.matrix);
      });
      meshRef.current.instanceMatrix.needsUpdate = true;
    }
  }, [data]);

  useFrame((state, delta) => {
    if (!meshRef.current) return;
    const targetIsTree = treeState === TreeState.TREE_SHAPE;
    const lerpFactor = THREE.MathUtils.clamp(delta * (2.0 / (weight + 0.5)), 0, 1);

    data.forEach((d, i) => {
      const target = targetIsTree ? d.treePos : d.scatterPos;
      d.currentPos.lerp(target, lerpFactor);
      if (!targetIsTree) {
          d.currentPos.y += Math.sin(state.clock.elapsedTime + i) * 0.005;
      }
      d.rotation.x += d.rotationSpeed;
      d.rotation.y += d.rotationSpeed;
      
      tempObject.position.copy(d.currentPos);
      tempObject.rotation.set(d.rotation.x, d.rotation.y, d.rotation.z);
      tempObject.scale.copy(d.scale);
      tempObject.updateMatrix();
      meshRef.current!.setMatrixAt(i, tempObject.matrix);
    });
    meshRef.current.instanceMatrix.needsUpdate = true;
  });

  const geometry = useMemo(() => {
    if (type === 'sphere') return new THREE.SphereGeometry(0.3, 32, 32); 
    return new THREE.OctahedronGeometry(0.3, 0); 
  }, [type]);

  return (
    <instancedMesh ref={meshRef} args={[geometry, undefined, count]} castShadow receiveShadow>
      <meshStandardMaterial 
        color={color} 
        roughness={roughness} 
        metalness={metalness} 
        envMapIntensity={2.0} 
      />
    </instancedMesh>
  );
};

export const Ornaments: React.FC<{ treeState: TreeState }> = ({ treeState }) => {
  return (
    <group>
      <TopStar treeState={treeState} />
      
      {/* Replaced Bows with Tiny Baubles (50 count, bottom heavy) */}
      <TinyBaublesGroup count={50} treeState={treeState} />
      
      <OrnamentGroup 
        count={70} 
        treeState={treeState} 
        color="#F3E5AB" 
        type="sphere" 
        weight={0.2}
        scaleMultiplier={0.9}
        roughness={0.05} 
        metalness={1.0}
        spiralPhase={0.0}
      />
      
      <OrnamentGroup 
        count={40} 
        treeState={treeState} 
        color="#4a0404" 
        type="sphere" 
        weight={0.3}
        scaleMultiplier={1.0}
        roughness={0.1}
        metalness={0.8}
        spiralPhase={Math.PI}
      />

      <OrnamentGroup 
        count={30} 
        treeState={treeState} 
        color="#E5E4E2" 
        type="diamond" 
        weight={0.15} 
        scaleMultiplier={0.8}
        roughness={0.0}
        metalness={1.0}
        spiralPhase={Math.PI / 2}
      />

      {/* Reduced count from 90 to 72 (approx 1/5 less) */}
      <GiftBoxGroup count={72} treeState={treeState} />
    </group>
  );
};