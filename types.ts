export enum TreeState {
  SCATTERED = 'SCATTERED',
  TREE_SHAPE = 'TREE_SHAPE',
}

export interface ParticleData {
  initialPos: [number, number, number];
  treePos: [number, number, number];
  scatterPos: [number, number, number];
  color: string;
  size: number;
  speed: number;
}

export interface OrnamentType {
  type: 'sphere' | 'box' | 'star';
  color: string;
  weight: number; // 0.1 (light) to 1.0 (heavy) - affects transition lag
  scale: number;
}
