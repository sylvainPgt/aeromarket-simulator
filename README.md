# AeroMarket Simulator: The GMF Challenge

A serious game. Take control of an airline group, read the market forecast, choose a network strategy,
build a fleet from a portfolio of aircraft, and defend your home market from 2025 to 2075 (10 turns of 5 years).
At the end the game reports a behavioral profile: consistency, risk aversion, crisis composure, alignment with long-term trends.

Play: https://sylvainpgt.github.io/aeromarket-simulator/

## Run locally

```bash
npm install
npm run dev
```

## Deploy

Every push to `main` builds the site and publishes it to the `gh-pages` branch (`.github/workflows/deploy.yml`).
The Vite `base` path is derived from the repository name at build time (`vite.config.js`).

## What is real and what is not

| Element | Source |
| --- | --- |
| Passenger growth by region 2025-2045, fleet in service 2025 and 2045, deliveries 2026-2045 | Airbus Global Market Forecast 2026-2045 public dataset, aggregated into 8 regions (`src/data/gmf.js`) |
| Growth after 2045 | Game extrapolation: growth fades by 20% per five-year period |
| Long-haul growth by region | Unweighted mean of the GMF inter-regional flow CAGRs touching the region (the dataset gives no flow volumes) |
| Aircraft seats, range, fuel burn, prices | Indicative public orders of magnitude, rounded (`src/game/aircraft.js`). "Concept" aircraft are hypothetical |
| Airline groups | Fictional. Three per region; their 2025 fleets add up to the GMF regional fleet |
| Events, yields, costs, financing rules | Game design, calibrated for plausible margins (`src/game/engine.js`, `src/game/events.js`) |
| Map outlines | Natural Earth 1:110m, public domain |

## Model in brief

- **Markets**: per region, short-haul, long thin (point-to-point) and long-haul trunk. Short-haul is contested by the three home groups; long-haul also by foreign carriers.
- **Aircraft**: capability on each market, operating cost and CO2 are derived from seats, range and fuel burn, so aircraft added in the in-game editor are evaluated like catalogue ones.
- **Lead time**: bought aircraft arrive one turn later; leased aircraft fly immediately at a higher cost.
- **Finance**: asset-backed debt up to 70% of fleet and order value, 22% interest per turn, bankruptcy after two turns above the limit.
- **Scenario code**: the same code always gives the same sequence of events, so players can be compared on an identical scenario.
- **Save / load**: a game is saved as a JSON file on the player's computer and can be loaded from the start screen.

## Structure

- `src/AeroMarketSimulator.jsx`: game flow and the four phases of a turn
- `src/screens/`: start screen (region and airline choice) and final behavioral analytics
- `src/components/`: world map, aircraft drawings, portfolio and editor, charts, shared UI
- `src/game/`: engine, aircraft catalogue, airline groups, events, insights and analytics
- `src/data/gmf.js`: generated regional data and map outlines
