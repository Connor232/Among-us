
import React, { useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';

// Define local constants for Three.js elements to avoid JSX namespace issues and global pollution.
const Group = 'group' as any;
const Mesh = 'mesh' as any;
const SphereGeometry = 'sphereGeometry' as any;
const MeshStandardMaterial = 'meshStandardMaterial' as any;
const CylinderGeometry = 'cylinderGeometry' as any;
const CapsuleGeometry = 'capsuleGeometry' as any;
const BoxGeometry = 'boxGeometry' as any;

interface PlayerModelProps {
  color: string;
  isAlive: boolean;
  isLocal?: boolean;
  isGhost?: boolean;
  isTransparent?: boolean;
  isDying?: boolean;
}

const PlayerModel: React.FC<PlayerModelProps> = ({ color, isAlive, isLocal, isGhost, isTransparent, isDying }) => {
  const materialRef = useRef<THREE.MeshStandardMaterial>(null);
  const visorMaterialRef = useRef<THREE.MeshStandardMaterial>(null);
  const backpackMaterialRef = useRef<THREE.MeshStandardMaterial>(null);

  useFrame((state) => {
    if (isGhost) {
      const time = state.clock.getElapsedTime();
      const pulse = Math.sin(time * 2.5); // Frequency of pulse
      const opacityBase = 0.3;
      const opacityVariation = 0.15;
      const currentOpacity = opacityBase + pulse * opacityVariation;
      
      const emissiveBase = 0.4;
      const emissiveVariation = 0.2;
      const currentEmissive = emissiveBase + pulse * emissiveVariation;

      if (materialRef.current) {
        materialRef.current.opacity = currentOpacity;
        materialRef.current.emissiveIntensity = currentEmissive;
      }
      if (visorMaterialRef.current) {
        visorMaterialRef.current.opacity = currentOpacity;
        visorMaterialRef.current.emissiveIntensity = currentEmissive * 0.5;
      }
      if (backpackMaterialRef.current) {
        backpackMaterialRef.current.opacity = currentOpacity;
        backpackMaterialRef.current.emissiveIntensity = currentEmissive;
      }
    }
  });

  if (!isAlive && !isGhost) {
    return (
      <Group scale={isDying ? [1.2, 0.8, 1.2] : [1, 1, 1]}>
        {/* Dead Body Bottom Half (Pant legs/base) */}
        <Mesh position={[0, 0.25, 0]}>
          <CylinderGeometry args={[0.4, 0.45, 0.5, 16]} />
          <MeshStandardMaterial color={color} />
        </Mesh>
        
        {/* The Cut Surface (White/Light flesh area) */}
        <Mesh position={[0, 0.5, 0]}>
          <CylinderGeometry args={[0.4, 0.4, 0.05, 16]} />
          <MeshStandardMaterial color="#fecaca" />
        </Mesh>
        
        {/* The Iconic Bone */}
        <Mesh position={[0, 0.7, 0]}>
          <CylinderGeometry args={[0.08, 0.08, 0.4, 8]} />
          <MeshStandardMaterial color="#ffffff" />
        </Mesh>
        {/* Bone Caps */}
        <Mesh position={[-0.08, 0.9, 0]}>
          <SphereGeometry args={[0.08, 8, 8]} />
          <MeshStandardMaterial color="#ffffff" />
        </Mesh>
        <Mesh position={[0.08, 0.9, 0]}>
          <SphereGeometry args={[0.08, 8, 8]} />
          <MeshStandardMaterial color="#ffffff" />
        </Mesh>

        {/* Backpack remnant */}
        <Mesh position={[-0.35, 0.25, 0]}>
          <BoxGeometry args={[0.2, 0.4, 0.4]} />
          <MeshStandardMaterial color={color} />
        </Mesh>
      </Group>
    );
  }

  const baseOpacity = isGhost ? 0.35 : (isTransparent ? 0.2 : 1);
  const isTrans = (isGhost || isTransparent);

  return (
    <Group>
      {/* Body Capsule */}
      <Mesh position={[0, 0.7, 0]} castShadow={!isGhost && !isTransparent}>
        <CapsuleGeometry args={[0.4, 0.6, 8, 16]} />
        <MeshStandardMaterial 
          ref={materialRef}
          color={color} 
          emissive={isGhost ? color : (isLocal ? color : '#000')} 
          emissiveIntensity={isGhost ? 0.5 : (isLocal ? 0.2 : 0)} 
          opacity={baseOpacity}
          transparent={isTrans}
        />
      </Mesh>
      
      {/* Visor (Cyan screen) */}
      <Mesh position={[0.25, 0.9, 0]} rotation={[0, Math.PI / 2, 0]}>
        <BoxGeometry args={[0.4, 0.35, 0.45]} />
        <MeshStandardMaterial 
          ref={visorMaterialRef}
          color="#bae6fd" 
          emissive="#bae6fd" 
          emissiveIntensity={isGhost ? 0.2 : 0.5} 
          opacity={baseOpacity}
          transparent={isTrans}
        />
      </Mesh>

      {/* Backpack (Oxygen tank) */}
      <Mesh position={[-0.35, 0.75, 0]} castShadow={!isGhost && !isTransparent}>
        <BoxGeometry args={[0.2, 0.5, 0.4]} />
        <MeshStandardMaterial 
          ref={backpackMaterialRef}
          color={color} 
          opacity={baseOpacity}
          transparent={isTrans}
          emissive={isGhost ? color : '#000'}
          emissiveIntensity={isGhost ? 0.5 : 0}
        />
      </Mesh>

      {/* Feet/Base glow for local player */}
      {isLocal && (
        <Mesh position={[0, 0.05, 0]}>
          <CylinderGeometry args={[0.5, 0.5, 0.1, 32]} />
          <MeshStandardMaterial 
            color={color} 
            transparent 
            opacity={isGhost ? 0.1 : 0.3} 
            emissive={color} 
            emissiveIntensity={isGhost ? 0.5 : 2} 
          />
        </Mesh>
      )}
    </Group>
  );
};

export default PlayerModel;
