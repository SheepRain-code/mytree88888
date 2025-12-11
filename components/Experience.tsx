import React from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Environment, ContactShadows } from '@react-three/drei';
import { TreeState } from '../types';
import { Foliage } from './Foliage';
import { Ornaments } from './Ornaments';
import { Effects } from './Effects';
import { Snow } from './Snow';
import { SpiralGarland } from './SpiralGarland';
import { AmbientSparkles } from './AmbientSparkles';

interface ExperienceProps {
  treeState: TreeState;
}

export const Experience: React.FC<ExperienceProps> = ({ treeState }) => {
  return (
    <div className="w-full h-screen relative">
      <Canvas
        camera={{ position: [0, 2, 18], fov: 45 }}
        gl={{ antialias: false, toneMappingExposure: 1.5 }} // Increased exposure for brighter look
        dpr={[1, 2]}
      >
        {/* Dark background for contrast, but clean black/green, not muddy */}
        <color attach="background" args={['#010301']} />
        
        {/* REALISTIC BRIGHT LIGHTING SETUP */}
        
        {/* 1. Global Ambient Light - Brighter white for visibility */}
        <ambientLight intensity={1.5} color="#ffffff" />
        
        {/* 2. Main Key Light - Warm White (Sunlight/Spotlight), not orange */}
        <spotLight 
          position={[10, 20, 10]} 
          angle={0.25} 
          penumbra={0.2} 
          intensity={200} // High intensity for sparkles
          color="#fff0dd" 
          castShadow 
          shadow-mapSize={[2048, 2048]}
          shadow-bias={-0.0001}
        />
        
        {/* 3. Fill Light - Cool/Neutral to fill shadows */}
        <pointLight position={[-10, 5, -10]} intensity={50} color="#dbeaff" />
        
        {/* 4. Rim Light - To separate tree from background */}
        <spotLight position={[0, 10, -10]} intensity={100} color="#ffd700" angle={0.5} />
        
        <Environment preset="city" />

        <group position={[0, -2, 0]}>
          <Foliage treeState={treeState} count={15000} />
          <Ornaments treeState={treeState} />
          <SpiralGarland treeState={treeState} />
          <Snow treeState={treeState} />
          <AmbientSparkles treeState={treeState} />
        </group>

        <ContactShadows 
          opacity={0.5} 
          scale={20} 
          blur={2} 
          far={4.5} 
          color="#000000" 
        />

        <Effects />
        
        <OrbitControls 
          enablePan={false} 
          maxPolarAngle={Math.PI / 1.4} 
          minDistance={5}
          maxDistance={30}
          autoRotate={treeState === TreeState.TREE_SHAPE}
          autoRotateSpeed={0.5}
        />
      </Canvas>
    </div>
  );
};