
import { Vector2D, Vent, Door } from './types';

export const SCALE = 0.05;
export const MAP_SIZE = { width: 2800 * SCALE, height: 2200 * SCALE };
export const PLAYER_SIZE = 40 * SCALE;
export const MOVE_SPEED = 0.18; 
export const KILL_COOLDOWN = 30000;
export const KILL_DISTANCE = 3.0;
export const VISION_RADIUS = 12.0;
export const MAX_LOBBY_CAPACITY = 15;

export const AVAILABLE_MAPS = [
  'The Skeld',
  'Mira HQ',
  'Polus',
  'Airship'
];

export const PLAYER_COLORS = [
  '#C51111', // Red
  '#132ED1', // Blue
  '#117F2D', // Green
  '#ED54BA', // Pink
  '#EF7D0D', // Orange
  '#F5F557', // Yellow
  '#3F474E', // Black
  '#D6E0F0', // White
  '#6B2FBB', // Purple
  '#71491E', // Brown
  '#38FEDC', // Cyan
  '#50EF39', // Lime
  '#7B0838', // Maroon
  '#FFD6EC', // Rose
  '#FFFEBE', // Banana
  '#758593', // Gray
  '#91887D', // Tan
  '#D76D76', // Coral
  '#4F5D27', // Olive
  '#314144', // Slate
  '#1560BD', // Denim
  '#800020', // Burgundy
  '#98FF98', // Mint
  '#E6E6FA', // Lavender
  '#FFDB58', // Mustard
  '#8A9A5B', // Moss
  '#7B3F00', // Chocolate
  '#008080', // Teal
  '#FFD700', // Gold
  '#C0C0C0', // Silver
  '#000080', // Navy
  '#FA8072', // Salmon
  '#4B0082', // Indigo
  '#40E0D0'  // Turquoise
];

export interface Wall {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface MapProp {
  x: number;
  y: number;
  type: 'table' | 'crate' | 'bed' | 'console' | 'safe' | 'cockpit_chair' | 'engine' | 'kitchen_counter';
  w: number;
  h: number;
}

export interface RoomConfig {
  name: string;
  pos: Vector2D;
  size: { w: number; h: number };
}

export interface MapData {
  walls: Wall[];
  props: MapProp[];
  rooms: RoomConfig[];
  emergencyButtonPos: Vector2D;
  tasks: any[];
  vents: Vent[];
  doors: Door[];
}

// --- SKELD DATA ---
const rawSkeldWalls: Wall[] = [
  { x: 0, y: 0, w: 2000, h: 40 }, { x: 0, y: 1560, w: 2000, h: 40 },
  { x: 0, y: 0, w: 40, h: 1600 }, { x: 1960, y: 0, w: 40, h: 1600 },
  { x: 700, y: 40, w: 40, h: 500 }, { x: 1260, y: 40, w: 40, h: 500 },
  { x: 700, y: 540, w: 150, h: 40 }, { x: 1110, y: 540, w: 150, h: 40 },
  { x: 40, y: 600, w: 500, h: 40 }, { x: 500, y: 640, w: 40, h: 200 },
  { x: 500, y: 940, w: 40, h: 100 }, { x: 40, y: 1040, w: 500, h: 40 },
  { x: 700, y: 580, w: 40, h: 400 }, { x: 1260, y: 580, w: 40, h: 400 },
];

const skeldProps: MapProp[] = [
  { x: 900, y: 150, type: 'table', w: 200, h: 200 }, 
  { x: 150, y: 700, type: 'bed', w: 80, h: 120 },
  { x: 150, y: 850, type: 'bed', w: 80, h: 120 },
  { x: 1500, y: 800, type: 'console', w: 60, h: 40 },
  { x: 1000, y: 1400, type: 'crate', w: 100, h: 100 },
].map(p => ({ ...p, x: p.x * SCALE, y: p.y * SCALE, w: p.w * SCALE, h: p.h * SCALE }) as MapProp);

const skeldRooms: RoomConfig[] = [
  { name: 'Cafeteria', pos: { x: 1000 * SCALE, y: 300 * SCALE }, size: { w: 560 * SCALE, h: 500 * SCALE } },
  { name: 'Medbay', pos: { x: 270 * SCALE, y: 820 * SCALE }, size: { w: 460 * SCALE, h: 440 * SCALE } },
  { name: 'Electrical', pos: { x: 1000 * SCALE, y: 1100 * SCALE }, size: { w: 400 * SCALE, h: 300 * SCALE } },
  { name: 'Reactor', pos: { x: 300 * SCALE, y: 1400 * SCALE }, size: { w: 400 * SCALE, h: 300 * SCALE } },
];

const skeldTasks = [
  { id: 't1', name: 'Swipe Card', room: 'Admin', pos: { x: 1350 * SCALE, y: 700 * SCALE } },
  { id: 't2', name: 'Empty Chute', room: 'Cafeteria', pos: { x: 1100 * SCALE, y: 100 * SCALE } },
  { id: 't3', name: 'Upload Data', room: 'Navigation', pos: { x: 1850 * SCALE, y: 650 * SCALE } },
  { id: 't4', name: 'Fix Wiring', room: 'Electrical', pos: { x: 950 * SCALE, y: 1100 * SCALE } },
  { id: 't5', name: 'Divert Power', room: 'Reactor', pos: { x: 250 * SCALE, y: 1400 * SCALE } },
  { id: 't6', name: 'Scan Bio', room: 'Medbay', pos: { x: 200 * SCALE, y: 800 * SCALE } },
];

const skeldVents: Vent[] = [
  { id: 'sk-v1', pos: { x: 900 * SCALE, y: 100 * SCALE }, links: ['sk-v2'] },
  { id: 'sk-v2', pos: { x: 1300 * SCALE, y: 100 * SCALE }, links: ['sk-v1'] },
  { id: 'sk-v3', pos: { x: 100 * SCALE, y: 650 * SCALE }, links: ['sk-v4'] },
  { id: 'sk-v4', pos: { x: 100 * SCALE, y: 1000 * SCALE }, links: ['sk-v3'] },
  { id: 'sk-v5', pos: { x: 900 * SCALE, y: 1100 * SCALE }, links: ['sk-v6'] },
  { id: 'sk-v6', pos: { x: 1200 * SCALE, y: 1100 * SCALE }, links: ['sk-v5'] },
];

const skeldDoors: Door[] = [
  { id: 'sk-d1', pos: { x: 980 * SCALE, y: 540 * SCALE }, w: 260 * SCALE, h: 40 * SCALE, room: 'Cafeteria', isOpen: true },
  { id: 'sk-d2', pos: { x: 500 * SCALE, y: 890 * SCALE }, w: 40 * SCALE, h: 100 * SCALE, room: 'Medbay', isOpen: true },
  { id: 'sk-d3', pos: { x: 1260 * SCALE, y: 1040 * SCALE }, w: 40 * SCALE, h: 120 * SCALE, room: 'Electrical', isOpen: true },
];

// --- MASTER POLUS DATA (Optimized Layout) ---
const rawPolusWalls: Wall[] = [
  // Outer Enclosure
  { x: 0, y: 0, w: 2800, h: 40 }, { x: 0, y: 2160, w: 2800, h: 40 },
  { x: 0, y: 0, w: 40, h: 2200 }, { x: 2760, y: 0, w: 40, h: 2200 },

  // Dropship (South)
  { x: 1100, y: 1700, w: 250, h: 40 }, { x: 1450, y: 1700, w: 250, h: 40 }, // North door
  { x: 1100, y: 1700, w: 40, h: 400 }, { x: 1660, y: 1700, w: 40, h: 400 },
  { x: 1100, y: 2100, w: 600, h: 40 },

  // Office Cluster (Center)
  { x: 1100, y: 800, w: 600, h: 40 }, { x: 1100, y: 1200, w: 220, h: 40 }, { x: 1480, y: 1200, w: 220, h: 40 },
  { x: 1100, y: 800, w: 40, h: 140 }, { x: 1100, y: 1060, w: 40, h: 140 },
  { x: 1660, y: 800, w: 40, h: 140 }, { x: 1660, y: 1060, w: 40, h: 140 },

  // Laboratory Building (Northwest)
  { x: 200, y: 150, w: 800, h: 40 }, { x: 200, y: 650, w: 800, h: 40 },
  { x: 200, y: 150, w: 40, h: 500 }, { x: 960, y: 150, w: 40, h: 180 }, { x: 960, y: 470, w: 40, h: 180 },

  // Medbay Building (West)
  { x: 200, y: 750, w: 400, h: 40 }, { x: 200, y: 1050, w: 400, h: 40 },
  { x: 200, y: 750, w: 40, h: 300 }, { x: 560, y: 750, w: 40, h: 100 }, { x: 560, y: 950, w: 40, h: 100 },

  // Security & Electrical Building (Mid-West)
  { x: 50, y: 1150, w: 600, h: 40 }, { x: 50, y: 1650, w: 220, h: 40 }, { x: 430, y: 1650, w: 220, h: 40 },
  { x: 50, y: 1150, w: 40, h: 500 }, { x: 610, y: 1150, w: 40, h: 160 }, { x: 610, y: 1450, w: 40, h: 200 },
  { x: 330, y: 1150, w: 40, h: 500 },

  // --- O2, Boiler & Comms Building (East) ---
  { x: 2700, y: 1100, w: 40, h: 750 }, 
  { x: 2100, y: 1100, w: 180, h: 40 }, { x: 2420, y: 1100, w: 280, h: 40 }, 
  { x: 2100, y: 1100, w: 40, h: 250 }, 
  { x: 2100, y: 1350, w: 600, h: 40 }, 
  { x: 2100, y: 1350, w: 40, h: 100 }, { x: 2100, y: 1550, w: 40, h: 50 }, 
  { x: 2100, y: 1600, w: 600, h: 40 }, 
  { x: 2100, y: 1600, w: 40, h: 250 }, 
  { x: 2100, y: 1850, w: 180, h: 40 }, { x: 2420, y: 1850, w: 280, h: 40 }, 

  // --- Specimen Room Building (Northeast) ---
  { x: 1800, y: 100, w: 800, h: 40 }, { x: 1800, y: 900, w: 800, h: 40 },
  { x: 1800, y: 100, w: 40, h: 200 }, { x: 1800, y: 450, w: 40, h: 150 }, { x: 1800, y: 750, w: 40, h: 150 },
  { x: 2560, y: 100, w: 40, h: 800 },

  // Decontamination Hallways
  { x: 1550, y: 200, w: 40, h: 100 }, { x: 1550, y: 500, w: 40, h: 160 },
  { x: 1760, y: 200, w: 40, h: 100 }, { x: 1760, y: 500, w: 40, h: 160 },
  { x: 1550, y: 200, w: 250, h: 40 }, { x: 1550, y: 660, w: 250, h: 40 },

  // Storage Area (South-Center)
  { x: 1100, y: 1300, w: 220, h: 40 }, { x: 1480, y: 1300, w: 220, h: 40 },
  { x: 1100, y: 1650, w: 220, h: 40 }, { x: 1480, y: 1650, w: 220, h: 40 },
  { x: 1100, y: 1300, w: 40, h: 350 }, { x: 1660, y: 1300, w: 40, h: 350 },

  // Weapons (Far Northeast)
  { x: 2600, y: 100, w: 150, h: 40 }, { x: 2600, y: 500, w: 150, h: 40 },
  { x: 2600, y: 100, w: 40, h: 400 },

  // Rocks
  { x: 700, y: 800, w: 80, h: 150 }, 
  { x: 700, y: 1300, w: 80, h: 80 }, 
  { x: 1800, y: 1950, w: 120, h: 80 }, 
  { x: 1450, y: 500, w: 100, h: 60 },
];

const polusProps: MapProp[] = [
  { x: 1300, y: 1000, type: 'table', w: 200, h: 60 }, 
  { x: 1550, y: 850, type: 'console', w: 80, h: 100 }, 
  { x: 1350, y: 1850, type: 'console', w: 100, h: 40 }, 
  { x: 400, y: 250, type: 'engine', w: 150, h: 150 }, 
  { x: 2100, y: 300, type: 'crate', w: 200, h: 200 }, 
  { x: 150, y: 1300, type: 'engine', w: 120, h: 120 }, 
  { x: 450, y: 1250, type: 'console', w: 100, h: 40 }, 
  { x: 2500, y: 1720, type: 'console', w: 40, h: 100 }, 
  { x: 2400, y: 1450, type: 'engine', w: 100, h: 100 }, 
  { x: 1300, y: 1400, type: 'crate', w: 200, h: 200 }, 
  { x: 2650, y: 250, type: 'console', w: 60, h: 60 }, 
  { x: 400, y: 850, type: 'bed', w: 80, h: 120 }, 
].map(p => ({ ...p, x: p.x * SCALE, y: p.y * SCALE, w: p.w * SCALE, h: p.h * SCALE }) as MapProp);

const polusRooms: RoomConfig[] = [
  { name: 'Office', pos: { x: 1380 * SCALE, y: 1000 * SCALE }, size: { w: 560 * SCALE, h: 400 * SCALE } },
  { name: 'Dropship', pos: { x: 1380 * SCALE, y: 1930 * SCALE }, size: { w: 560 * SCALE, h: 460 * SCALE } },
  { name: 'Laboratory', pos: { x: 580 * SCALE, y: 400 * SCALE }, size: { w: 800 * SCALE, h: 500 * SCALE } },
  { name: 'Medbay', pos: { x: 380 * SCALE, y: 900 * SCALE }, size: { w: 400 * SCALE, h: 300 * SCALE } },
  { name: 'Specimen Room', pos: { x: 2180 * SCALE, y: 500 * SCALE }, size: { w: 800 * SCALE, h: 800 * SCALE } },
  { name: 'Security', pos: { x: 470 * SCALE, y: 1400 * SCALE }, size: { w: 280 * SCALE, h: 500 * SCALE } },
  { name: 'Electrical', pos: { x: 190 * SCALE, y: 1400 * SCALE }, size: { w: 280 * SCALE, h: 500 * SCALE } },
  { name: 'Storage', pos: { x: 1380 * SCALE, y: 1475 * SCALE }, size: { w: 560 * SCALE, h: 350 * SCALE } },
  { name: 'O2', pos: { x: 2400 * SCALE, y: 1225 * SCALE }, size: { w: 600 * SCALE, h: 250 * SCALE } },
  { name: 'Boiler Room', pos: { x: 2400 * SCALE, y: 1475 * SCALE }, size: { w: 600 * SCALE, h: 250 * SCALE } },
  { name: 'Communications', pos: { x: 2400 * SCALE, y: 1725 * SCALE }, size: { w: 600 * SCALE, h: 250 * SCALE } },
  { name: 'Weapons', pos: { x: 2675 * SCALE, y: 300 * SCALE }, size: { w: 150 * SCALE, h: 400 * SCALE } },
];

const polusTasks = [
  { id: 'pt1', name: 'Scan Boarding Pass', room: 'Office', pos: { x: 1200 * SCALE, y: 850 * SCALE } },
  { id: 'pt2', name: 'Submit Scan', room: 'Medbay', pos: { x: 300 * SCALE, y: 850 * SCALE } },
  { id: 'pt3', name: 'Start Seismic Stabilizers', room: 'Electrical', pos: { x: 150 * SCALE, y: 1300 * SCALE } },
  { id: 'pt4', name: 'Unlock Manifolds', room: 'Specimen Room', pos: { x: 2400 * SCALE, y: 200 * SCALE } },
  { id: 'pt5', name: 'Reboot Wifi', room: 'Communications', pos: { x: 2500 * SCALE, y: 1720 * SCALE } },
  { id: 'pt6', name: 'Chart Course', room: 'Dropship', pos: { x: 1350 * SCALE, y: 1800 * SCALE } },
  { id: 'pt7', name: 'Clear Asteroids', room: 'Weapons', pos: { x: 2700 * SCALE, y: 250 * SCALE } },
  { id: 'pt8', name: 'Refill Bottles', room: 'O2', pos: { x: 2200 * SCALE, y: 1200 * SCALE } },
  { id: 'pt9', name: 'Replace Water Jug', room: 'Boiler Room', pos: { x: 2400 * SCALE, y: 1470 * SCALE } },
  { id: 'pt10', name: 'Empty Garbage', room: 'O2', pos: { x: 2600 * SCALE, y: 1200 * SCALE } },
  { id: 'pt11', name: 'Repair Drill', room: 'Laboratory', pos: { x: 400 * SCALE, y: 250 * SCALE } },
  { id: 'pt13', name: 'Store Artifacts', room: 'Specimen Room', pos: { x: 2000 * SCALE, y: 800 * SCALE } },
];

const polusVents: Vent[] = [
  { id: 'pv1', pos: { x: 300 * SCALE, y: 300 * SCALE }, links: ['pv2', 'pv3'] },
  { id: 'pv2', pos: { x: 500 * SCALE, y: 1300 * SCALE }, links: ['pv1', 'pv4'] },
  { id: 'pv3', pos: { x: 1200 * SCALE, y: 850 * SCALE }, links: ['pv1', 'pv4'] },
  { id: 'pv4', pos: { x: 800 * SCALE, y: 1300 * SCALE }, links: ['pv2', 'pv3'] },
  { id: 'pv5', pos: { x: 1200 * SCALE, y: 1400 * SCALE }, links: ['pv6'] },
  { id: 'pv6', pos: { x: 2500 * SCALE, y: 1725 * SCALE }, links: ['pv5'] },
  { id: 'pv7', pos: { x: 1900 * SCALE, y: 200 * SCALE }, links: ['pv8', 'pv9'] },
  { id: 'pv8', pos: { x: 2650 * SCALE, y: 400 * SCALE }, links: ['pv7'] },
  { id: 'pv9', pos: { x: 1900 * SCALE, y: 800 * SCALE }, links: ['pv7'] },
];

// --- RESTORED AIRSHIP DATA ---
const rawAirshipWalls: Wall[] = [
  { x: 0, y: 0, w: 2000, h: 40 }, { x: 0, y: 1560, w: 2000, h: 40 },
  { x: 0, y: 0, w: 40, h: 1600 }, { x: 1960, y: 0, w: 40, h: 1600 },
  { x: 800, y: 40, w: 40, h: 150 }, { x: 800, y: 280, w: 40, h: 120 }, 
  { x: 1160, y: 40, w: 40, h: 150 }, { x: 1160, y: 280, w: 40, h: 120 }, 
  { x: 40, y: 400, w: 350, h: 40 }, { x: 480, y: 400, w: 320, h: 40 }, 
  { x: 800, y: 400, w: 100, h: 40 }, { x: 1060, y: 400, w: 100, h: 40 }, 
  { x: 1160, y: 400, w: 350, h: 40 }, { x: 1600, y: 400, w: 360, h: 40 }, 
  { x: 640, y: 400, w: 40, h: 150 }, { x: 640, y: 650, w: 40, h: 150 }, 
  { x: 1320, y: 400, w: 40, h: 150 }, { x: 1320, y: 650, w: 40, h: 150 }, 
  { x: 40, y: 800, w: 250, h: 40 }, { x: 400, y: 800, w: 240, h: 40 }, 
  { x: 1320, y: 800, w: 250, h: 40 }, { x: 1650, y: 800, w: 310, h: 40 }, 
  { x: 40, y: 1100, w: 250, h: 40 }, { x: 400, y: 1100, w: 550, h: 40 }, { x: 1050, y: 1100, w: 550, h: 40 }, { x: 1700, y: 1100, w: 260, h: 40 },
  { x: 640, y: 1100, w: 40, h: 150 }, { x: 640, y: 1350, w: 40, h: 210 }, 
  { x: 1320, y: 1100, w: 40, h: 150 }, { x: 1320, y: 1350, w: 40, h: 210 }, 
];

const airshipProps: MapProp[] = [
  { x: 100, y: 100, type: 'cockpit_chair', w: 100, h: 100 }, 
  { x: 1750, y: 150, type: 'safe', w: 120, h: 120 },
  { x: 950, y: 150, type: 'table', w: 100, h: 100 }, 
  { x: 1150, y: 1150, type: 'kitchen_counter', w: 150, h: 80 },
  { x: 200, y: 1300, type: 'engine', w: 200, h: 150 },
  { x: 1600, y: 1300, type: 'bed', w: 120, h: 180 }, 
  { x: 1000, y: 550, type: 'console', w: 80, h: 40 }, 
  { x: 1400, y: 600, type: 'crate', w: 100, h: 100 }, 
].map(p => ({ ...p, x: p.x * SCALE, y: p.y * SCALE, w: p.w * SCALE, h: p.h * SCALE }) as MapProp);

const airshipRooms: RoomConfig[] = [
  { name: 'Cockpit', pos: { x: 420 * SCALE, y: 220 * SCALE }, size: { w: 760 * SCALE, h: 360 * SCALE } },
  { name: 'Meeting Room', pos: { x: 1000 * SCALE, y: 220 * SCALE }, size: { w: 320 * SCALE, h: 360 * SCALE } },
  { name: 'Vault', pos: { x: 1580 * SCALE, y: 220 * SCALE }, size: { w: 760 * SCALE, h: 360 * SCALE } },
  { name: 'Gap Room', pos: { x: 1000 * SCALE, y: 600 * SCALE }, size: { w: 600 * SCALE, h: 360 * SCALE } },
  { name: 'Security', pos: { x: 340 * SCALE, y: 600 * SCALE }, size: { w: 600 * SCALE, h: 360 * SCALE } },
  { name: 'Records', pos: { x: 1660 * SCALE, y: 600 * SCALE }, size: { w: 600 * SCALE, h: 360 * SCALE } },
  { name: 'Kitchen', pos: { x: 1000 * SCALE, y: 950 * SCALE }, size: { w: 1920 * SCALE, h: 260 * SCALE } },
  { name: 'Engine Room', pos: { x: 340 * SCALE, y: 1330 * SCALE }, size: { w: 600 * SCALE, h: 420 * SCALE } },
  { name: 'Brig', pos: { x: 1000 * SCALE, y: 1330 * SCALE }, size: { w: 600 * SCALE, h: 420 * SCALE } },
  { name: 'Medical', pos: { x: 1660 * SCALE, y: 1330 * SCALE }, size: { w: 600 * SCALE, h: 420 * SCALE } },
];

const airshipTasks = [
  { id: 'at1', name: 'Polish Ruby', room: 'Vault', pos: { x: 1800 * SCALE, y: 150 * SCALE } },
  { id: 'at2', name: 'Unlock Safe', room: 'Vault', pos: { x: 1750 * SCALE, y: 250 * SCALE } },
  { id: 'at3', name: 'Stabilize Steering', room: 'Cockpit', pos: { x: 150 * SCALE, y: 100 * SCALE } },
  { id: 'at4', name: 'Sort Records', room: 'Records', pos: { x: 1700 * SCALE, y: 650 * SCALE } },
  { id: 'at5', name: 'Dress Mannequin', room: 'Vault', pos: { x: 1600 * SCALE, y: 350 * SCALE } },
  { id: 'at6', name: 'Decontaminate', room: 'Brig', pos: { x: 950 * SCALE, y: 1400 * SCALE } },
  { id: 'at7', name: 'Empty Trash', room: 'Kitchen', pos: { x: 1000 * SCALE, y: 1050 * SCALE } },
  { id: 'at8', name: 'Fix Wiring', room: 'Engine Room', pos: { x: 200 * SCALE, y: 1450 * SCALE } },
  { id: 'at9', name: 'Upload Data', room: 'Security', pos: { x: 300 * SCALE, y: 550 * SCALE } },
  { id: 'at10', name: 'Pick Up Towels', room: 'Medical', pos: { x: 1700 * SCALE, y: 1350 * SCALE } },
  { id: 'at11', name: 'Set Engine Output', room: 'Engine Room', pos: { x: 450 * SCALE, y: 1400 * SCALE } },
];

const airshipVents: Vent[] = [
  { id: 'air-v1', pos: { x: 150 * SCALE, y: 250 * SCALE }, links: ['air-v2'] },
  { id: 'air-v2', pos: { x: 1000 * SCALE, y: 100 * SCALE }, links: ['air-v1', 'air-v3'] },
  { id: 'air-v3', pos: { x: 1850 * SCALE, y: 250 * SCALE }, links: ['air-v2'] },
  { id: 'air-v4', pos: { x: 400 * SCALE, y: 650 * SCALE }, links: ['air-v5'] },
  { id: 'air-v5', pos: { x: 1000 * SCALE, y: 650 * SCALE }, links: ['air-v4', 'air-v6'] },
  { id: 'air-v6', pos: { x: 1600 * SCALE, y: 650 * SCALE }, links: ['air-v5'] },
];

export const MAPS_DATA: Record<string, MapData> = {
  'The Skeld': {
    walls: rawSkeldWalls.map(w => ({ x: w.x * SCALE, y: w.y * SCALE, w: w.w * SCALE, h: w.h * SCALE })),
    props: skeldProps,
    rooms: skeldRooms,
    emergencyButtonPos: { x: 1000 * SCALE, y: 350 * SCALE },
    tasks: skeldTasks,
    vents: skeldVents,
    doors: skeldDoors
  },
  'Airship': {
    walls: rawAirshipWalls.map(w => ({ x: w.x * SCALE, y: w.y * SCALE, w: w.w * SCALE, h: w.h * SCALE })),
    props: airshipProps,
    rooms: airshipRooms,
    emergencyButtonPos: { x: 1000 * SCALE, y: 300 * SCALE }, 
    tasks: airshipTasks,
    vents: airshipVents,
    doors: [
      { id: 'air-d1', pos: { x: 800 * SCALE, y: 235 * SCALE }, w: 40 * SCALE, h: 90 * SCALE, room: 'Meeting Room', isOpen: true },
      { id: 'air-d2', pos: { x: 1160 * SCALE, y: 235 * SCALE }, w: 40 * SCALE, h: 90 * SCALE, room: 'Meeting Room', isOpen: true },
    ]
  },
  'Mira HQ': {
    walls: rawSkeldWalls.map(w => ({ x: w.x * SCALE, y: w.y * SCALE, w: w.w * SCALE, h: w.h * SCALE })), 
    props: skeldProps,
    rooms: skeldRooms,
    emergencyButtonPos: { x: 1000 * SCALE, y: 350 * SCALE },
    tasks: skeldTasks,
    vents: skeldVents,
    doors: []
  },
  'Polus': {
    walls: rawPolusWalls.map(w => ({ x: w.x * SCALE, y: w.y * SCALE, w: w.w * SCALE, h: w.h * SCALE })), 
    props: polusProps,
    rooms: polusRooms,
    emergencyButtonPos: { x: 1380 * SCALE, y: 850 * SCALE }, 
    tasks: polusTasks,
    vents: polusVents,
    doors: [
      { id: 'pol-d1', pos: { x: 1400 * SCALE, y: 1200 * SCALE }, w: 160 * SCALE, h: 40 * SCALE, room: 'Office', isOpen: true },
      { id: 'pol-d2', pos: { x: 560 * SCALE, y: 900 * SCALE }, w: 40 * SCALE, h: 100 * SCALE, room: 'Medbay', isOpen: true },
      { id: 'pol-d3', pos: { x: 960 * SCALE, y: 400 * SCALE }, w: 40 * SCALE, h: 140 * SCALE, room: 'Laboratory', isOpen: true },
    ]
  }
};

// Compatibility exports
export const WALLS = MAPS_DATA['The Skeld'].walls;
export const PROPS = MAPS_DATA['The Skeld'].props;
export const ROOMS = MAPS_DATA['The Skeld'].rooms;
export const EMERGENCY_BUTTON_POS = MAPS_DATA['The Skeld'].emergencyButtonPos;
export const TASKS_LIST = MAPS_DATA['The Skeld'].tasks;
export const VENTS = MAPS_DATA['The Skeld'].vents;
