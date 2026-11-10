# AeroMarket Simulator: The GMF Challenge

A serious game: run a global airline from 2025 to 2075 against three AI rivals.

## Run locally

```bash
npm install
npm run dev
```

## Deploy

Every push to `main` builds the site and publishes it to the `gh-pages` branch
(`.github/workflows/deploy.yml`). One-time setup in the repository:
**Settings → Pages → Source: "Deploy from a branch" → Branch: `gh-pages` / `(root)`**.

The Vite `base` path is derived from the repository name at build time
(`vite.config.js`), so the site works at `https://<user>.github.io/<repo>/`.

## Structure

- `src/AeroMarketSimulator.jsx`: the whole game (single component)
- `src/main.jsx`: mounts the game into `#root`
- `src/index.css`: Tailwind entry point
