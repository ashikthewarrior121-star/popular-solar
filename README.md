# PDF Letterhead Studio — Render + Netlify connection (v9)

This version connects the React frontend to a separately deployed Express backend using `VITE_API_BASE_URL`.

## Render backend settings
The `package.json` is in the project root, not inside `server/`. In Render, set **Root Directory** to blank (or `.`), not `server/`.

- Build Command: `npm install`
- Start Command: `npm start`

Add Render environment variable:
- `FRONTEND_URL` = your actual Netlify site URL, e.g. `https://your-site-name.netlify.app`

The backend listens on `process.env.PORT` and exposes `/api/health` and `/api/replace`.

## Netlify frontend settings
In Netlify → Site configuration → Environment variables, add:
- Key: `VITE_API_BASE_URL`
- Value: your actual Render service URL, e.g. `https://your-service-name.onrender.com`

Do not include `/api` at the end. Example format only; replace it with the real Render URL. Then trigger a new deploy so Vite embeds the variable.

## Local development
Keep `VITE_API_BASE_URL` empty in `.env` (or omit it) and run `npm.cmd install`, then `npm.cmd run dev`. Vite proxies `/api` to `http://localhost:4000`.

## Letterhead images
Replace `public/header.png` and `public/footer.png` with your actual cropped images. Do not upload empty placeholder files.
