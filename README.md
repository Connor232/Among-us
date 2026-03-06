# Among Us 3D - The Skeld

A 3D recreation of the Skeld map from Among Us, built with React Three Fiber and Express.

## Deployment to Render

This project is pre-configured for [Render](https://render.com).

### Steps:

1.  **Push to GitHub:** Download this project and push it to a new GitHub repository.
2.  **Create a Blueprint:** On Render, click **New +** > **Blueprint**.
3.  **Connect Repository:** Select your GitHub repository. Render will automatically detect the `render.yaml` file.
4.  **Confirm:** Review the settings and click **Apply**.

### Manual Configuration (if not using Blueprint):

If you prefer to create a **Web Service** manually:
*   **Runtime:** `Node`
*   **Build Command:** `npm install && npm run build`
*   **Start Command:** `npm run start`
*   **Environment Variables:**
    *   `NODE_ENV`: `production`

### Troubleshooting:

*   **Vite Errors:** If you see errors about `vite` not being found in production, ensure `NODE_ENV` is set to `production`. The server is designed to only load Vite in development.
*   **Port:** Render sets the `PORT` environment variable automatically. The app is configured to listen on whatever port Render provides.
*   **WebSockets:** Render supports WebSockets by default on all web services.
