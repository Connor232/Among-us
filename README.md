---
title: Among Us 3D
emoji: 🚀
colorFrom: red
colorTo: black
sdk: docker
pinned: false
---

# Among Us 3D - Online Multiplayer

A 3D recreation of Among Us with real-time online multiplayer, AI bots, and multiple maps.

## Features
- **Online Multiplayer**: Play with friends across different networks.
- **AI Bots**: Add bots to fill up your lobby.
- **Multiple Maps**: Choose between The Skeld, Mira HQ, and Polus.
- **Full Game Mechanics**: Tasks, Sabotages, Vents, Meetings, and Ejections.

## Deployment to Hugging Face Spaces
1. Create a new Space on [Hugging Face](https://huggingface.co/new-space).
2. Select **Docker** as the SDK.
3. **IMPORTANT**: Do NOT upload the `node_modules` folder. The `Dockerfile` will install dependencies automatically.
4. Upload all other files and folders (including `Dockerfile`, `package.json`, `server.ts`, `src`, `public`, etc.).
5. If you use the Hugging Face web interface, you can drag and drop files. For a more reliable experience, use **Git**:
   ```bash
   git clone https://huggingface.co/spaces/YOUR_USERNAME/YOUR_SPACE_NAME
   cp -r /path/to/your/project/* YOUR_SPACE_NAME/
   cd YOUR_SPACE_NAME
   git add .
   git commit -m "Initial commit"
   git push
   ```
6. The Space will automatically build and deploy the application.
