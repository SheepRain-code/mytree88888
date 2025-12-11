import React from 'react';
import { EffectComposer, Bloom, Vignette, Noise } from '@react-three/postprocessing';
import { BlendFunction } from 'postprocessing';

export const Effects: React.FC = () => {
  return (
    <EffectComposer disableNormalPass>
      <Bloom 
        luminanceThreshold={0.85} // Higher threshold: only really bright things glow
        mipmapBlur 
        intensity={0.6} // Subtle glow
        radius={0.3}
        color="#fff8e0" // Pale gold glow, not orange
      />
      <Vignette eskil={false} offset={0.1} darkness={0.3} />
      <Noise opacity={0.02} blendFunction={BlendFunction.OVERLAY} />
      
      {/* Removed ColorAverage overlay to restore realistic brightness */}
    </EffectComposer>
  );
};