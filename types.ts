
export enum GameState {
  MENU = 'MENU',
  BROWSER = 'BROWSER',
  LOBBY_WAITING = 'LOBBY_WAITING',
  PLAYING = 'PLAYING',
  MEETING = 'MEETING',
  EJECTION = 'EJECTION',
  GAMEOVER = 'GAMEOVER',
  LOBBY = 'LOBBY' // Keeping for backward compatibility if needed
}

export enum PlayerRole {
  CREWMATE = 'CREWMATE',
  IMPOSTOR = 'IMPOSTOR'
}

export enum SabotageType {
  LIGHTS = 'LIGHTS',
  COMMS = 'COMMS'
}

export interface Vector2D {
  x: number;
  y: number;
}

export interface Player {
  id: string;
  name: string;
  color: string;
  role: PlayerRole;
  isAI: boolean;
  isAlive: boolean;
  pos: Vector2D;
  lastKnownPos: Vector2D;
  targetPos?: Vector2D;
  tasksCompleted: number;
  totalTasks: number;
  isInVent?: boolean;
  currentVentId?: string | null;
}

export interface LobbySettings {
  killCooldown: number;
  moveSpeed: number;
  visionRadius: number;
  impostorCount: number;
  meetingTime: number;
  ventCooldown: number;
}

export interface Lobby {
  id: string;
  name: string;
  hostName: string;
  playerCount: number;
  maxPlayers: number;
  isPrivate: boolean;
  code: string;
  map: string;
  settings: LobbySettings;
}

export interface Task {
  id: string;
  name: string;
  room: string;
  pos: Vector2D;
  completed: boolean;
}

export interface DeadBody {
  id: string;
  playerId: string;
  pos: Vector2D;
  color: string;
}

export interface Message {
  id: string;
  senderId: string;
  senderName: string;
  content: string;
  isSus?: boolean;
  isGhost?: boolean;
}

export interface Vent {
  id: string;
  pos: Vector2D;
  links: string[]; // Connected vent IDs
}
