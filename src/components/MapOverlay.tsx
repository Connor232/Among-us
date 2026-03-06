
import React from 'react';
import { Player, Task, SabotageType, PlayerRole, Door } from '../types';
import { MAP_SIZE, MapData, SCALE } from '../constants';

interface MapOverlayProps {
  players: Player[];
  localPlayerId: string;
  tasks: Task[];
  onClose: () => void;
  mapData: MapData;
  activeSabotage?: SabotageType | null;
  isImpostor?: boolean;
  onSabotage?: (type: SabotageType) => void;
  onToggleDoor?: (doorId: string) => void;
  sabotageCooldown?: number;
  doorCooldown?: number;
  doors?: Door[];
}

const MapOverlay: React.FC<MapOverlayProps> = ({ 
  players, localPlayerId, tasks, onClose, mapData, activeSabotage,
  isImpostor, onSabotage, onToggleDoor, sabotageCooldown = 0, doorCooldown = 0, doors = []
}) => {
  const localPlayer = players.find(p => p.id === localPlayerId);
  const isCommsDown = activeSabotage === SabotageType.COMMS && localPlayer?.role === PlayerRole.CREWMATE;
  
  // Scale factor to fit map on screen (world is ~100x80 units)
  const SCALE_UI = 8; 
  const MAP_WIDTH = MAP_SIZE.width * SCALE_UI;
  const MAP_HEIGHT = MAP_SIZE.height * SCALE_UI;

  const sabotageLocations = React.useMemo(() => {
    // Define sabotage locations per map
    const locations: Record<string, { type: SabotageType, pos: { x: number, y: number } }[]> = {
      'The Skeld': [
        { type: SabotageType.LIGHTS, pos: { x: 1000 * SCALE, y: 1100 * SCALE } }, // Electrical
        { type: SabotageType.COMMS, pos: { x: 1000 * SCALE, y: 300 * SCALE } }, // Cafeteria (proxy for comms)
      ],
      'Polus': [
        { type: SabotageType.LIGHTS, pos: { x: 190 * SCALE, y: 1400 * SCALE } }, // Electrical
        { type: SabotageType.COMMS, pos: { x: 2400 * SCALE, y: 1725 * SCALE } }, // Communications
      ],
      'Airship': [
        { type: SabotageType.LIGHTS, pos: { x: 340 * SCALE, y: 600 * SCALE } }, // Security (proxy for lights)
        { type: SabotageType.COMMS, pos: { x: 1660 * SCALE, y: 600 * SCALE } }, // Records (proxy for comms)
      ]
    };
    // Determine current map name from mapData or props (mapData doesn't have name, but we can infer from rooms)
    // For now, let's just find which map it is by checking room names
    const roomNames = mapData.rooms.map(r => r.name);
    let mapName = 'The Skeld';
    if (roomNames.includes('Office')) mapName = 'Polus';
    if (roomNames.includes('Cockpit')) mapName = 'Airship';

    return locations[mapName] || locations['The Skeld'];
  }, [mapData]);

  return (
    <div 
      className="fixed inset-0 bg-slate-900/70 backdrop-blur-md flex items-center justify-center z-[70] p-10 animate-in fade-in duration-300"
      onClick={onClose}
    >
      <div 
        className="relative bg-slate-100 border-[10px] border-slate-300 rounded-[3rem] p-10 shadow-2xl flex flex-col items-center"
        onClick={e => e.stopPropagation()}
      >
        
        <button 
          onClick={onClose}
          className="absolute top-6 right-6 w-12 h-12 bg-red-500 hover:bg-red-600 rounded-xl flex items-center justify-center text-white font-black text-2xl transition-all hover:scale-110 active:scale-95 shadow-md"
        >
          ✕
        </button>

        <h2 className="text-3xl font-black text-slate-800 mb-8 uppercase italic tracking-[0.5rem] text-center border-b-4 border-blue-400 pb-1">
          {isImpostor ? 'Sabotage Controls' : 'Map Schematic'}
        </h2>

        {/* The Blueprint */}
        <div 
          className="relative bg-slate-200 border-4 border-slate-300 overflow-hidden rounded-[1.5rem] shadow-inner"
          style={{ width: MAP_WIDTH, height: MAP_HEIGHT }}
        >
          {/* Grid Background */}
          <div className="absolute inset-0 opacity-15" style={{ 
            backgroundImage: 'linear-gradient(#475569 1px, transparent 1px), linear-gradient(90deg, #475569 1px, transparent 1px)',
            backgroundSize: '20px 20px'
          }} />

          {/* Draw Rooms Areas */}
          {mapData.rooms.map((room) => (
            <div 
              key={room.name}
              className="absolute bg-blue-400/10 border-2 border-blue-400/20 flex items-center justify-center rounded-sm"
              style={{
                left: (room.pos.x - room.size.w/2) * SCALE_UI,
                top: (room.pos.y - room.size.h/2) * SCALE_UI,
                width: room.size.w * SCALE_UI,
                height: room.size.h * SCALE_UI
              }}
            >
              <span className="text-[10px] font-black text-blue-900/30 uppercase tracking-widest text-center px-2 leading-tight">
                {room.name}
              </span>
            </div>
          ))}

          {/* Draw Walls */}
          {mapData.walls.map((wall) => (
            <div 
              key={`${wall.x}-${wall.y}-${wall.w}-${wall.h}`}
              className="absolute bg-slate-500/50"
              style={{
                left: wall.x * SCALE_UI,
                top: wall.y * SCALE_UI,
                width: wall.w * SCALE_UI,
                height: wall.h * SCALE_UI
              }}
            />
          ))}

          {/* Draw Tasks Icons */}
          {!isImpostor && !isCommsDown && tasks.map(task => !task.completed && (
            <div 
              key={task.id}
              className="absolute w-4 h-4 bg-yellow-500 rounded-full border-2 border-yellow-700 flex items-center justify-center shadow-[0_0_10px_rgba(234,179,8,0.5)] animate-pulse z-10"
              style={{
                left: task.pos.x * SCALE_UI - 8,
                top: task.pos.y * SCALE_UI - 8
              }}
            >
              <span className="text-[9px] font-black text-yellow-950">!</span>
            </div>
          ))}

          {/* Comms Down Overlay */}
          {isCommsDown && (
            <div className="absolute inset-0 bg-red-900/20 backdrop-blur-sm flex items-center justify-center z-30">
               <div className="bg-red-600 text-white font-black uppercase italic text-2xl p-6 rounded-2xl border-4 border-white animate-pulse shadow-2xl">
                 COMMUNICATIONS DOWN
               </div>
            </div>
          )}

          {/* Draw Player Marker */}
          {localPlayer && localPlayer.isAlive && (
            <div 
              className="absolute z-20 pointer-events-none"
              style={{
                left: localPlayer.pos.x * SCALE_UI,
                top: localPlayer.pos.y * SCALE_UI,
              }}
            >
              <div className="absolute -translate-x-1/2 -translate-y-1/2 w-8 h-8 bg-blue-500 rounded-full animate-ping opacity-30" />
              <div className="absolute -translate-x-1/2 -translate-y-1/2 w-4 h-4 bg-blue-600 rounded-full border-2 border-white shadow-md" />
              
              <div className="absolute top-4 left-0 -translate-x-1/2 bg-blue-800 px-2 py-0.5 rounded text-[8px] font-black text-white whitespace-nowrap uppercase tracking-wider">
                Local
              </div>
            </div>
          )}

          {/* Impostor Actions */}
          {isImpostor && (
            <>
              {/* Sabotages */}
              {sabotageLocations.map((sab, i) => (
                <button
                  key={`sab-${i}`}
                  onClick={() => onSabotage?.(sab.type)}
                  disabled={sabotageCooldown > 0}
                  className={`absolute -translate-x-1/2 -translate-y-1/2 w-10 h-10 rounded-full border-2 flex items-center justify-center shadow-lg transition-all z-40 ${
                    sabotageCooldown > 0 ? 'bg-gray-800 border-gray-600 opacity-50' : 'bg-orange-600 border-orange-400 hover:scale-110 active:scale-95'
                  }`}
                  style={{
                    left: sab.pos.x * SCALE_UI,
                    top: sab.pos.y * SCALE_UI,
                  }}
                >
                  <span className="text-[8px] font-black text-white text-center leading-tight">
                    {sab.type === SabotageType.LIGHTS ? 'LIGHTS' : 'COMMS'}
                  </span>
                </button>
              ))}

              {/* Doors */}
              {doors.map((door) => (
                <button
                  key={door.id}
                  onClick={() => onToggleDoor?.(door.id)}
                  disabled={doorCooldown > 0}
                  className={`absolute -translate-x-1/2 -translate-y-1/2 w-8 h-8 rounded-lg border-2 flex items-center justify-center shadow-md transition-all z-40 ${
                    doorCooldown > 0 ? 'bg-gray-800 border-gray-600 opacity-50' : 
                    door.isOpen ? 'bg-teal-600 border-teal-400 hover:scale-110' : 'bg-red-600 border-red-400 hover:scale-110'
                  }`}
                  style={{
                    left: (door.pos.x + door.w/2) * SCALE_UI,
                    top: (door.pos.y + door.h/2) * SCALE_UI,
                  }}
                >
                  <span className="text-[8px] font-black text-white">DOOR</span>
                </button>
              ))}
            </>
          )}
        </div>

        <div className="mt-8 flex gap-10 text-[10px] font-black uppercase tracking-widest text-slate-500">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-blue-600 rounded-full border border-white" />
            <span>Personnel</span>
          </div>
          {!isImpostor && (
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-yellow-500 rounded-full border border-yellow-700" />
              <span>Task</span>
            </div>
          )}
          {isImpostor && (
            <>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-orange-600 rounded-full border border-orange-400" />
                <span>Sabotage</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-teal-600 rounded-lg border border-teal-400" />
                <span>Door</span>
              </div>
            </>
          )}
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-blue-100 border border-blue-200" />
            <span>Room</span>
          </div>
        </div>

        <div className="mt-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.3rem] animate-pulse">
          Press {isImpostor ? '[TAB]' : '[M]'} to Close
        </div>
      </div>
    </div>
  );
};

export default MapOverlay;
