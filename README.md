# Among Us 3D - Back4App Edition

This project is ready to be deployed to **Back4App Containers** via GitHub!

## How to deploy to Back4App

1. **Push to GitHub**: Create a new repository on GitHub and push all these files to it.
2. **Connect to Back4App**: Go to [Back4App Containers](https://www.back4app.com/containers), click "Create New App," and select "GitHub."
3. **Select Repo**: Choose your game's repository.
4. **Configure**:
   - **App Name**: Choose a name for your game.
   - **Environment Variables**: None required!
   - **Port**: 3000 (Back4App will automatically detect this from the Dockerfile).
5. **Deploy**: Back4App will automatically build the `Dockerfile` and start the deployment.

## How to run locally

- **Port**: The app runs on port 3000 by default (or whatever port Replit assigns via `process.env.PORT`).
- **Environment**: It uses `tsx` to run the TypeScript server directly in development mode.

## Features

- **3D Graphics**: Powered by React Three Fiber and Three.js.
- **Multiplayer**: Real-time WebSocket communication for room-based play.
- **Vite**: Fast development and optimized builds.
