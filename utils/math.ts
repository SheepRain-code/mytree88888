import * as THREE from 'three';

// Random point in sphere
export const getRandomSpherePoint = (radius: number): THREE.Vector3 => {
  const u = Math.random();
  const v = Math.random();
  const theta = 2 * Math.PI * u;
  const phi = Math.acos(2 * v - 1);
  const r = Math.cbrt(Math.random()) * radius;
  
  const sinPhi = Math.sin(phi);
  return new THREE.Vector3(
    r * sinPhi * Math.cos(theta),
    r * sinPhi * Math.sin(theta),
    r * Math.cos(phi)
  );
};

// Point on a cone surface (Christmas Tree shape)
export const getConePoint = (height: number, baseRadius: number, yOffset: number): THREE.Vector3 => {
  const y = (Math.random() * height) - (height / 2) + yOffset;
  const relativeHeight = (y - yOffset + height / 2) / height; // 0 to 1
  const radiusAtHeight = baseRadius * (1 - relativeHeight);
  
  const theta = Math.random() * Math.PI * 2;
  // Add some volume thickness
  const r = radiusAtHeight * (0.8 + Math.random() * 0.2); 
  
  const x = r * Math.cos(theta);
  const z = r * Math.sin(theta);
  
  return new THREE.Vector3(x, y, z);
};
