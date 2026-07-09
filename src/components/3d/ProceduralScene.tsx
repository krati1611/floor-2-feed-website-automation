import { useRef, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Environment, useTexture } from '@react-three/drei';
import * as THREE from 'three';
import gsap from 'gsap';
import { SceneSpec, Asset } from '@/store/useProjectStore';

interface ProceduralSceneProps {
  spec: SceneSpec;
  assets: Asset[];
}

function Floor({ room, textureUrl }: { room: SceneSpec['rooms'][0], textureUrl?: string }) {
  // If we have an approved image, use it as texture
  const texture = textureUrl ? useTexture(textureUrl) : null;
  
  if (texture) {
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(room.w / 4, room.d / 4); // basic scale
  }

  return (
    <mesh position={[room.x, -0.01, room.z]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
      <planeGeometry args={[room.w, room.d]} />
      {texture ? (
        <meshStandardMaterial map={texture} roughness={0.8} />
      ) : (
        <meshStandardMaterial color="#f0f0f0" roughness={0.8} />
      )}
    </mesh>
  );
}

function Walls({ walls }: { walls: SceneSpec['walls'] }) {
  const wallThickness = 0.2;
  
  return (
    <group>
      {walls.map((wall, i) => {
        // Calculate length and rotation
        const length = Math.sqrt(Math.pow(wall.x2 - wall.x1, 2) + Math.pow(wall.z2 - wall.z1, 2));
        const angle = Math.atan2(wall.z2 - wall.z1, wall.x2 - wall.x1);
        
        // Midpoint for position
        const midX = (wall.x1 + wall.x2) / 2;
        const midZ = (wall.z1 + wall.z2) / 2;

        return (
          <mesh 
            key={i} 
            position={[midX, wall.height_m / 2, midZ]} 
            rotation={[0, -angle, 0]} 
            castShadow 
            receiveShadow
          >
            <boxGeometry args={[length, wall.height_m, wallThickness]} />
            <meshStandardMaterial color="#ffffff" roughness={0.5} />
          </mesh>
        );
      })}
    </group>
  );
}

function SceneSetup({ spec, assets }: ProceduralSceneProps) {
  const cameraRef = useRef<THREE.PerspectiveCamera>(null);
  
  // Find the first approved image asset to use as a texture
  const floorTextureAsset = assets.find(a => a.track === 'image' && a.status === 'approved');
  const textureUrl = floorTextureAsset?.url;

  // Initial GSAP intro animation
  useEffect(() => {
    // We animate the camera from top-down to angled perspective
    gsap.fromTo('.canvas-container', 
      { opacity: 0 }, 
      { opacity: 1, duration: 1.5, ease: 'power2.inOut' }
    );
  }, []);

  return (
    <>
      <Environment preset="city" />
      <ambientLight intensity={0.5} />
      <directionalLight 
        position={[10, 10, 5]} 
        intensity={1} 
        castShadow 
        shadow-mapSize={[1024, 1024]}
      />
      
      {spec.rooms.map((room, i) => (
        <Floor key={i} room={room} textureUrl={textureUrl} />
      ))}
      
      <Walls walls={spec.walls} />
      
      <OrbitControls 
        makeDefault 
        minPolarAngle={Math.PI / 4} 
        maxPolarAngle={Math.PI / 2.1}
        enableDamping
        dampingFactor={0.05}
      />
    </>
  );
}

export default function ProceduralScene({ spec, assets }: ProceduralSceneProps) {
  return (
    <div className="canvas-container" style={{ width: '100%', height: '100%', borderRadius: '12px', overflow: 'hidden' }}>
      <Canvas shadows camera={{ position: [0, 8, 12], fov: 45 }}>
        <SceneSetup spec={spec} assets={assets} />
      </Canvas>
    </div>
  );
}
