
import express from "express";
import { createServer as createViteServer } from "vite";
import { WebSocketServer, WebSocket } from "ws";
import http from "http";

async function startServer() {
  const app = express();
  const server = http.createServer(app);
  const PORT = 3000;

  // WebSocket setup for real-time multi-user
  const wss = new WebSocketServer({ server });

  const rooms = new Map<string, Set<WebSocket>>();

  // Heartbeat to keep connections alive through proxies
  const heartbeat = setInterval(() => {
    wss.clients.forEach((ws: any) => {
      if (ws.isAlive === false) return ws.terminate();
      ws.isAlive = false;
      ws.ping();
    });
  }, 30000);

  wss.on("connection", (ws: any) => {
    ws.isAlive = true;
    ws.on('pong', () => { ws.isAlive = true; });

    let currentRoom: string | null = null;

    ws.on("message", (data) => {
      try {
        const message = JSON.parse(data.toString());

        if (message.type === "JOIN_ROOM") {
          const roomCode = message.roomCode;
          if (currentRoom && currentRoom !== roomCode) {
            rooms.get(currentRoom)?.delete(ws);
          }
          currentRoom = roomCode;
          if (!rooms.has(roomCode)) {
            rooms.set(roomCode, new Set());
          }
          rooms.get(roomCode)!.add(ws);
          console.log(`Client joined room: ${roomCode}. Total in room: ${rooms.get(roomCode)?.size}`);
          return;
        }

        // Broadcast to others in the same room
        if (currentRoom && rooms.has(currentRoom)) {
          const clients = rooms.get(currentRoom)!;
          clients.forEach(client => {
            if (client !== ws && client.readyState === WebSocket.OPEN) {
              client.send(data.toString());
            }
          });
        }
        
        // Handle global discovery and initial join requests
        // JOIN_REQ needs to be global or routed by code because the joiner 
        // might not be fully synced in the room yet from the host's perspective
        if (message.type === "LOBBY_ANNOUNCE" || message.type === "LOBBY_DISCOVERY_REQ" || message.type === "JOIN_REQ") {
          wss.clients.forEach(client => {
            // For JOIN_REQ, we can be more specific if we want, but global is safer for discovery phase
            if (client !== ws && client.readyState === WebSocket.OPEN) {
              client.send(data.toString());
            }
          });
        }
      } catch (err) {
        console.error("Error processing WebSocket message:", err);
      }
    });

    ws.on("close", () => {
      if (currentRoom) {
        rooms.get(currentRoom)?.delete(ws);
        if (rooms.get(currentRoom)?.size === 0) {
          rooms.delete(currentRoom);
        }
      }
    });

    ws.on("error", (err) => {
      console.error("WebSocket error:", err);
    });
  });

  wss.on('close', () => {
    clearInterval(heartbeat);
  });

  // Vite middleware for development
  console.log(`Server starting in ${process.env.NODE_ENV || 'development'} mode`);
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static("dist"));
  }

  server.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
