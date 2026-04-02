
console.log("Server script starting...");
import express from "express";
import { WebSocketServer, WebSocket } from "ws";
import http from "http";
import path from "path";
import { fileURLToPath } from "url";

console.log("Imports successful");

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  console.log("Initializing Express app...");
  const app = express();
  app.set('trust proxy', 1); 
  const server = http.createServer(app);
  const PORT = parseInt(process.env.PORT || "3000"); 

  console.log("Setting up WebSocket server...");
  const wss = new WebSocketServer({ server });

  // Health check routes
  app.get("/health", (req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

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
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { 
        middlewareMode: true,
        hmr: false // Disable HMR as per platform guidelines
      },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, "dist");
    app.use(express.static(distPath));
    app.get("*all", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  server.on('error', (err) => {
    console.error("Server error:", err);
  });

  server.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT} (0.0.0.0)`);
    
    // Self-ping "hack" for Render/Railway free tiers
    const externalUrl = process.env.RENDER_EXTERNAL_URL || process.env.APP_URL;
    if (externalUrl) {
      console.log(`Self-ping initialized for: ${externalUrl}`);
      setInterval(() => {
        http.get(`${externalUrl}/health`, (res) => {
          console.log(`Self-ping status: ${res.statusCode}`);
        }).on('error', (err) => {
          console.error(`Self-ping error: ${err.message}`);
        });
      }, 14 * 60 * 1000); // Ping every 14 minutes
    }
  });
}

startServer().catch(err => {
  console.error("Fatal error during server startup:", err);
  process.exit(1);
});
