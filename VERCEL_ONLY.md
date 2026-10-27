# Vercel-only deployment
The dashboard runs its own thermal simulation in each browser tab. No Express,
Socket.IO, Render, or VITE_SERVER_URL is required for this build.
The forecast is the same trained neural network as the server: its weights (server/models/thermal-guard-model.json)
are bundled into the page and run in plain JavaScript in the browser. If the weights ever fail to load, the app
switches to clearly labelled trend estimates ("not AI").
State resets on page refresh; different visitors have independent simulations.

On Vercel import only the `client` directory as a Vite project, or set
Root Directory to `client`. Install Command: `npm install` (npm workspaces
must resolve the root shared directory); if Vercel cannot access ../shared,
deploy from repository root with Build Command `npm run build` and
Output Directory `client/dist`. Framework Preset: Vite.
Remove any old VITE_SERVER_URL environment variable and redeploy.
Local full-stack server remains available via npm run dev, but frontend now
uses browser simulation in both development and production.
