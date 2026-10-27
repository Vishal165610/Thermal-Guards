# Thermal Guard deployment

1. Push these changes to GitHub.
2. On Render, choose New > Blueprint and select this repository. Render reads render.yaml
   from the repository root. Allow the backend to build and start. The first build
   trains the forecasting model if absent and can take a few minutes.
3. Open https://YOUR-RENDER-SERVICE.onrender.com/api/health and verify JSON with ok: true.
4. In the Vercel frontend project, set VITE_SERVER_URL to the actual Render HTTPS
   service URL (no trailing slash) for Production, then redeploy the frontend.
   Vite embeds VITE_ variables at build time: a redeploy is essential.
5. For the frontend, keep the existing working Vercel build configuration; do not
   deploy the Socket.IO simulation backend as a Vercel Function.
6. Local development remains: npm install && npm run dev (localhost:5173 and :4000).

Note: Render free services can spin down while idle, causing a slow initial connection.
The model file generated during the build is part of that deployment; changes to
runtime filesystem on free hosting should not be treated as persistent storage.
