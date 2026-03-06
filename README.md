# Among Us 3D - Replit Edition

This project is ready to be run on Replit!

## How to run on Replit

1. **Upload files**: Upload all the files from this project to your Replit workspace.
2. **Install dependencies**: Open the Replit Shell and run `npm install`.
3. **Run**: Click the "Run" button at the top.

## How to run on Railway

1. **Push to GitHub**: Create a new repository on GitHub and push all these files to it.
2. **Connect to Railway**: Go to [Railway.app](https://railway.app), click "New Project," and select "Deploy from GitHub repo."
3. **Select Repo**: Choose your game's repository.
4. **Deploy**: Railway will automatically detect the `railway.json` and `package.json` files and start the deployment. It will use the `/api/health` endpoint to verify the app is running.

## Configuration

- **Port**: The app runs on port 3000 by default (or whatever port Replit assigns via `process.env.PORT`).
- **Environment**: It uses `tsx` to run the TypeScript server directly in development mode.

## Features

- **3D Graphics**: Powered by React Three Fiber and Three.js.
- **Multiplayer**: Real-time WebSocket communication for room-based play.
- **Vite**: Fast development and optimized builds.
