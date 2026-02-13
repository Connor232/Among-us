
import React, { Suspense, useEffect, useState, useMemo, useRef, useLayoutEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Stars, Text, Environment, Billboard } from '@react-three/drei';
import * as THREE from 'three';
import { Player, Task, DeadBody, PlayerRole, Vector2D, Vent, SabotageType } from '../types';
import { MAP_SIZE, MapData } from '../constants';
import PlayerModel from './PlayerModel';

const AmbientLight = 'ambientLight' as any;
const PointLight = 'pointLight' as any;
const Mesh = 'mesh' as any;
const PlaneGeometry = 'planeGeometry' as any;
const MeshStandardMaterial = 'meshStandardMaterial' as any;
const BoxGeometry = 'boxGeometry' as any;
const SphereGeometry = 'sphereGeometry' as any;
const Group = 'group' as any;
const CylinderGeometry = 'cylinderGeometry' as any;
const DirectionalLight = 'directionalLight' as any;
const InstancedMesh = 'instancedMesh' as any;
const RingGeometry = 'ringGeometry' as any;

interface GameSceneProps {
  players: Player[];
  localPlayerId: string;
  tasks: Task[];
  deadBodies: DeadBody[];
  onEmergencyPress?: () => void;
  mapData: MapData;
  visionRadius?: number;
  activeSabotage?: SabotageType | null;
}

const INDICATOR_RANGE = 10.0;
const COMPASS_ORBIT_RADIUS = 1.8;
const VENT_INTERACTION_RANGE = 2.5;

// --- NAVIGATION COMPONENTS ---

const TaskCompass: React.FC<{ tasks: Task[]; localPlayer: Player; activeSabotage?: SabotageType | null }> = ({ tasks, localPlayer, activeSabotage }) => {
  const groupRef = useRef<THREE.Group>(null);
  const incompleteTasks = useMemo(() => {
    // For Impostors, all tasks are fake and remain incomplete in the compass
    if (localPlayer.role === PlayerRole.IMPOSTOR) {
      return tasks;
    }
    return tasks.filter(t => !t.completed);
  }, [tasks, localPlayer.role]);

  useFrame((state) => {
    if (!groupRef.current) return;
    const time = state.clock.getElapsedTime();
    groupRef.current.position.set(localPlayer.pos.x, 0.5, localPlayer.pos.y);
    const pulse = 1 + Math.sin(time * 4) * 0.05;
    groupRef.current.scale.set(pulse, pulse, pulse);
  });

  if (!localPlayer.isAlive) return null;
  if (activeSabotage === SabotageType.COMMS && localPlayer.role === PlayerRole.CREWMATE) return null;

  return (
    <Group ref={groupRef}>
      {incompleteTasks.map((task) => (
        <TaskArrow key={task.id} task={task} localPlayer={localPlayer} />
      ))}
    </Group>
  );
};

const TaskArrow: React.FC<{ task: Task; localPlayer: Player }> = ({ task, localPlayer }) => {
  const arrowRef = useRef<THREE.Mesh>(null);
  
  useFrame(() => {
    if (!arrowRef.current) return;
    const dx = task.pos.x - localPlayer.pos.x;
    const dz = task.pos.y - localPlayer.pos.y;
    const dist = Math.hypot(dx, dz);
    const angle = Math.atan2(dx, dz);
    arrowRef.current.position.set(Math.sin(angle) * COMPASS_ORBIT_RADIUS, 0.1, Math.cos(angle) * COMPASS_ORBIT_RADIUS);
    arrowRef.current.rotation.y = angle;
    const opacity = THREE.MathUtils.clamp((dist - 3) / 7, 0, 0.8);
    // Properly access opacity on MeshStandardMaterial through type guard.
    if (arrowRef.current.material instanceof THREE.MeshStandardMaterial) {
      arrowRef.current.material.opacity = opacity;
    }
    arrowRef.current.visible = opacity > 0;
  });

  return (
    <Mesh ref={arrowRef} rotation={[0, 0, 0]}>
      <CylinderGeometry args={[0, 0.15, 0.4, 3]} />
      <MeshStandardMaterial 
        color={localPlayer.role === PlayerRole.IMPOSTOR ? "#f87171" : "#fbbf24"} 
        emissive={localPlayer.role === PlayerRole.IMPOSTOR ? "#f87171" : "#fbbf24"} 
        emissiveIntensity={2} 
        transparent 
        opacity={0.8} 
        depthTest={false} 
      />
    </Mesh>
  );
};

// --- DEATH ANIMATION COMPONENTS ---

const SlashEffect: React.FC<{ active: boolean }> = ({ active }) => {
  const meshRef = useRef<THREE.Mesh>(null);
  useFrame((state) => {
    if (!meshRef.current) return;
    if (active) {
      const time = state.clock.getElapsedTime() * 10;
      const scale = Math.max(0, 1 - (time % 1));
      meshRef.current.scale.set(15 * (1 - scale), 0.1, 0.1);
      // Properly access opacity on MeshStandardMaterial through type guard.
      if (meshRef.current.material instanceof THREE.MeshStandardMaterial) {
        meshRef.current.material.opacity = scale;
      }
    } else {
      meshRef.current.scale.set(0, 0, 0);
    }
  });
  return (
    <Mesh ref={meshRef} position={[0, 1.2, 0]}>
      <BoxGeometry args={[1, 1, 1]} />
      <MeshStandardMaterial color="#ff0000" emissive="#ff0000" emissiveIntensity={5} transparent />
    </Mesh>
  );
};

const BloodParticles: React.FC<{ active: boolean }> = ({ active }) => {
  const groupRef = useRef<THREE.Group>(null);
  const particles = useMemo(() => {
    return Array.from({ length: 12 }).map(() => ({
      pos: new THREE.Vector3(0, 1, 0),
      vel: new THREE.Vector3((Math.random() - 0.5) * 0.2, Math.random() * 0.2, (Math.random() - 0.5) * 0.2),
      scale: Math.random() * 0.15 + 0.05
    }));
  }, []);
  useFrame(() => {
    if (!groupRef.current || !active) return;
    groupRef.current.children.forEach((child, i) => {
      const p = particles[i];
      child.position.add(p.vel);
      p.vel.y -= 0.005;
      if (child.position.y < 0.1) child.position.y = 0.1;
    });
  });
  if (!active) return null;
  return (
    <Group ref={groupRef}>
      {particles.map((p, i) => (
        <Mesh key={i} position={[p.pos.x, p.pos.y, p.pos.z]}>
          <SphereGeometry args={[p.scale, 8, 8]} />
          <MeshStandardMaterial color="#991b1b" />
        </Mesh>
      ))}
    </Group>
  );
};

const AnimatedDeadBody: React.FC<{ body: DeadBody; visionVisible: boolean }> = ({ body, visionVisible }) => {
  const [showEffects, setShowEffects] = useState(true);
  useEffect(() => {
    const timer = setTimeout(() => setShowEffects(false), 800);
    return () => clearTimeout(timer);
  }, []);
  if (!visionVisible) return null;
  return (
    <Group position={[body.pos.x, 0, body.pos.y]}>
      <PlayerModel color={body.color} isAlive={false} isDying={showEffects} />
      <SlashEffect active={showEffects} />
      <BloodParticles active={showEffects} />
      {showEffects && <PointLight intensity={500} distance={5} color="#ff0000" />}
    </Group>
  );
};

// --- REST OF SCENE ---

const VentGrate: React.FC<{ vent: Vent; isImpostor: boolean; localPlayerPos: Vector2D }> = ({ vent, isImpostor, localPlayerPos }) => {
  const [isHighlighted, setIsHighlighted] = useState(false);
  const glowRef = useRef<THREE.PointLight>(null);
  useFrame(() => {
    if (!isImpostor) return;
    const dist = Math.hypot(vent.pos.x - localPlayerPos.x, vent.pos.y - localPlayerPos.y);
    const highlighted = dist < VENT_INTERACTION_RANGE;
    if (highlighted !== isHighlighted) setIsHighlighted(highlighted);
    if (glowRef.current && highlighted) {
      glowRef.current.intensity = 200 + Math.sin(Date.now() * 0.005) * 50;
    }
  });
  return (
    <Group position={[vent.pos.x, 0.01, vent.pos.y]}>
      <Mesh rotation={[-Math.PI / 2, 0, 0]}>
        <PlaneGeometry args={[1.3, 1.3]} />
        <MeshStandardMaterial color="#1e293b" />
      </Mesh>
      {[...Array(5)].map((_, i) => (
        <Mesh key={i} position={[0, 0.02, (i - 2) * 0.2]} rotation={[-Math.PI / 2, 0, 0]}>
          <PlaneGeometry args={[1.1, 0.08]} />
          <MeshStandardMaterial color="#334155" metalness={0.9} roughness={0.1} />
        </Mesh>
      ))}
      {isImpostor && isHighlighted && (
        <>
          <Mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.005, 0]}>
            <PlaneGeometry args={[1.5, 1.5]} />
            <MeshStandardMaterial color="#ef4444" transparent opacity={0.15} emissive="#ef4444" emissiveIntensity={1} />
          </Mesh>
          <PointLight ref={glowRef} intensity={200} distance={4} color="#ef4444" />
          <Billboard position={[0, 1.3, 0]}>
            <Text fontSize={0.35} color="#ef4444" outlineWidth={0.03} outlineColor="#000000">
              [E] VENT
            </Text>
          </Billboard>
        </>
      )}
    </Group>
  );
};

const TaskIndicator: React.FC<{ task: Task; localPlayerPos: Vector2D; activeSabotage?: SabotageType | null; localRole?: PlayerRole }> = ({ task, localPlayerPos, activeSabotage, localRole }) => {
  const groupRef = useRef<THREE.Group>(null);
  const ringRef = useRef<THREE.Mesh>(null);
  const [isVisible, setIsVisible] = useState(false);

  useFrame((state) => {
    if (activeSabotage === SabotageType.COMMS && localRole === PlayerRole.CREWMATE) {
      setIsVisible(false);
      return;
    }
    const dist = Math.hypot(task.pos.x - localPlayerPos.x, task.pos.y - localPlayerPos.y);
    const visible = dist < INDICATOR_RANGE;
    if (visible !== isVisible) setIsVisible(visible);

    if (visible && groupRef.current && ringRef.current) {
      const time = state.clock.getElapsedTime();
      const floatingPart = groupRef.current.children[0];
      if (floatingPart) {
        floatingPart.position.y = 2.0 + Math.sin(time * 3) * 0.2;
        const scale = 1 + Math.sin(time * 5) * 0.15;
        floatingPart.scale.set(scale, scale, scale);
      }
      const ringScale = 1.0 + Math.sin(time * 4) * 0.1;
      ringRef.current.scale.set(ringScale, ringScale, 1);
      if (ringRef.current.material instanceof THREE.MeshStandardMaterial) {
        ringRef.current.material.opacity = 0.4 + Math.sin(time * 4) * 0.2;
      }
    }
  });

  if (!isVisible) return null;

  const isImpostor = localRole === PlayerRole.IMPOSTOR;

  return (
    <Group ref={groupRef} position={[task.pos.x, 0, task.pos.y]}>
      <Group position={[0, 2.0, 0]}>
        <Billboard>
          <Group>
            <Mesh>
              <PlaneGeometry args={[0.9, 0.9]} />
              <MeshStandardMaterial 
                color={isImpostor ? "#f87171" : "#fbbf24"} 
                transparent 
                opacity={0.4} 
                emissive={isImpostor ? "#f87171" : "#fbbf24"} 
                emissiveIntensity={1} 
              />
            </Mesh>
            <Text
              fontSize={0.7}
              color={isImpostor ? "#f87171" : "#fbbf24"}
              anchorX="center"
              anchorY="middle"
              outlineWidth={0.06}
              outlineColor="#000000"
            >
              !
            </Text>
            {isImpostor && (
              <Text
                position={[0, -0.6, 0]}
                fontSize={0.25}
                color="#f87171"
                anchorX="center"
                anchorY="top"
                outlineWidth={0.03}
                outlineColor="#000000"
                fontStyle="italic"
              >
                FAKE
              </Text>
            )}
          </Group>
        </Billboard>
        <PointLight intensity={300} distance={6} color={isImpostor ? "#f87171" : "#fbbf24"} />
      </Group>
      <Mesh ref={ringRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
        <RingGeometry args={[0.8, 1.0, 32]} />
        <MeshStandardMaterial 
          color={isImpostor ? "#f87171" : "#fbbf24"} 
          transparent 
          opacity={0.5} 
          emissive={isImpostor ? "#f87171" : "#fbbf24"} 
          emissiveIntensity={2} 
          side={THREE.DoubleSide}
        />
      </Mesh>
    </Group>
  );
};

const WallsInstanced: React.FC<{ walls: any[], localPlayerAlive: boolean }> = ({ walls, localPlayerAlive }) => {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const tempObject = useMemo(() => new THREE.Object3D(), []);
  useLayoutEffect(() => {
    if (!meshRef.current) return;
    walls.forEach((wall, i) => {
      tempObject.position.set(wall.x + wall.w / 2, 1.25, wall.y + wall.h / 2);
      tempObject.scale.set(wall.w, 2.5, wall.h);
      tempObject.updateMatrix();
      meshRef.current!.setMatrixAt(i, tempObject.matrix);
    });
    meshRef.current.instanceMatrix.needsUpdate = true;
  }, [walls, tempObject]);
  return (
    <InstancedMesh ref={meshRef} args={[null, null, walls.length]} castShadow receiveShadow>
      <BoxGeometry args={[1, 1, 1]} />
      <MeshStandardMaterial color="#64748b" transparent opacity={localPlayerAlive ? 1 : 0.6} roughness={0.5} />
    </InstancedMesh>
  );
};

interface PropGroupProps {
  type: string;
  items: any[];
}

const PropGroup: React.FC<PropGroupProps> = ({ type, items }) => {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const tempObject = useMemo(() => new THREE.Object3D(), []);
  useLayoutEffect(() => {
    if (!meshRef.current) return;
    items.forEach((prop, i) => {
      const x = prop.x + prop.w / 2;
      const z = prop.y + prop.h / 2;
      let y = 0.4;
      let sy = 0.8;
      if (type === 'engine') { y = 0.8; sy = 1.6; }
      else if (type === 'safe') { y = 0.6; sy = 1.2; }
      else if (type === 'kitchen_counter') { y = 0.45; sy = 0.9; }
      tempObject.position.set(x, y, z);
      tempObject.scale.set(prop.w, sy, prop.h);
      tempObject.updateMatrix();
      meshRef.current!.setMatrixAt(i, tempObject.matrix);
    });
    meshRef.current.instanceMatrix.needsUpdate = true;
  }, [items, type, tempObject]);
  if (type === 'table') {
    return (
      <InstancedMesh ref={meshRef} args={[null, null, items.length]} castShadow>
        <CylinderGeometry args={[0.5, 0.5, 1, 24]} />
        <MeshStandardMaterial color="#64748b" roughness={0.4} />
      </InstancedMesh>
    );
  }
  const getMaterialColor = () => {
    if (type === 'engine') return "#134e4a";
    if (type === 'safe') return "#f1f5f9";
    if (type === 'kitchen_counter') return "#475569";
    return "#334155";
  };
  return (
    <InstancedMesh ref={meshRef} args={[null, null, items.length]} castShadow>
      <BoxGeometry args={[1, 1, 1]} />
      <MeshStandardMaterial color={getMaterialColor()} metalness={type === 'safe' ? 0.7 : 0} roughness={0.5} />
    </InstancedMesh>
  );
};

const PropsInstanced: React.FC<{ props: any[] }> = ({ props }) => {
  const grouped = useMemo(() => {
    return props.reduce((acc: any, prop) => {
      const type = prop.type || 'default';
      if (!acc[type]) acc[type] = [];
      acc[type].push(prop);
      return acc;
    }, {});
  }, [props]);
  return (
    <>
      {Object.entries(grouped).map(([type, items]: [string, any]) => (
        <PropGroup key={type} type={type} items={items} />
      ))}
    </>
  );
};

const AnimatedPlayer: React.FC<{ player: Player; localPlayer: Player | undefined; visionRadius: number }> = ({ player, localPlayer, visionRadius }) => {
  const groupRef = useRef<THREE.Group>(null);
  const [scale, setScale] = useState(1);
  const isImpostorTeam = localPlayer?.role === PlayerRole.IMPOSTOR && player.role === PlayerRole.IMPOSTOR;
  const isLocal = localPlayer?.id === player.id;
  useFrame(() => {
    if (!groupRef.current) return;
    const targetScale = player.isInVent ? 0.01 : 1;
    if (Math.abs(scale - targetScale) > 0.01) {
      setScale(THREE.MathUtils.lerp(scale, targetScale, 0.25));
    }
  });
  const isVisible = useMemo(() => {
    const localIsAlive = localPlayer?.isAlive ?? true;
    const localIsImpostor = localPlayer?.role === PlayerRole.IMPOSTOR;
    const playerIsAlive = player.isAlive;
    if (!playerIsAlive) {
      if (localIsAlive && !localIsImpostor) return false;
    }
    if (localPlayer && !isLocal) {
      const dist = Math.hypot(player.pos.x - localPlayer.pos.x, player.pos.y - localPlayer.pos.y);
      if (localIsAlive && dist > visionRadius) return false;
    }
    return true;
  }, [player, localPlayer, isLocal, visionRadius]);
  if (!isVisible) return null;
  return (
    <Group ref={groupRef} position={[player.pos.x, player.isAlive ? 0 : 0.8, player.pos.y]} scale={[scale, scale, scale]}>
      <PlayerModel color={player.color} isAlive={player.isAlive} isLocal={isLocal} isGhost={!player.isAlive} isTransparent={player.isInVent} />
      <Billboard position={[0, 2.5, 0]}>
        {/* Fix: removed invalid 'transparent' prop as transparency is handled by fillOpacity. */}
        <Text fontSize={0.8} color={isImpostorTeam || (isLocal && player.role === PlayerRole.IMPOSTOR) ? '#dc2626' : '#f8fafc'} fillOpacity={player.isAlive ? 1 : 0.6} anchorX="center" anchorY="middle" outlineWidth={0.08} outlineColor="#000000">
          {`${player.name}${!player.isAlive ? ' (GHOST)' : ''}`}
        </Text>
      </Billboard>
      {isLocal && (
        <Mesh position={[0, -0.42, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <CylinderGeometry args={[1.0, 1.0, 0.05, 32]} />
          <MeshStandardMaterial color="#3b82f6" transparent opacity={0.25} />
        </Mesh>
      )}
    </Group>
  );
};

const SceneContent: React.FC<GameSceneProps> = ({ players, localPlayerId, tasks, deadBodies, onEmergencyPress, mapData, visionRadius = 15, activeSabotage }) => {
  const { camera, scene } = useThree();
  const localPlayer = players.find(p => p.id === localPlayerId);
  const [btnDepressed, setBtnDepressed] = useState(false);
  useEffect(() => {
    const defaultColor = '#94a3b8';
    const darkColor = '#0f172a';
    const isLightsDown = activeSabotage === SabotageType.LIGHTS && localPlayer?.role === PlayerRole.CREWMATE;
    const fogColor = new THREE.Color(isLightsDown ? darkColor : defaultColor);
    scene.background = fogColor;
    scene.fog = new THREE.Fog(fogColor, visionRadius * 1.2, visionRadius * 3.0);
  }, [scene, visionRadius, activeSabotage, localPlayer?.role]);
  useFrame(() => {
    if (localPlayer) {
      const targetPos = new THREE.Vector3(localPlayer.pos.x, 15, localPlayer.pos.y + 10);
      camera.position.lerp(targetPos, 0.1);
      camera.lookAt(localPlayer.pos.x, 0, localPlayer.pos.y);
    }
  });
  const handleEmergencyClick = (e: any) => {
    e.stopPropagation();
    if (!localPlayer?.isAlive) return;
    const dist = Math.hypot(localPlayer.pos.x - mapData.emergencyButtonPos.x, localPlayer.pos.y - mapData.emergencyButtonPos.y);
    if (dist < 4.0) {
      setBtnDepressed(true);
      setTimeout(() => setBtnDepressed(false), 200);
      onEmergencyPress?.();
    }
  };
  const isNearButton = useMemo(() => {
    if (!localPlayer) return false;
    return Math.hypot(localPlayer.pos.x - mapData.emergencyButtonPos.x, localPlayer.pos.y - mapData.emergencyButtonPos.y) < 4.0;
  }, [localPlayer, mapData.emergencyButtonPos]);
  const ambientIntensity = useMemo(() => {
    if (activeSabotage === SabotageType.LIGHTS && localPlayer?.role === PlayerRole.CREWMATE) return 0.2;
    return 1.5;
  }, [activeSabotage, localPlayer?.role]);
  const playerLightIntensity = useMemo(() => {
    if (!localPlayer) return 1500;
    if (activeSabotage === SabotageType.LIGHTS && localPlayer.role === PlayerRole.CREWMATE) return 300;
    return localPlayer.isAlive ? 1500 : 500;
  }, [activeSabotage, localPlayer]);
  return (
    <>
      <AmbientLight intensity={ambientIntensity} />
      <DirectionalLight position={[20, 40, 20]} intensity={activeSabotage === SabotageType.LIGHTS ? 0.2 : 1.2} castShadow />
      {localPlayer && (
        <PointLight position={[localPlayer.pos.x, 8, localPlayer.pos.y]} intensity={playerLightIntensity} distance={visionRadius * 5} color={localPlayer.isAlive ? "#ffffff" : "#60a5fa"} decay={1.8} />
      )}
      <Stars radius={150} depth={60} count={3000} factor={4} saturation={0.2} fade speed={1.2} />
      <Mesh rotation={[-Math.PI / 2, 0, 0]} position={[MAP_SIZE.width / 2, -0.05, MAP_SIZE.height / 2]} receiveShadow>
        <PlaneGeometry args={[MAP_SIZE.width * 10, MAP_SIZE.height * 10]} />
        <MeshStandardMaterial color="#94a3b8" />
      </Mesh>
      {mapData.rooms.map((room, i) => (
        /* Fix: Removed invalid 'transparent' prop from Text components. Transparency is automatic with fillOpacity < 1. */
        <Text key={i} position={[room.pos.x, 0.05, room.pos.y]} rotation={[-Math.PI / 2, 0, 0]} fontSize={2.5} color="#0f172a" fillOpacity={0.15} anchorX="center" anchorY="middle">{room.name.toUpperCase()}</Text>
      ))}
      <WallsInstanced walls={mapData.walls} localPlayerAlive={localPlayer?.isAlive ?? true} />
      <PropsInstanced props={mapData.props} />
      {mapData.vents.map((vent) => (
        <VentGrate key={vent.id} vent={vent} isImpostor={localPlayer?.role === PlayerRole.IMPOSTOR && !!localPlayer?.isAlive} localPlayerPos={localPlayer?.pos || { x: 0, y: 0 }} />
      ))}
      <Group position={[mapData.emergencyButtonPos.x, 1.0, mapData.emergencyButtonPos.y]} onClick={handleEmergencyClick}>
        <Mesh position={[0, 0.05, 0]}><BoxGeometry args={[1.2, 0.2, 1.2]} /><MeshStandardMaterial color="#1e293b" /></Mesh>
        <Mesh position={[0, btnDepressed ? 0.1 : 0.2, 0]}><CylinderGeometry args={[0.35, 0.35, 0.3, 32]} /><MeshStandardMaterial color="#ef4444" emissive="#ef4444" emissiveIntensity={isNearButton ? 3 : 0.6} /></Mesh>
        <Mesh position={[0, 0.35, 0]}><SphereGeometry args={[0.45, 32, 32, 0, Math.PI * 2, 0, Math.PI / 2]} /><MeshStandardMaterial color="#ffffff" transparent opacity={0.25} /></Mesh>
        {isNearButton && localPlayer?.isAlive && (
          <Billboard position={[0, 1.8, 0]}><Text fontSize={0.4} color="#f8fafc" anchorX="center" anchorY="middle" outlineWidth={0.03} outlineColor="#000000">[E] EMERGENCY</Text></Billboard>
        )}
      </Group>
      {localPlayer && localPlayer.isAlive && tasks.map((task) => {
        // Crewmates don't see completed tasks; Impostors always see their fake tasks
        if (localPlayer.role === PlayerRole.CREWMATE && task.completed) return null;
        return (
          <TaskIndicator key={task.id} task={task} localPlayerPos={localPlayer.pos} activeSabotage={activeSabotage} localRole={localPlayer.role} />
        );
      })}
      {localPlayer && (
        <TaskCompass tasks={tasks} localPlayer={localPlayer} activeSabotage={activeSabotage} />
      )}
      {deadBodies.map((body) => {
        const isBodyVisible = localPlayer ? (Math.hypot(body.pos.x - localPlayer.pos.x, body.pos.y - localPlayer.pos.y) < visionRadius * 1.5) : true;
        return <AnimatedDeadBody key={body.id} body={body} visionVisible={isBodyVisible} />;
      })}
      {players.map((player) => (
        <AnimatedPlayer key={player.id} player={player} localPlayer={localPlayer} visionRadius={visionRadius} />
      ))}
    </>
  );
};

const GameScene: React.FC<GameSceneProps> = (props) => {
  return (
    <div className="w-full h-full bg-[#94a3b8]">
      <Canvas shadows camera={{ fov: 45, position: [0, 25, 25], near: 0.1, far: 2000 }} gl={{ antialias: true, alpha: false, stencil: false, depth: true }}>
        <Suspense fallback={null}>
          <SceneContent {...props} />
          <Environment preset="city" />
        </Suspense>
      </Canvas>
    </div>
  );
};

export default GameScene;
