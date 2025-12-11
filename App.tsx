import React, { useState } from 'react';
import { Experience } from './components/Experience';
import { TreeState } from './types';

// Pre-defined noise texture to ensure clean string parsing
const NOISE_SVG = `data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E`;

const App: React.FC = () => {
  const [treeState, setTreeState] = useState<TreeState>(TreeState.SCATTERED);

  const toggleState = () => {
    setTreeState((prev) => 
      prev === TreeState.TREE_SHAPE ? TreeState.SCATTERED : TreeState.TREE_SHAPE
    );
  };

  const isTree = treeState === TreeState.TREE_SHAPE;

  return (
    <div className="relative w-full h-full bg-black overflow-hidden">
      <Experience treeState={treeState} />

      {/* UI Overlay */}
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none flex flex-col justify-between p-8 md:p-12 z-10">
        
        {/* Header */}
        <header className="flex justify-between items-start">
          <div>
            <h1 className="text-4xl md:text-6xl font-serif text-amber-100 tracking-wider font-bold drop-shadow-lg leading-tight">
              圣诞快乐，家人们
            </h1>
            <div className="mt-3 border-l-2 border-amber-500/50 pl-4">
              <p className="text-amber-300/80 text-sm md:text-lg tracking-[0.15em] font-light font-serif">
                小杨祝您身体健康，事事顺意
              </p>
              <p className="text-amber-200/50 text-xs md:text-sm tracking-[0.2em] font-serif italic mt-1">
                Merry Christmas
              </p>
            </div>
          </div>
          <div className="text-right hidden md:block">
            <p className="text-emerald-800/80 text-xs tracking-widest uppercase font-bold">Luxury Collection</p>
            <p className="text-amber-100/60 text-sm font-serif">Holiday 2025</p>
          </div>
        </header>

        {/* Footer Controls */}
        <footer className="flex flex-col items-center gap-6 pb-8">
          <div className="bg-black/40 backdrop-blur-md border border-amber-500/30 rounded-full p-1 pointer-events-auto transition-all duration-500 hover:border-amber-400/80 shadow-[0_0_30px_rgba(218,165,32,0.2)]">
            <button
              onClick={toggleState}
              className={`
                relative px-12 py-4 rounded-full text-sm font-bold tracking-widest uppercase transition-all duration-700 overflow-hidden group
                ${isTree ? 'bg-emerald-950/90 text-amber-50' : 'bg-transparent text-amber-100'}
              `}
            >
              {/* Background gradient animation */}
              <span className={`absolute inset-0 w-full h-full bg-gradient-to-r from-amber-700/80 to-yellow-900/80 transition-transform duration-700 ease-in-out ${isTree ? 'translate-x-full opacity-0' : 'translate-x-0 opacity-100'}`}></span>
              
              <span className="relative z-10 drop-shadow-md group-hover:text-white transition-colors">
                {isTree ? 'Release Magic' : 'Assemble Tree'}
              </span>
            </button>
          </div>
          
          <p className="text-amber-100/30 text-[10px] tracking-widest uppercase animate-pulse">
            {isTree ? 'Swipe to rotate • Pinch to zoom' : 'Particles floating in zero gravity'}
          </p>
        </footer>
      </div>

      {/* Grain Overlay for film look */}
      <div 
        className="absolute inset-0 pointer-events-none opacity-[0.04] mix-blend-overlay" 
        style={{ backgroundImage: `url("${NOISE_SVG}")` }}
      ></div>
    </div>
  );
};

export default App;