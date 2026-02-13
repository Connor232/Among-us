
import React from 'react';
import { Player, Task, SabotageType, PlayerRole } from '../types';
import { MAP_SIZE, MapData } from '../constants';

interface MapOverlayProps {
  players: Player[];
  localPlayerId: string;
  tasks: Task[];
  onClose: () => void;
  mapData: MapData;
  activeSabotage?: SabotageType | null;
}

const MapOverlay: React.FC<MapOverlayProps> = ({ players, localPlayerId, tasks, onClose, mapData, activeSabotage }) => {
  const localPlayer = players.find(p => p.id === localPlayerId);
  const isCommsDown = activeSabotage === SabotageType.COMMS && localPlayer?.role === PlayerRole.CREWMATE;
  
  // Scale factor to fit map on screen (world is ~100x80 units)
  const SCALE_UI = 8; 
  const MAP_WIDTH = MAP_SIZE.width * SCALE_UI;
  const MAP_HEIGHT = MAP_SIZE.height * SCALE_UI;

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

        <h2 className="text-3xl font-black text-slate-800 mb-8 uppercase italic tracking-[0.5rem] text-center border-b-4 border-blue-400 pb-1">Map Schematic</h2>

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
          {mapData.rooms.map((room, idx) => (
            <div 
              key={idx}
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
          {mapData.walls.map((wall, idx) => (
            <div 
              key={idx}
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
          {!isCommsDown && tasks.map(task => !task.completed && (
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
              className="absolute z-20"
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
        </div>

        <div className="mt-8 flex gap-10 text-[10px] font-black uppercase tracking-widest text-slate-500">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-blue-600 rounded-full border border-white" />
            <span>Personnel</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-yellow-500 rounded-full border border-yellow-700" />
            <span>Task</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-blue-100 border border-blue-200" />
            <span>Room</span>
          </div>
        </div>

        <div className="mt-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.3rem] animate-pulse">
          Press [M] to Close
        </div>
      </div>
    </div>
  );
};

export default MapOverlay;
