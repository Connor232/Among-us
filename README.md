# Among Us 3D - Deployment Edition

This project is ready to be deployed to **Render** or **Back4App** via GitHub!

## How to deploy to Render (Free Tier)

1. **Push to GitHub**: Create a new repository on GitHub and push all these files to it.
2. **Connect to Render**: Go to [Render.com](https://render.com/), click **"New +"** -> **"Web Service"**, and connect your GitHub repo.
3. **Configure**:
   - **Runtime**: `Node`
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm start`
   - **Instance Type**: `Free`
4. **Environment Variables**:
   - Add `NODE_ENV` = `production`
   - Add `RENDER_EXTERNAL_URL` = (Your Render URL, e.g., `https://my-game.onrender.com`)
5. **Deploy**: Render will build the app and start the server.

### The "Uptime Robot Hack" (Keep Awake)
Render's free tier spins down after 15 minutes of inactivity. To keep it awake:
1. Go to [UptimeRobot.com](https://uptimerobot.com/).
2. Create a new **HTTP(s) Monitor**.
3. Set the URL to `https://your-app-name.onrender.com/health`.
4. Set the interval to **5 minutes**.
5. This will ping your app every 5 minutes, preventing it from sleeping!

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
