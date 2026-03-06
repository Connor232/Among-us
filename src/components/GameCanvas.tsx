
import React, { useRef, useEffect, useCallback } from 'react';
import { Player, Task, DeadBody, PlayerRole } from '../types';
import { WALLS, PROPS, ROOMS, MAP_SIZE, VISION_RADIUS } from '../constants';

interface GameCanvasProps {
  players: Player[];
  localPlayerId: string;
  tasks: Task[];
  deadBodies: DeadBody[];
}

const GameCanvas: React.FC<GameCanvasProps> = ({ players, localPlayerId, tasks, deadBodies }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const requestRef = useRef<number>(0);
  const PIXELS_PER_UNIT = 40; // Scale factor for rendering

  // Store data in a ref to avoid recreating the drawing loop when props change
  const dataRef = useRef({ players, localPlayerId, tasks, deadBodies });

  useEffect(() => {
    dataRef.current = { players, localPlayerId, tasks, deadBodies };
  }, [players, localPlayerId, tasks, deadBodies]);

  const draw = useCallback((ctx: CanvasRenderingContext2D) => {
    const { players, localPlayerId, tasks, deadBodies } = dataRef.current;
    const localPlayer = players.find(p => p.id === localPlayerId);
    if (!localPlayer) return;

    const canvas = ctx.canvas;
    const width = canvas.width;
    const height = canvas.height;

    // Clear background - Medium Grey (#94a3b8)
    ctx.fillStyle = '#94a3b8';
    ctx.fillRect(0, 0, width, height);

    // Camera transform
    ctx.save();
    ctx.translate(width / 2, height / 2);
    ctx.translate(-localPlayer.pos.x * PIXELS_PER_UNIT, -localPlayer.pos.y * PIXELS_PER_UNIT);

    // Grid removed per request

    // Draw Rooms Labels - Deep Slate
    ctx.font = 'bold 40px Inter';
    ctx.fillStyle = 'rgba(15, 23, 42, 0.12)';
    ctx.textAlign = 'center';
    ROOMS.forEach(room => {
      ctx.fillText(room.name.toUpperCase(), room.pos.x * PIXELS_PER_UNIT, room.pos.y * PIXELS_PER_UNIT);
    });

    // Draw Walls - Grey Color (#64748b)
    ctx.fillStyle = '#64748b';
    WALLS.forEach(wall => {
      ctx.fillRect(
        wall.x * PIXELS_PER_UNIT,
        wall.y * PIXELS_PER_UNIT,
        wall.w * PIXELS_PER_UNIT,
        wall.h * PIXELS_PER_UNIT
      );
    });

    // Draw Props
    ctx.fillStyle = '#475569';
    PROPS.forEach(prop => {
      if (prop.type === 'table') {
        ctx.beginPath();
        ctx.arc(
          (prop.x + prop.w / 2) * PIXELS_PER_UNIT,
          (prop.y + prop.h / 2) * PIXELS_PER_UNIT,
          (prop.w / 2) * PIXELS_PER_UNIT,
          0, Math.PI * 2
        );
        ctx.fill();
      } else {
        ctx.fillRect(
          prop.x * PIXELS_PER_UNIT,
          prop.y * PIXELS_PER_UNIT,
          prop.w * PIXELS_PER_UNIT,
          prop.h * PIXELS_PER_UNIT
        );
      }
    });

    // Draw Tasks
    tasks.forEach(task => {
      if (!task.completed) {
        ctx.fillStyle = '#f59e0b';
        ctx.beginPath();
        const pulse = Math.sin(Date.now() / 200) * 3;
        ctx.arc(task.pos.x * PIXELS_PER_UNIT, task.pos.y * PIXELS_PER_UNIT, 10 + pulse, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = 'white';
        ctx.lineWidth = 3;
        ctx.stroke();
      }
    });

    // Draw Dead Bodies
    deadBodies.forEach(body => {
      ctx.fillStyle = body.color;
      ctx.beginPath();
      ctx.ellipse(body.pos.x * PIXELS_PER_UNIT, body.pos.y * PIXELS_PER_UNIT, 20, 10, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = 'white';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.fillStyle = 'white';
      ctx.fillRect(body.pos.x * PIXELS_PER_UNIT - 2, body.pos.y * PIXELS_PER_UNIT - 15, 4, 10);
    });

    // Draw Players
    players.forEach(player => {
      if (!player.isAlive) return;

      const isLocal = player.id === localPlayerId;
      const dist = Math.hypot(player.pos.x - localPlayer.pos.x, player.pos.y - localPlayer.pos.y);
      
      // Vision visibility
      if (!isLocal && dist > VISION_RADIUS) return;

      const px = player.pos.x * PIXELS_PER_UNIT;
      const py = player.pos.y * PIXELS_PER_UNIT;

      // Drop shadow for players
      ctx.shadowColor = 'rgba(0,0,0,0.2)';
      ctx.shadowBlur = 10;
      ctx.shadowOffsetY = 4;

      ctx.fillStyle = player.color;
      ctx.beginPath();
      ctx.roundRect(px - 15, py - 20, 30, 40, 10);
      ctx.fill();

      ctx.shadowBlur = 0;
      ctx.shadowOffsetY = 0;

      ctx.fillStyle = '#bae6fd';
      ctx.beginPath();
      ctx.roundRect(px + 2, py - 12, 18, 12, 5);
      ctx.fill();

      ctx.font = 'bold 16px Inter';
      const isImpostorTeam = localPlayer.role === PlayerRole.IMPOSTOR && player.role === PlayerRole.IMPOSTOR;
      const nameColor = (isImpostorTeam || (isLocal && player.role === PlayerRole.IMPOSTOR)) ? '#dc2626' : '#f8fafc';
      const outlineColor = '#000000';
      
      ctx.textAlign = 'center';
      ctx.strokeStyle = outlineColor;
      ctx.lineWidth = 3;
      ctx.strokeText(player.name, px, py - 30);
      ctx.fillStyle = nameColor;
      ctx.fillText(player.name, px, py - 30);
    });

    ctx.restore();

    // Fog of War Overlay
    const fogGrad = ctx.createRadialGradient(
      width / 2, height / 2, (VISION_RADIUS * PIXELS_PER_UNIT) * 0.4,
      width / 2, height / 2, VISION_RADIUS * PIXELS_PER_UNIT * 1.5
    );
    fogGrad.addColorStop(0, 'transparent');
    fogGrad.addColorStop(1, 'rgba(71, 85, 105, 0.9)'); // Deeper slate-based fog

    ctx.fillStyle = fogGrad;
    ctx.fillRect(0, 0, width, height);

  }, []);

  const animate = useCallback(() => {
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) draw(ctx);
    }
    requestRef.current = requestAnimationFrame(animate);
  }, [draw]);

  useEffect(() => {
    const handleResize = () => {
      if (canvasRef.current) {
        canvasRef.current.width = window.innerWidth;
        canvasRef.current.height = window.innerHeight;
      }
    };
    window.addEventListener('resize', handleResize);
    handleResize();

    requestRef.current = requestAnimationFrame(animate);
    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(requestRef.current);
    };
  }, [animate]);

  return <canvas ref={canvasRef} className="block w-full h-full" />;
};

export default GameCanvas;
