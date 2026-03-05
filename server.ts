
import express from "express";
import { createServer as createViteServer } from "vite";
import { WebSocketServer, WebSocket } from "ws";
import http from "http";

async function startServer() {
  const app = express();
  const server = http.createServer(app);
  const PORT = process.env.PORT || 3000;

  // WebSocket setup for real-time multi-user
  const wss = new WebSocketServer({ server });

  const rooms = new Map<string, Set<WebSocket>>();

  wss.on("connection", (ws, req) => {
    const ip = req.socket.remoteAddress;
    console.log(`New connection from ${ip}`);
    let currentRoom: string | null = null;

    ws.on("message", (data) => {
      try {
        const message = JSON.parse(data.toString());

        if (message.type === "JOIN_ROOM") {
          const roomCode = message.roomCode;
          console.log(`Client joining room: ${roomCode}`);
          if (currentRoom) {
            rooms.get(currentRoom)?.delete(ws);
          }
          currentRoom = roomCode;
          if (!rooms.has(roomCode)) {
            rooms.set(roomCode, new Set());
          }
          rooms.get(roomCode)!.add(ws);
          return;
        }

        // Broadcast to others in the same room
        if (currentRoom && rooms.has(currentRoom)) {
          const roomClients = rooms.get(currentRoom)!;
          for (const client of roomClients) {
            if (client !== ws && client.readyState === WebSocket.OPEN) {
              client.send(data.toString());
            }
          }
        }
        
        // Also handle global discovery if needed
        if (message.type === "LOBBY_ANNOUNCE" || message.type === "LOBBY_DISCOVERY_REQ") {
          wss.clients.forEach(client => {
            // Discovery messages go to everyone NOT in the sender's room (or everyone if sender has no room)
            // Actually, sending to everyone except sender is fine for discovery
            if (client !== ws && client.readyState === WebSocket.OPEN) {
              client.send(data.toString());
            }
          });
        }
      } catch (err) {
        console.error("Error processing message:", err);
      }
    });

    ws.on("close", () => {
      console.log(`Connection closed from ${ip}`);
      if (currentRoom) {
        rooms.get(currentRoom)?.delete(ws);
        if (rooms.get(currentRoom)?.size === 0) {
          rooms.delete(currentRoom);
        }
      }
    });
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
