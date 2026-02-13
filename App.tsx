
import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Canvas } from '@react-three/fiber';
import { Stars } from '@react-three/drei';
import { GameState, Player, PlayerRole, Vector2D, Task, DeadBody, Lobby, Vent, LobbySettings, SabotageType } from './types';
import { 
  PLAYER_COLORS, MAP_SIZE, 
  AVAILABLE_MAPS, MAPS_DATA, KILL_DISTANCE, MAX_LOBBY_CAPACITY
} from './constants';
import GameScene from './components/GameScene';
import MeetingRoom from './components/MeetingRoom';
import TaskUI from './components/TaskUI';
import MapOverlay from './components/MapOverlay';
import PlayerModel from './components/PlayerModel';

const MemoizedMeetingRoom = React.memo(MeetingRoom);
const MemoizedTaskUI = React.memo(TaskUI);
const MemoizedMapOverlay = React.memo(MapOverlay);

const DEFAULT_SETTINGS: LobbySettings = {
  killCooldown: 25,
  moveSpeed: 0.22,
  visionRadius: 15,
  impostorCount: 1
};

// Unique channel name for this version to prevent interference with old cache
const syncChannel = new BroadcastChannel('among_us_3d_robust_v10');

interface ExtendedPlayer extends Player {
  joinedAt: number;
  lastSeen?: number; // Heartbeat tracking
  aiTarget?: Vector2D | null;
}

interface DiscoveredLobby extends Lobby {
  lastSeen: number;
}

const App: React.FC = () => {
  // --- CORE STATE ---
  const [gameState, setGameState] = useState<GameState>(GameState.MENU);
  const [players, setPlayers] = useState<ExtendedPlayer[]>([]);
  const [localPlayerId] = useState<string>(() => `p-${Math.random().toString(36).substr(2, 5)}`);
  const [localJoinedAt] = useState<number>(() => Date.now());
  
  const [deadBodies, setDeadBodies] = useState<DeadBody[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [reporterId, setReporterId] = useState<string | null>(null);
  const [winner, setWinner] = useState<PlayerRole | null>(null);
  
  // --- COOLDOWNS & SABOTAGES ---
  const [killCooldown, setKillCooldown] = useState(0);
  const [sabotageCooldown, setSabotageCooldown] = useState(0);
  const [activeSabotage, setActiveSabotage] = useState<SabotageType | null>(null);
  const [sabotageTimer, setSabotageTimer] = useState(0);
  
  // --- UI FLAGS ---
  const [showRoleReveal, setShowRoleReveal] = useState(false);
  const [playerName, setPlayerName] = useState('Player');
  const [playerColor, setPlayerColor] = useState(PLAYER_COLORS[0]);
  const [selectedMap, setSelectedMap] = useState('The Skeld');
  const [showMap, setShowMap] = useState(false);
  const [showSabotageMenu, setShowSabotageMenu] = useState(false);
  const [showKillScreen, setShowKillScreen] = useState(false);
  const [ejectionText, setEjectionText] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  
  // --- LOBBY BROWSER ---
  const [discoveredLobbies, setDiscoveredLobbies] = useState<Record<string, DiscoveredLobby>>({});
  const [currentLobby, setCurrentLobby] = useState<Lobby | null>(null);
  const [joinCodeInput, setJoinCodeInput] = useState('');
  const [isJoining, setIsJoining] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // --- REFS ---
  const keysPressed = useRef<{ [key: string]: boolean }>({});
  const lastUpdateRef = useRef<number>(performance.now());
  const requestRef = useRef<number>(0);
  const syncThrottleRef = useRef<number>(0);
  const pendingJoinRef = useRef<{ code: string; active: boolean; attempts: number }>({ code: '', active: false, attempts: 0 });
  
  // Use a ref for the state to access current values in the message loop without re-running effects
  const stateRef = useRef({ players, gameState, currentLobby, tasks, deadBodies, activeTask, showRoleReveal, ejectionText });

  useEffect(() => {
    stateRef.current = { players, gameState, currentLobby, tasks, deadBodies, activeTask, showRoleReveal, ejectionText };
  }, [players, gameState, currentLobby, tasks, deadBodies, activeTask, showRoleReveal, ejectionText]);

  // --- DERIVED ---
  const local = useMemo(() => players.find(p => p.id === localPlayerId), [players, localPlayerId]);
  
  // The host is always the earliest human player
  const currentHost = useMemo(() => {
    const humans = players.filter(p => !p.isAI);
    if (humans.length === 0) return null;
    return humans.sort((a, b) => a.joinedAt - b.joinedAt)[0];
  }, [players]);

  const isLocalHost = useMemo(() => {
    if (gameState === GameState.MENU) return false;
    return currentHost?.id === localPlayerId;
  }, [currentHost, localPlayerId, gameState]);

  const activeSettings = useMemo(() => currentLobby?.settings || DEFAULT_SETTINGS, [currentLobby]);
  
  const currentMapData = useMemo(() => {
    const name = currentLobby?.map || selectedMap;
    return MAPS_DATA[name] || MAPS_DATA['The Skeld'];
  }, [currentLobby?.map, selectedMap]);

  const taskProgress = useMemo(() => {
    if (tasks.length === 0) return 0;
    return (tasks.filter(t => t.completed).length / tasks.length) * 100;
  }, [tasks]);

  const usedColorsByOthers = useMemo(() => {
    return new Set(players.filter(p => p.id !== localPlayerId).map(p => p.color));
  }, [players, localPlayerId]);

  const hasBots = useMemo(() => players.some(p => p.isAI), [players]);

  // --- COLLISION LOGIC ---
  const checkCollision = useCallback((newPos: Vector2D): boolean => {
    const radius = 0.35; 
    const { walls, props } = currentMapData;
    if (newPos.x < radius || newPos.x > MAP_SIZE.width - radius || newPos.y < radius || newPos.y > MAP_SIZE.height - radius) return true;
    for (const w of walls) {
      if (newPos.x + radius > w.x && newPos.x - radius < w.x + w.w && newPos.y + radius > w.y && newPos.y - radius < w.y + w.h) return true;
    }
    for (const p of props) {
      if (p.type === 'table') {
        const dist = Math.hypot(newPos.x - (p.x + p.w/2), newPos.y - (p.y + p.h/2));
        if (dist < (p.w * 0.45)) return true;
        continue;
      }
      if (newPos.x + radius > p.x && newPos.x - radius < p.x + p.w && newPos.y + radius > p.y && newPos.y - radius < p.y + p.h) return true;
    }
    return false;
  }, [currentMapData]);

  const getSafeSpawn = useCallback((center: Vector2D, spread: number = 3.0): Vector2D => {
    for (let attempt = 0; attempt < 100; attempt++) {
      const testPos = {
        x: center.x + (Math.random() - 0.5) * spread,
        y: center.y + (Math.random() - 0.5) * spread
      };
      if (!checkCollision(testPos)) return testPos;
    }
    return { ...center };
  }, [checkCollision]);

  // --- UNLOAD HANDLER ---
  useEffect(() => {
    const handleUnload = () => {
      const s = stateRef.current;
      if (s.currentLobby) {
        syncChannel.postMessage({ 
          type: 'PLAYER_LEAVE', 
          lobbyId: s.currentLobby.id, 
          playerId: localPlayerId 
        });
      }
    };
    window.addEventListener('beforeunload', handleUnload);
    return () => window.removeEventListener('beforeunload', handleUnload);
  }, [localPlayerId]);

  // --- HOST CLEANUP (PRUNING TIMED OUT PLAYERS) ---
  useEffect(() => {
    if (!isLocalHost || gameState === GameState.MENU) return;
    
    const interval = setInterval(() => {
      const now = Date.now();
      const s = stateRef.current;
      
      // If a human player hasn't sent a POS_SYNC in > 5s, they likely disconnected/crashed
      const disconnected = s.players.filter(p => 
        !p.isAI && 
        p.id !== localPlayerId && 
        (!p.lastSeen || now - p.lastSeen > 5000)
      );
      
      if (disconnected.length > 0) {
        setPlayers(prev => prev.filter(p => !disconnected.find(d => d.id === p.id)));
        disconnected.forEach(d => {
          syncChannel.postMessage({ type: 'PLAYER_LEAVE', lobbyId: s.currentLobby?.id, playerId: d.id });
        });
      }
    }, 2000);
    
    return () => clearInterval(interval);
  }, [isLocalHost, gameState, localPlayerId]);

  // --- LOBBY BROADCASTING ---
  const broadcastLobby = useCallback(() => {
    const s = stateRef.current;
    if (isLocalHost && s.currentLobby && !s.currentLobby.isPrivate && s.gameState === GameState.LOBBY_WAITING) {
      syncChannel.postMessage({ 
        type: 'LOBBY_ANNOUNCE', 
        lobby: { ...s.currentLobby, playerCount: s.players.length } 
      });
    }
  }, [isLocalHost]);

  useEffect(() => {
    if (isLocalHost && currentLobby && !currentLobby.isPrivate && gameState === GameState.LOBBY_WAITING) {
      const interval = setInterval(broadcastLobby, 2500);
      return () => clearInterval(interval);
    }
  }, [isLocalHost, currentLobby?.id, currentLobby?.isPrivate, gameState, broadcastLobby]);

  // Clean up stale discovered lobbies
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      setDiscoveredLobbies(prev => {
        const next = { ...prev };
        let changed = false;
        Object.keys(next).forEach(id => {
          if (now - next[id].lastSeen > 8000) {
            delete next[id];
            changed = true;
          }
        });
        return changed ? next : prev;
      });
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  const refreshLobbies = useCallback(() => {
    setIsRefreshing(true);
    setDiscoveredLobbies({});
    syncChannel.postMessage({ type: 'LOBBY_DISCOVERY_REQ' });
    setTimeout(() => setIsRefreshing(false), 1200);
  }, []);

  // --- DYNAMIC PROXIMITY ---
  const nearbyTask = useMemo(() => {
    if (!local || !local.isAlive || local.role === PlayerRole.IMPOSTOR) return null;
    return tasks.find(t => !t.completed && Math.hypot(t.pos.x - local.pos.x, t.pos.y - local.pos.y) < 3.0);
  }, [local, tasks]);

  const nearbyVent = useMemo(() => {
    if (!local || !local.isAlive || local.role !== PlayerRole.IMPOSTOR) return null;
    return currentMapData.vents.find(v => Math.hypot(v.pos.x - local.pos.x, v.pos.y - local.pos.y) < 2.5);
  }, [local, currentMapData]);

  const nearbyBody = useMemo(() => {
    if (!local || !local.isAlive) return null;
    return deadBodies.find(b => Math.hypot(b.pos.x - local.pos.x, b.pos.y - local.pos.y) < 4.0);
  }, [local, deadBodies]);

  const isNearMeetingButton = useMemo(() => {
    if (!local || !local.isAlive) return false;
    return Math.hypot(local.pos.x - currentMapData.emergencyButtonPos.x, local.pos.y - currentMapData.emergencyButtonPos.y) < 4.0;
  }, [local, currentMapData]);

  // --- ACTIONS ---
  const report = useCallback((rid: string = localPlayerId) => {
    if (stateRef.current.gameState !== GameState.PLAYING) return;
    syncChannel.postMessage({ type: 'MEETING_TRIGGER', lobbyId: currentLobby?.id, reporterId: rid });
    setReporterId(rid);
    setGameState(GameState.MEETING);
    setActiveTask(null);
    setShowMap(false);
    setShowSabotageMenu(false);
    setActiveSabotage(null);
  }, [currentLobby, localPlayerId]);

  const useAction = useCallback(() => {
    const l = stateRef.current.players.find(pl => pl.id === localPlayerId);
    if (!l || !l.isAlive || stateRef.current.gameState !== GameState.PLAYING) return;
    if (nearbyVent && l.role === PlayerRole.IMPOSTOR) {
      setPlayers(prev => prev.map(pl => pl.id === localPlayerId ? { ...pl, isInVent: !pl.isInVent, pos: pl.isInVent ? pl.pos : { ...nearbyVent.pos } } : pl));
      return;
    }
    if (isNearMeetingButton) {
      report();
      return;
    }
    if (nearbyTask) {
      setActiveTask(nearbyTask);
    }
  }, [localPlayerId, nearbyVent, nearbyTask, isNearMeetingButton, report]);

  const handleTaskComplete = useCallback(() => {
    if (!activeTask || !local || local.role === PlayerRole.IMPOSTOR) return;
    const taskId = activeTask.id;
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, completed: true } : t));
    setActiveTask(null);
    syncChannel.postMessage({ type: 'TASK_SYNC', lobbyId: currentLobby?.id, taskId });
  }, [activeTask, local, currentLobby?.id]);

  const handleTaskClose = useCallback(() => {
    setActiveTask(null);
  }, []);

  const handleKill = useCallback(() => {
    const { players: currentPlayers, gameState: currentGS } = stateRef.current;
    const l = currentPlayers.find(pl => pl.id === localPlayerId);
    if (!l || l.role !== PlayerRole.IMPOSTOR || !l.isAlive || killCooldown > 0 || currentGS !== GameState.PLAYING || l.isInVent) return;
    const target = currentPlayers.find(pl => pl.id !== l.id && pl.isAlive && !pl.isInVent && Math.hypot(pl.pos.x - l.pos.x, pl.pos.y - l.pos.y) < KILL_DISTANCE);
    if (target) {
      const body: DeadBody = { id: `body-${Date.now()}`, playerId: target.id, pos: { ...target.pos }, color: target.color };
      setPlayers(prev => prev.map(pl => pl.id === target.id ? { ...pl, isAlive: false } : pl));
      setDeadBodies(prev => [...prev, body]);
      setKillCooldown(activeSettings.killCooldown * 1000);
      setShowKillScreen(true);
      setTimeout(() => setShowKillScreen(false), 500);
      syncChannel.postMessage({ type: 'KILL_EVENT', lobbyId: currentLobby?.id, targetId: target.id, body });
    }
  }, [localPlayerId, killCooldown, activeSettings.killCooldown, currentLobby]);

  const triggerSabotage = useCallback((type: SabotageType) => {
    if (sabotageCooldown > 0 || activeSabotage || local?.role !== PlayerRole.IMPOSTOR || !local.isAlive) return;
    const duration = 30;
    syncChannel.postMessage({ type: 'SABOTAGE_START', lobbyId: currentLobby?.id, sabotageType: type, duration });
    setActiveSabotage(type);
    setSabotageTimer(duration);
    setSabotageCooldown(45000);
    setShowSabotageMenu(false);
  }, [sabotageCooldown, activeSabotage, local, currentLobby]);

  const addBot = useCallback(() => {
    if (!isLocalHost) return;
    const currentP = stateRef.current.players;
    if (currentP.length >= MAX_LOBBY_CAPACITY) return;
    const botId = `bot-${Math.random().toString(36).substr(2, 5)}`;
    const botName = `BOT ${currentP.length}`;
    const used = new Set(currentP.map(p => p.color));
    const botColor = PLAYER_COLORS.find(c => !used.has(c)) || PLAYER_COLORS[currentP.length % PLAYER_COLORS.length];
    const spawn = currentMapData.emergencyButtonPos;
    const safePos = getSafeSpawn(spawn, 5.0);
    const newBot: ExtendedPlayer = {
      id: botId, name: botName, color: botColor, role: PlayerRole.CREWMATE,
      isAI: true, isAlive: true, pos: safePos,
      lastKnownPos: { x: 0, y: 0 }, tasksCompleted: 0, totalTasks: 4, joinedAt: Date.now(), lastSeen: Date.now()
    };
    setPlayers(prev => [...prev, newBot]);
    if (currentLobby) syncChannel.postMessage({ type: 'BOT_ADD', lobbyId: currentLobby.id, bot: newBot });
  }, [isLocalHost, currentMapData.emergencyButtonPos, currentLobby, getSafeSpawn]);

  const removeBot = useCallback((botId: string) => {
    if (!isLocalHost) return;
    setPlayers(prev => prev.filter(p => p.id !== botId));
    if (currentLobby) syncChannel.postMessage({ type: 'PLAYER_LEAVE', lobbyId: currentLobby.id, playerId: botId });
  }, [isLocalHost, currentLobby]);

  const clearAllBots = useCallback(() => {
    if (!isLocalHost) return;
    const botIds = players.filter(p => p.isAI).map(p => p.id);
    setPlayers(prev => prev.filter(p => !p.isAI));
    if (currentLobby) {
      botIds.forEach(id => {
        syncChannel.postMessage({ type: 'PLAYER_LEAVE', lobbyId: currentLobby.id, playerId: id });
      });
    }
  }, [isLocalHost, players, currentLobby]);

  const changeLocalColor = useCallback((color: string) => {
    const isTaken = usedColorsByOthers.has(color);
    if (isTaken) return;
    setPlayerColor(color);
    setPlayers(prev => prev.map(p => p.id === localPlayerId ? { ...p, color } : p));
  }, [localPlayerId, usedColorsByOthers]);

  const toggleLobbyVisibility = useCallback(() => {
    if (!isLocalHost || !currentLobby) return;
    const nextPrivate = !currentLobby.isPrivate;
    const nextLobby = { ...currentLobby, isPrivate: nextPrivate };
    setCurrentLobby(nextLobby);
    syncChannel.postMessage({ type: 'LOBBY_VISIBILITY_CHANGE', lobbyId: currentLobby.id, isPrivate: nextPrivate });
    if (!nextPrivate) broadcastLobby();
  }, [isLocalHost, currentLobby, broadcastLobby]);

  const handleSettingsChange = useCallback((newSettings: Partial<LobbySettings>) => {
    if (!isLocalHost || !currentLobby) return;
    const updatedSettings = { ...currentLobby.settings, ...newSettings };
    setCurrentLobby(prev => prev ? { ...prev, settings: updatedSettings } : null);
    syncChannel.postMessage({ type: 'SETTINGS_SYNC', lobbyId: currentLobby.id, settings: updatedSettings });
  }, [isLocalHost, currentLobby]);

  const leaveGame = useCallback(() => {
    if (currentLobby) syncChannel.postMessage({ type: 'PLAYER_LEAVE', lobbyId: currentLobby.id, playerId: localPlayerId });
    setGameState(GameState.MENU);
    setCurrentLobby(null);
    setPlayers([]);
    setTasks([]);
    setDeadBodies([]);
    setWinner(null);
  }, [currentLobby, localPlayerId]);

  const startMatch = useCallback(() => {
    if (!currentLobby || !isLocalHost || players.length < 4) return;
    const spawn = currentMapData.emergencyButtonPos;
    const shuffled = [...players].sort(() => Math.random() - 0.5);
    const roles: Record<string, PlayerRole> = {};
    shuffled.forEach((p, i) => { roles[p.id] = (i < activeSettings.impostorCount) ? PlayerRole.IMPOSTOR : PlayerRole.CREWMATE; });
    const newPlayers = players.map(p => {
      return { 
        ...p, role: roles[p.id], isAlive: true, isInVent: false,
        pos: getSafeSpawn(spawn, 6.0)
      };
    });
    const newTasks = [...currentMapData.tasks].sort(() => Math.random() - 0.5).slice(0, 5).map(t => ({ ...t, completed: false }));
    syncChannel.postMessage({ type: 'GAME_START', lobbyId: currentLobby.id, players: newPlayers, tasks: newTasks });
    setPlayers(newPlayers);
    setTasks(newTasks);
    setGameState(GameState.PLAYING);
    setShowRoleReveal(true);
    setTimeout(() => setShowRoleReveal(false), 4500);
  }, [currentLobby, isLocalHost, players, currentMapData, activeSettings.impostorCount, getSafeSpawn]);

  const handleJoinAttempt = useCallback((code: string) => {
    const cleanCode = code.toUpperCase().trim();
    if (!cleanCode) return;
    
    setIsJoining(true);
    setJoinError(null);
    setJoinCodeInput(cleanCode);
    pendingJoinRef.current = { code: cleanCode, active: true, attempts: 0 };
    
    // Set immediate default local player state for joining to ensure we are ready to receive
    setPlayers([{ id: localPlayerId, name: playerName, color: playerColor, role: PlayerRole.CREWMATE, isAI: false, isAlive: true, pos: {x:0,y:0}, lastKnownPos:{x:0,y:0}, tasksCompleted: 0, totalTasks: 4, joinedAt: localJoinedAt }]);
    
    // Function to broadcast join request
    const sendJoin = () => {
      if (!pendingJoinRef.current.active) return;
      syncChannel.postMessage({ type: 'JOIN_REQ', code: cleanCode, joinerId: localPlayerId });
      pendingJoinRef.current.attempts++;
      
      // Stop after 8 attempts (approx 8 seconds)
      if (pendingJoinRef.current.attempts < 8) {
        setTimeout(sendJoin, 1000);
      } else {
        if (pendingJoinRef.current.active) {
          setJoinError("Lobby not found or Host disconnected.");
          setIsJoining(false);
          pendingJoinRef.current.active = false;
        }
      }
    };

    sendJoin();
  }, [localPlayerId, playerName, playerColor, localJoinedAt]);

  const joinByLobby = useCallback((lobby: Lobby) => {
    handleJoinAttempt(lobby.code);
  }, [handleJoinAttempt]);

  // --- ENGINE LOOP ---
  useEffect(() => {
    const loop = (time: number) => {
      const delta = Math.min((time - lastUpdateRef.current) / 16.666, 2.0);
      lastUpdateRef.current = time;
      const s = stateRef.current;
      
      if (s.gameState === GameState.PLAYING || s.gameState === GameState.LOBBY_WAITING) {
        setPlayers(prev => {
          const next = [...prev];
          const localIdx = next.findIndex(p => p.id === localPlayerId);
          const isInputLocked = !!s.activeTask || s.showRoleReveal || !!s.ejectionText;
          
          if (localIdx !== -1 && !isInputLocked && !next[localIdx].isInVent) {
            const p = next[localIdx];
            let dx = 0, dy = 0;
            if (keysPressed.current['w'] || keysPressed.current['arrowup']) dy -= 1;
            if (keysPressed.current['s'] || keysPressed.current['arrowdown']) dy += 1;
            if (keysPressed.current['a'] || keysPressed.current['arrowleft']) dx -= 1;
            if (keysPressed.current['d'] || keysPressed.current['arrowright']) dx += 1;
            if (dx !== 0 || dy !== 0) {
              const length = Math.sqrt(dx * dx + dy * dy);
              const spd = activeSettings.moveSpeed * delta;
              const moveX = (dx / length) * spd;
              const moveY = (dy / length) * spd;
              const nextX = p.pos.x + moveX;
              const nextY = p.pos.y + moveY;
              const newPos = { ...p.pos };
              if (!p.isAlive) { newPos.x = nextX; newPos.y = nextY; }
              else {
                if (!checkCollision({ x: nextX, y: p.pos.y })) newPos.x = nextX;
                if (!checkCollision({ x: p.pos.x, y: nextY })) newPos.y = nextY;
              }
              next[localIdx] = { ...p, pos: newPos };
            }
          }
          
          if (isLocalHost && s.gameState === GameState.PLAYING && !isInputLocked) {
            next.forEach((p, i) => {
              if (p.isAI && p.isAlive) {
                if (!p.aiTarget || Math.hypot(p.pos.x - p.aiTarget.x, p.pos.y - p.aiTarget.y) < 0.5) {
                  const rTask = currentMapData.tasks[Math.floor(Math.random() * currentMapData.tasks.length)];
                  next[i] = { ...p, aiTarget: { ...rTask.pos } };
                } else {
                  const dX = p.aiTarget.x - p.pos.x;
                  const dY = p.aiTarget.y - p.pos.y;
                  const length = Math.sqrt(dX * dX + dY * dY);
                  const spd = (activeSettings.moveSpeed * 0.7) * delta;
                  const nx = p.pos.x + (dX/length)*spd;
                  const ny = p.pos.y + (dY/length)*spd;
                  if (!checkCollision({x: nx, y: ny})) next[i] = { ...p, pos: {x: nx, y: ny} };
                  else next[i] = { ...p, aiTarget: null };
                }
              }
            });
          }
          
          if (time - syncThrottleRef.current > 33 && s.currentLobby) {
            syncChannel.postMessage({ 
              type: 'POS_SYNC', 
              lobbyId: s.currentLobby.id, 
              player: localIdx !== -1 ? next[localIdx] : undefined, 
              allPlayers: isLocalHost ? next : undefined 
            });
            syncThrottleRef.current = time;
          }
          return next;
        });
      }
      
      if (s.gameState === GameState.PLAYING) {
        setKillCooldown(c => Math.max(0, c - 16.666 * delta));
        setSabotageCooldown(c => Math.max(0, c - 16.666 * delta));
        setSabotageTimer(t => Math.max(0, t - (16.666 * delta) / 1000));
      }
      requestRef.current = requestAnimationFrame(loop);
    };
    requestRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(requestRef.current);
  }, [localPlayerId, isLocalHost, currentMapData, checkCollision, activeSettings.moveSpeed]);

  // --- SYNC HANDLERS ---
  useEffect(() => {
    const handleMessage = (e: MessageEvent) => {
      const m = e.data;
      const s = stateRef.current;

      if (m.type === 'LOBBY_DISCOVERY_REQ') {
        broadcastLobby();
      }
      if (m.type === 'LOBBY_ANNOUNCE') {
        setDiscoveredLobbies(prev => ({
          ...prev,
          [m.lobby.id]: { ...m.lobby, lastSeen: Date.now() }
        }));
      }
      if (m.type === 'JOIN_REQ' && isLocalHost && s.currentLobby?.code === m.code) {
        // Enforce max capacity check on joining
        if (s.players.length < MAX_LOBBY_CAPACITY) {
          syncChannel.postMessage({ 
            type: 'LOBBY_SYNC', 
            lobby: s.currentLobby, 
            players: s.players, 
            tasks: s.tasks, 
            gameState: s.gameState 
          });
        } else {
          syncChannel.postMessage({ 
            type: 'LOBBY_FULL', 
            code: m.code,
            joinerId: m.joinerId 
          });
        }
      }

      if (m.type === 'LOBBY_FULL' && pendingJoinRef.current.active && m.code === pendingJoinRef.current.code && m.joinerId === localPlayerId) {
        setJoinError("Lobby is full! Try another.");
        setIsJoining(false);
        pendingJoinRef.current.active = false;
      }

      if (m.type === 'LOBBY_SYNC' && pendingJoinRef.current.active && m.lobby.code === pendingJoinRef.current.code) {
        pendingJoinRef.current.active = false;
        setCurrentLobby(m.lobby);
        setSelectedMap(m.lobby.map);
        setIsJoining(false);
        setGameState(m.gameState);

        const usedColors = new Set(m.players.map((p: any) => p.color));
        let myColor = playerColor;
        if (usedColors.has(myColor)) {
          myColor = PLAYER_COLORS.find(c => !usedColors.has(c)) || PLAYER_COLORS[0];
          setPlayerColor(myColor);
        }
        
        setPlayers(prev => {
          // Find our existing local player if possible
          const localMe = prev.find(p => p.id === localPlayerId);
          const others = m.players.filter((p: Player) => p.id !== localPlayerId);
          
          // Rebuild current player list
          const me = localMe ? { ...localMe, color: myColor } : { ...m.players.find((p: any) => p.id === localPlayerId), color: myColor };
          
          const combined = [me, ...others];
          // Simple ID-based deduplication
          const seen = new Set();
          const unique = combined.filter(p => {
            if (seen.has(p.id)) return false;
            seen.add(p.id);
            return true;
          });
          
          return unique.sort((a,b) => a.joinedAt - b.joinedAt).map(p => ({ ...p, lastSeen: Date.now() }));
        });
        setTasks(m.tasks);
      }
      
      if (!currentLobby || m.lobbyId !== currentLobby.id) return;
      
      switch(m.type) {
        case 'SETTINGS_SYNC':
          setCurrentLobby(prev => prev ? { ...prev, settings: m.settings } : null);
          break;
        case 'LOBBY_VISIBILITY_CHANGE':
          setCurrentLobby(prev => prev ? { ...prev, isPrivate: m.isPrivate } : null);
          break;
        case 'POS_SYNC':
          if (m.player && m.player.id !== localPlayerId) {
            setPlayers(prev => {
              const i = prev.findIndex(p => p.id === m.player.id);
              if (i === -1) return [...prev, { ...m.player, lastSeen: Date.now() }].sort((a,b) => a.joinedAt - b.joinedAt);
              const next = [...prev];
              next[i] = { ...next[i], ...m.player, lastSeen: Date.now() };
              return next;
            });
          }
          if (m.allPlayers && !isLocalHost) {
            setPlayers(prev => {
              const localMe = prev.find(lp => lp.id === localPlayerId);
              return m.allPlayers.map((p: ExtendedPlayer) => {
                if (p.id === localPlayerId) return localMe || { ...p, lastSeen: Date.now() };
                return { ...p, lastSeen: Date.now() };
              });
            });
          }
          break;
        case 'GAME_START':
          setPlayers(m.players.map((p: any) => ({ ...p, lastSeen: Date.now() })));
          setTasks(m.tasks);
          setGameState(GameState.PLAYING);
          setShowRoleReveal(true);
          setWinner(null);
          setDeadBodies([]);
          setTimeout(() => setShowRoleReveal(false), 4500);
          break;
        case 'KILL_EVENT':
          setPlayers(prev => prev.map(p => p.id === m.targetId ? { ...p, isAlive: false } : p));
          setDeadBodies(prev => [...prev, m.body]);
          break;
        case 'MEETING_TRIGGER':
          setReporterId(m.reporterId);
          setGameState(GameState.MEETING);
          setActiveSabotage(null);
          break;
        case 'TASK_SYNC':
          setTasks(prev => prev.map(t => t.id === m.taskId ? { ...t, completed: true } : t));
          break;
        case 'SABOTAGE_START':
          setActiveSabotage(m.sabotageType);
          setSabotageTimer(m.duration);
          break;
        case 'WIN':
          setWinner(m.role);
          setGameState(GameState.GAMEOVER);
          break;
        case 'PLAYER_LEAVE':
          setPlayers(prev => prev.filter(p => p.id !== m.playerId));
          break;
      }
    };
    syncChannel.addEventListener('message', handleMessage);
    return () => syncChannel.removeEventListener('message', handleMessage);
  }, [currentLobby, isLocalHost, localPlayerId, playerColor, broadcastLobby]);

  // Keybindings
  useEffect(() => {
    const down = (e: KeyboardEvent) => { 
      keysPressed.current[e.key.toLowerCase()] = true; 
      if (e.key.toLowerCase() === 'm' && stateRef.current.gameState === GameState.PLAYING) setShowMap(v => !v);
      if (e.key.toLowerCase() === 'tab' && local?.role === PlayerRole.IMPOSTOR) { e.preventDefault(); setShowSabotageMenu(v => !v); }
      if (e.key.toLowerCase() === 'q') handleKill();
      if (e.key.toLowerCase() === 'r') { if (nearbyBody) report(); }
      if (e.key.toLowerCase() === 'e') useAction();
    };
    const up = (e: KeyboardEvent) => keysPressed.current[e.key.toLowerCase()] = false;
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    return () => { window.removeEventListener('keydown', down); window.removeEventListener('keyup', up); };
  }, [local?.role, nearbyBody, report, useAction, handleKill]);

  if (gameState === GameState.MENU) {
    const lobbiesList: DiscoveredLobby[] = Object.values(discoveredLobbies);
    return (
      <div className="h-screen bg-black flex flex-col items-center justify-center p-6 text-white font-black overflow-hidden relative">
        <div className="absolute inset-0 opacity-40"><Canvas camera={{ position: [0, 0, 1] }}><Stars radius={100} count={5000} factor={4} /></Canvas></div>
        <h1 className="text-[10rem] italic animate-pulse uppercase z-10 tracking-tighter shadow-red-600/50">AMONG US</h1>
        
        <div className="flex gap-8 z-10">
          <div className="bg-gray-900/90 p-10 rounded-[4rem] border-8 border-white/10 flex flex-col gap-6 w-[38rem] backdrop-blur-xl shadow-2xl overflow-y-auto custom-scrollbar">
            <h2 className="text-4xl text-center italic uppercase mb-2">Create / Join</h2>
            <input type="text" value={playerName} onChange={e => setPlayerName(e.target.value.toUpperCase())} className="bg-black border-4 border-blue-500 p-6 rounded-3xl text-center text-3xl uppercase outline-none" placeholder="NAME" maxLength={10} />
            <div className="flex flex-col gap-2">
               <label className="text-xs text-gray-400 uppercase tracking-widest ml-4">Select Map</label>
               <div className="grid grid-cols-2 gap-2">
                  {AVAILABLE_MAPS.map(map => (
                    <button key={map} onClick={() => setSelectedMap(map)} className={`p-3 rounded-2xl border-4 text-xs font-black uppercase transition-all ${selectedMap === map ? 'border-blue-500 bg-blue-900/40 text-blue-200' : 'border-gray-700 bg-black/50 text-gray-500'}`}>{map}</button>
                  ))}
               </div>
            </div>
            <button onClick={() => {
              const code = Math.random().toString(36).substring(2, 8).toUpperCase();
              const spawn = MAPS_DATA[selectedMap].emergencyButtonPos;
              const initialPos = { x: spawn.x, y: spawn.y + 1.5 }; 
              setCurrentLobby({ id: `c-${Date.now()}`, name: `${playerName}'S LOBBY`, code, playerCount: 1, maxPlayers: MAX_LOBBY_CAPACITY, hostName: playerName, isPrivate: true, map: selectedMap, settings: { ...DEFAULT_SETTINGS } });
              setPlayers([{ id: localPlayerId, name: playerName, color: playerColor, role: PlayerRole.CREWMATE, isAI: false, isAlive: true, pos: initialPos, lastKnownPos: {x:0,y:0}, tasksCompleted: 0, totalTasks: 4, joinedAt: localJoinedAt, lastSeen: Date.now() }]);
              setGameState(GameState.LOBBY_WAITING);
            }} className="bg-red-600 hover:bg-red-500 p-6 rounded-3xl text-3xl uppercase italic shadow-lg active:scale-95 transition-all">Create Lobby</button>
            <div className="flex gap-4">
              <input type="text" placeholder="CODE" value={joinCodeInput} onChange={e => setJoinCodeInput(e.target.value.toUpperCase())} className="flex-1 bg-gray-950 p-6 rounded-3xl text-center text-3xl uppercase border-4 border-transparent focus:border-green-500 outline-none" maxLength={6} />
              <button onClick={() => handleJoinAttempt(joinCodeInput)} disabled={isJoining} className={`bg-green-600 px-10 py-6 rounded-3xl text-3xl font-bold active:scale-95 transition-all ${isJoining ? 'opacity-50 animate-pulse' : ''}`}>{isJoining ? '...' : 'JOIN'}</button>
            </div>
            {joinError && <div className="text-red-500 text-center uppercase tracking-widest text-xs font-bold">{joinError}</div>}
          </div>

          <div className="bg-gray-900/90 p-10 rounded-[4rem] border-8 border-white/10 flex flex-col gap-6 w-[30rem] backdrop-blur-xl shadow-2xl overflow-y-auto custom-scrollbar relative">
             <div className="flex justify-between items-center mb-2 px-2">
                <h2 className="text-4xl italic uppercase">Find Game</h2>
                <button 
                  onClick={refreshLobbies} 
                  disabled={isRefreshing}
                  className={`bg-blue-600 hover:bg-blue-500 p-3 rounded-2xl border-4 border-white/20 transition-all active:scale-90 ${isRefreshing ? 'animate-spin opacity-50' : ''}`}
                  title="Refresh Lobby List"
                >
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
                  </svg>
                </button>
             </div>
             <div className="flex flex-col gap-4 overflow-y-auto pr-2 custom-scrollbar flex-1 min-h-0">
                {lobbiesList.length === 0 ? (
                  <div className="text-center text-gray-500 uppercase italic py-20 text-xl opacity-50">
                    {isRefreshing ? 'Searching...' : 'No public games found'}
                  </div>
                ) : lobbiesList.map(lobby => (
                  <button key={lobby.id} onClick={() => joinByLobby(lobby)} className="bg-gray-800 hover:bg-gray-700 border-4 border-gray-700 hover:border-blue-500 p-4 rounded-3xl text-left transition-all active:scale-95 group">
                     <div className="flex justify-between items-center mb-1">
                        <span className="text-xl group-hover:text-blue-400 truncate w-3/4">{lobby.name}</span>
                        <span className="text-xs bg-black px-2 py-1 rounded-lg text-blue-300 font-mono">{lobby.playerCount}/{lobby.maxPlayers}</span>
                     </div>
                     <div className="flex justify-between text-[10px] text-gray-500 uppercase tracking-widest">
                        <span>Map: {lobby.map}</span>
                        <span>Host: {lobby.hostName}</span>
                     </div>
                  </button>
                ))}
             </div>
             <p className="text-[10px] text-gray-600 text-center uppercase tracking-widest mt-auto">Only public lobbies appear here</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-screen h-screen bg-black overflow-hidden select-none">
      <GameScene 
        players={players} 
        localPlayerId={localPlayerId} 
        tasks={tasks} 
        deadBodies={deadBodies} 
        mapData={currentMapData} 
        visionRadius={activeSettings.visionRadius} 
        activeSabotage={activeSabotage} 
        onEmergencyPress={report} 
      />
      
      {/* HUD & TASK LIST */}
      <div className="absolute top-6 left-6 right-6 flex justify-between pointer-events-none z-[60]">
        <div className="flex flex-col gap-4">
          <div className="w-96 bg-black/60 p-4 rounded-2xl border-4 border-white/20">
            <div className="flex justify-between text-[10px] font-black uppercase text-gray-400 mb-1">
              <span>Tasks Progress</span>
              <span>{Math.round(taskProgress)}%</span>
            </div>
            <div className="h-6 bg-gray-800 rounded-lg overflow-hidden border-2 border-gray-700">
              <div className="h-full bg-green-500 transition-all duration-1000" style={{ width: `${taskProgress}%` }} />
            </div>
          </div>
          {local && (
            <div className={`w-72 p-4 rounded-2xl border-4 backdrop-blur-md ${local.role === PlayerRole.CREWMATE ? 'bg-black/40 border-white/10' : 'bg-red-950/40 border-red-500/20'}`}>
               <h3 className={`${local.role === PlayerRole.CREWMATE ? 'text-yellow-500' : 'text-red-500'} font-black uppercase text-xs tracking-widest mb-2 border-b border-current/30 pb-1`}>
                 {local.role === PlayerRole.CREWMATE ? 'Assigned Tasks' : 'Fake Objectives'}
               </h3>
               {tasks.map(t => {
                 const isCompleted = local.role === PlayerRole.CREWMATE ? t.completed : false;
                 return (
                   <div key={t.id} className={`flex items-center gap-3 ${isCompleted ? 'opacity-30' : ''}`}>
                      <div className={`w-3 h-3 rounded-full ${isCompleted ? 'bg-green-500' : (local.role === PlayerRole.IMPOSTOR ? 'bg-red-500' : 'bg-gray-500 animate-pulse')}`} />
                      <span className={`text-white text-xs font-bold uppercase ${isCompleted ? 'line-through decoration-white/50' : ''}`}>
                        {local.role === PlayerRole.IMPOSTOR ? '(Fake) ' : ''}{t.name} in {t.room}
                      </span>
                   </div>
                 );
               })}
            </div>
          )}
        </div>

        <div className="flex flex-col items-end gap-3 pointer-events-auto">
          <div className="bg-black/60 px-6 py-2 rounded-xl border-4 border-white/10 text-white font-black uppercase italic tracking-widest text-sm backdrop-blur-sm">
            Lobby: <span className="text-blue-400">{currentLobby?.code}</span>
          </div>
          {(gameState === GameState.PLAYING || gameState === GameState.MEETING || gameState === GameState.GAMEOVER) && (
            <button 
              onClick={leaveGame}
              className="bg-red-600 hover:bg-red-500 text-white font-black uppercase px-6 py-2 rounded-xl border-4 border-white/20 shadow-xl transition-all active:scale-95 text-xs italic tracking-wider"
            >
              LEAVE GAME
            </button>
          )}
        </div>
      </div>

      {/* ACTION BUTTONS */}
      <div className="absolute bottom-10 right-10 flex flex-col gap-6 z-[60] items-end">
        <div className="flex gap-6 items-end">
          {local?.role === PlayerRole.IMPOSTOR && (
            <button onClick={handleKill} disabled={killCooldown > 0 || !local.isAlive} className={`w-32 h-32 rounded-full border-8 text-white font-black flex flex-col items-center justify-center transition-all ${killCooldown > 0 || !local.isAlive ? 'bg-gray-800 border-gray-600 grayscale' : 'bg-red-700 border-red-500 shadow-xl pointer-events-auto active:scale-95'}`}>
              <span className="text-xl">KILL</span>
              {killCooldown > 0 && <span className="text-2xl">{Math.ceil(killCooldown/1000)}</span>}
            </button>
          )}
          {local?.role === PlayerRole.IMPOSTOR && (
            <button onClick={() => setShowSabotageMenu(true)} disabled={sabotageCooldown > 0 || !local.isAlive} className={`w-32 h-32 rounded-full border-8 text-white font-black flex flex-col items-center justify-center transition-all ${sabotageCooldown > 0 || !local.isAlive ? 'bg-gray-800 border-gray-600 grayscale' : 'bg-orange-600 border-orange-400 shadow-xl pointer-events-auto active:scale-95'}`}>
              <span className="text-xl text-center leading-tight">SABOTAGE</span>
              {sabotageCooldown > 0 && <span className="text-2xl">{Math.ceil(sabotageCooldown/1000)}</span>}
            </button>
          )}
          {nearbyBody && (
            <button onClick={() => report()} className="w-32 h-32 bg-yellow-600 border-8 border-yellow-400 rounded-full text-white font-black flex flex-col items-center justify-center shadow-xl pointer-events-auto active:scale-95 animate-bounce">
              <span className="text-xl">REPORT</span>
            </button>
          )}
          <button 
            onClick={useAction} 
            disabled={(!nearbyTask && !nearbyVent && !isNearMeetingButton) || !local?.isAlive}
            className={`w-40 h-40 rounded-full border-8 text-white font-black flex flex-col items-center justify-center transition-all shadow-xl pointer-events-auto active:scale-95 ${(!nearbyTask && !nearbyVent && !isNearMeetingButton) || !local?.isAlive ? 'bg-gray-800 border-gray-600 grayscale' : (nearbyVent ? 'bg-red-800 border-red-500' : 'bg-blue-600 border-blue-400')}`}
          >
            <span className="text-2xl">{nearbyVent ? 'VENT' : (isNearMeetingButton ? 'MEETING' : 'USE')}</span>
            <span className="text-[10px] opacity-50 font-black mt-1">[E]</span>
          </button>
        </div>
        <button onClick={() => setShowMap(true)} className="w-24 h-24 bg-gray-800 border-4 border-gray-600 rounded-2xl text-white font-black flex flex-col items-center justify-center shadow-xl pointer-events-auto active:scale-95">
          <span className="text-xs uppercase">Map [M]</span>
        </button>
      </div>

      {/* LOBBY UI */}
      {gameState === GameState.LOBBY_WAITING && (
        <div className="fixed top-1/2 left-12 -translate-y-1/2 bg-black/95 w-[420px] p-8 rounded-[3rem] border-8 border-gray-700 z-[100] shadow-2xl flex flex-col items-center max-h-[90vh] overflow-y-auto custom-scrollbar">
           <div className="w-full flex justify-between items-center mb-2">
             <h2 className="text-4xl font-black text-white italic uppercase tracking-widest">LOBBY</h2>
             <span className="text-xl font-mono text-blue-400 font-black">{players.length}/{MAX_LOBBY_CAPACITY}</span>
           </div>
           <div className="bg-blue-600 text-white text-sm px-4 py-2 rounded-full font-black tracking-widest mb-2">{currentLobby?.code}</div>
           
           <div className="w-full flex justify-between items-center bg-white/5 p-4 rounded-2xl border border-white/10 mb-4">
              <span className="text-xs text-gray-400 uppercase font-black">Visibility</span>
              <div className="flex items-center gap-3">
                 <span className={`text-[10px] font-black uppercase ${currentLobby?.isPrivate ? 'text-red-500' : 'text-green-500'}`}>
                    {currentLobby?.isPrivate ? 'PRIVATE' : 'PUBLIC'}
                 </span>
                 {isLocalHost && (
                   <button onClick={toggleLobbyVisibility} className={`w-12 h-6 rounded-full relative transition-all ${currentLobby?.isPrivate ? 'bg-gray-700' : 'bg-green-600'}`}>
                      <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${currentLobby?.isPrivate ? 'left-1' : 'left-7'}`} />
                   </button>
                 )}
              </div>
           </div>

           {/* Game Settings Menu Toggle */}
           <div className="w-full mb-4">
              <button 
                onClick={() => setShowSettings(!showSettings)} 
                className={`w-full p-4 rounded-2xl border-4 transition-all uppercase font-black text-xs tracking-widest ${showSettings ? 'bg-blue-900/40 border-blue-500 text-blue-400' : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10'}`}
              >
                {showSettings ? 'Close Game Settings' : 'Edit Game Settings'}
              </button>
              
              {showSettings && (
                <div className="mt-4 p-6 bg-black/60 rounded-3xl border border-blue-500/30 flex flex-col gap-6 animate-in slide-in-from-top-4 duration-300">
                  <div className="flex flex-col gap-2">
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] text-gray-400 font-black uppercase">Kill Cooldown: {activeSettings.killCooldown}s</span>
                    </div>
                    <input 
                      type="range" min="10" max="60" step="5" 
                      value={activeSettings.killCooldown} 
                      onChange={(e) => handleSettingsChange({ killCooldown: parseInt(e.target.value) })}
                      disabled={!isLocalHost}
                      className="w-full h-2 bg-gray-800 rounded-lg appearance-none cursor-pointer accent-blue-500 disabled:opacity-50"
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] text-gray-400 font-black uppercase">Move Speed: {activeSettings.moveSpeed.toFixed(2)}</span>
                    </div>
                    <input 
                      type="range" min="0.10" max="0.50" step="0.02" 
                      value={activeSettings.moveSpeed} 
                      onChange={(e) => handleSettingsChange({ moveSpeed: parseFloat(e.target.value) })}
                      disabled={!isLocalHost}
                      className="w-full h-2 bg-gray-800 rounded-lg appearance-none cursor-pointer accent-blue-500 disabled:opacity-50"
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] text-gray-400 font-black uppercase">Vision Radius: {activeSettings.visionRadius}</span>
                    </div>
                    <input 
                      type="range" min="5" max="30" step="1" 
                      value={activeSettings.visionRadius} 
                      onChange={(e) => handleSettingsChange({ visionRadius: parseInt(e.target.value) })}
                      disabled={!isLocalHost}
                      className="w-full h-2 bg-gray-800 rounded-lg appearance-none cursor-pointer accent-blue-500 disabled:opacity-50"
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] text-gray-400 font-black uppercase">Impostors: {activeSettings.impostorCount}</span>
                    </div>
                    <div className="flex gap-2">
                       {[1, 2, 3].map(count => (
                         <button 
                          key={count} 
                          onClick={() => handleSettingsChange({ impostorCount: count })}
                          disabled={!isLocalHost || count > players.length - 1}
                          className={`flex-1 py-2 rounded-xl border-2 font-black text-xs transition-all ${activeSettings.impostorCount === count ? 'bg-red-600 border-red-400 text-white' : 'bg-gray-800 border-gray-700 text-gray-500 hover:bg-gray-700 disabled:opacity-20'}`}
                         >
                           {count}
                         </button>
                       ))}
                    </div>
                  </div>
                  {!isLocalHost && <p className="text-[8px] text-center text-red-500 uppercase font-black">Only host can change settings</p>}
                </div>
              )}
           </div>

           {!showSettings && (
             <>
               <div className="w-full mb-6">
                  <label className="text-xs text-gray-400 uppercase tracking-widest font-black mb-4 block text-center">Customize Color</label>
                  <div className="grid grid-cols-4 gap-4 p-4 bg-white/5 rounded-3xl border border-white/10">
                     {PLAYER_COLORS.map(color => {
                       const isTaken = usedColorsByOthers.has(color);
                       const isSelected = playerColor === color;
                       return (
                         <button key={color} onClick={() => changeLocalColor(color)} disabled={isTaken} className={`relative w-full aspect-square rounded-xl border-4 transition-all ${isSelected ? 'border-white scale-110 shadow-xl' : isTaken ? 'opacity-30 grayscale' : 'border-black/40 hover:scale-105'}`} style={{ backgroundColor: color }}>
                           {isTaken && <div className="absolute inset-0 flex items-center justify-center bg-black/40"><span className="text-white font-black text-xl">✕</span></div>}
                         </button>
                       );
                     })}
                  </div>
               </div>
               
               <div className="w-full max-h-40 overflow-y-auto mb-6 flex flex-col gap-2 custom-scrollbar pr-2">
                  {players.map(p => (
                    <div key={p.id} className={`flex items-center p-3 rounded-xl border transition-all ${p.id === localPlayerId ? 'bg-blue-900/20 border-blue-500/50' : 'bg-white/5 border-white/10'}`}>
                       <div className="w-6 h-6 rounded-md mr-3 shadow-md" style={{ backgroundColor: p.color }} />
                       <span className="font-bold uppercase truncate flex-1 text-white">{p.name} {p.id === localPlayerId && "(YOU)"}</span>
                       {p.isAI && <span className="text-[8px] bg-indigo-900 text-white px-2 py-0.5 rounded font-black mr-2">BOT</span>}
                       {p.id === currentHost?.id && <span className="text-[8px] bg-yellow-600 text-white px-2 py-0.5 rounded font-black">HOST</span>}
                       {isLocalHost && p.isAI && (
                         <button 
                            onClick={() => removeBot(p.id)}
                            className="ml-2 bg-red-600 hover:bg-red-500 text-white text-[10px] font-black px-2 py-1 rounded transition-all active:scale-90"
                            title="Remove Bot"
                          >
                            REMOVE
                          </button>
                       )}
                    </div>
                  ))}
               </div>
               
               {isLocalHost && (
                 <div className="w-full flex flex-col gap-4">
                   <div className="flex gap-2">
                     <button 
                      onClick={addBot} 
                      disabled={players.length >= MAX_LOBBY_CAPACITY}
                      className={`flex-1 p-4 rounded-2xl text-lg font-black uppercase italic transition-all active:scale-95 ${players.length >= MAX_LOBBY_CAPACITY ? 'bg-gray-700 text-gray-500 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-500 text-white shadow-lg'}`}
                     >
                       {players.length >= MAX_LOBBY_CAPACITY ? 'Full' : 'Add Bot'}
                     </button>
                     {hasBots && (
                       <button 
                        onClick={clearAllBots} 
                        className="bg-red-600 hover:bg-red-500 text-white p-4 rounded-2xl text-lg font-black uppercase italic transition-all active:scale-95 shadow-lg flex items-center justify-center"
                        title="Remove All Bots"
                       >
                         <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                           <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                         </svg>
                       </button>
                     )}
                   </div>
                   <div className="flex flex-col gap-2">
                     <button 
                      onClick={startMatch} 
                      disabled={players.length < 4} 
                      className={`w-full p-6 rounded-3xl text-2xl font-black uppercase italic shadow-lg transition-all active:scale-95 ${players.length < 4 ? 'bg-gray-700 text-gray-400 cursor-not-allowed' : 'bg-green-600 hover:bg-green-500 text-white'}`}
                     >
                       START MATCH
                     </button>
                     {players.length < 4 && (
                       <p className="text-[10px] text-red-500 font-black uppercase tracking-widest text-center animate-pulse">
                         Need {4 - players.length} more players to start
                       </p>
                     )}
                   </div>
                 </div>
               )}
             </>
           )}
           <button onClick={leaveGame} className="w-full mt-6 text-red-500/50 hover:text-red-500 font-bold uppercase text-xs">QUIT TO MENU</button>
        </div>
      )}

      {/* OVERLAYS */}
      {gameState === GameState.MEETING && reporterId && (
        <MemoizedMeetingRoom players={players} localPlayerId={localPlayerId} reporterId={reporterId} deadBodies={deadBodies} onVote={(id) => {
            setDeadBodies([]); setGameState(GameState.PLAYING);
            if (id) {
              const victim = players.find(p => p.id === id);
              setEjectionText(victim ? `${victim.name} was ${victim.role === PlayerRole.IMPOSTOR ? 'the Impostor' : 'not the Impostor'}.` : 'No one was ejected.');
              setPlayers(prev => prev.map(p => p.id === id ? { ...p, isAlive: false } : p));
              setTimeout(() => setEjectionText(null), 5000);
            }
          }} 
        />
      )}
      {activeTask && <MemoizedTaskUI task={activeTask} onClose={handleTaskClose} onComplete={handleTaskComplete} />}
      {showMap && <MemoizedMapOverlay players={players} localPlayerId={localPlayerId} tasks={tasks} onClose={() => setShowMap(false)} mapData={currentMapData} activeSabotage={activeSabotage} />}
      {showRoleReveal && local && (
        <div className="fixed inset-0 z-[200] bg-black flex flex-col items-center justify-center animate-in fade-in duration-500">
           <div className="relative w-96 h-96 mb-10"><Canvas camera={{position:[0,1,3]}}><ambientLight intensity={1.5} /><PlayerModel color={local.color} isAlive={true} /></Canvas></div>
           <h2 className={`text-[10rem] font-black italic uppercase animate-bounce ${local.role === PlayerRole.IMPOSTOR ? 'text-red-600' : 'text-blue-500'}`}>{local.role}</h2>
        </div>
      )}
      {winner && gameState === GameState.GAMEOVER && (
        <div className="fixed inset-0 bg-black z-[300] flex flex-col items-center justify-center gap-10">
           <h2 className={`text-[12rem] font-black italic uppercase ${winner === PlayerRole.IMPOSTOR ? 'text-red-600' : 'text-blue-500'}`}>{winner} WINS</h2>
           <button onClick={() => window.location.reload()} className="bg-white text-black px-12 py-6 rounded-3xl text-3xl font-black uppercase hover:scale-105">REPLAY</button>
        </div>
      )}
    </div>
  );
};

export default App;
