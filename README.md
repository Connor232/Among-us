# Among Us 3D - The Skeld

A 3D recreation of the Skeld map from Among Us, built with React Three Fiber and Express.

## Deployment to Render

This project is ready to be deployed to [Render](https://render.com).

### Steps:

1.  **Connect to GitHub:** Push this repository to a new GitHub repository.
2.  **Create a Web Service:** On Render, click **New +** > **Web Service**.
3.  **Connect Repository:** Select your GitHub repository.
4.  **Configuration:**
    *   **Runtime:** `Node`
    *   **Build Command:** `npm install && npm run build`
    *   **Start Command:** `npm run start`
5.  **Environment Variables:**
    *   `NODE_ENV`: `production`
    *   `PORT`: `3000` (or any port, Render will handle it)
    *   `GEMINI_API_KEY`: (If you use any Gemini features, add your API key here)

### Features:

*   3D Map (The Skeld)
*   Real-time Multi-user (WebSockets)
*   Player Movement and Animations
*   Minimap
*   Lobby System
