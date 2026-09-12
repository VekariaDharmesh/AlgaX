# AlgaX — Phase 1: Foundations + Sensor Simulation Implementation Report

## Phase Status
**Phase 1 COMPLETE**

## Implemented
A deterministic biological simulation pipeline was established, generating sensor telemetry based on true diurnal behavior, feeding through a realistic HTTP ingestion layer into a local PostgreSQL database, and actively visualized by the Next.js frontend in real-time. 

## Backend
- **APIs**:
  - `POST /api/ingest/reading`: Sensor reading ingestion endpoint enforcing schema validation.
  - `GET /api/telemetry`: Time-series extraction API mapped to ponds and sensor types.
  - `GET /api/farms` & `GET /api/ponds`: Configuration/topology fetching.
  - `POST /api/demo/inject-scenario`: Proxy control API to trigger scenarios safely in the simulation loop.
- **Models & Database**:
  - `Farm`, `Pond`, `Sensor`, `SensorReading` models following precise `plan.md`/`architecture.md` definitions.
  - PostgreSQL container configuration + `psycopg2` engine.
- **Migrations**: Initialized Alembic. `alembic upgrade head` ran successfully on initial database seed.

## Simulator
- **Environment Model**: Dynamic Temperature, Light, Dissolved Oxygen, and pH, governed by a 24-hour diurnal sine-wave progression matching typical local time.
- **Biological State**: Simple Monod-Droop approximation where growth rate depends on Light, Temperature, and Nitrogen availability. 
  - **Feedback loop**: Nitrogen is consumed strictly as a function of Biomass growth.
- **Sensor Layer**: Translates biological state → noisy sensor readings via gaussian sampling (`random.gauss(0, val * 0.02)`).
- **Dropout & Scenarios**:
  - `nutrient_depletion`: Accelerates Nitrogen reduction, slowing subsequent growth.
  - `heatwave`: Increments base temperature past optimal bounds, stifling growth.
  - `sensor_dropout`: Halts telemetry emission from a chosen sensor.
- **Simulation Clock**: Advances 5 simulated minutes per tick (running natively at accelerated real-world speed configurable via `SIMULATOR_SPEED`).

## Frontend
- Added `lib/api.ts` React fetcher functions pointing to the live local FastAPI backend.
- Converted `DashboardOverview` (`app/page.tsx`) to stateful live telemetry visualization:
  - Continuously polls `/api/telemetry?sensor_type=temperature`.
  - Added a pulsing "SIMULATED DATA" badge for provenance honesty.
  - Implemented interactive Demo scenario injection buttons inside the dashboard UI.

## Tests
- `pytest tests/`: **PASS** (Tests for environment progression, biology scaling, sensor dropout, and HTTP 404 validation for bad sensors).
- `npm run lint`: **PASS** (Zero TS/ESLint errors remaining).
- `npm run build`: **FAIL** (Next.js 16.3.5 Turbopack panic on Tailwind v4 `globals.css` compilation. The dev server was successfully verified via `next dev --webpack` as a documented workaround in prior phases).
- `alembic upgrade head`: **PASS** (Migration created and successfully applied locally).

## Known Issues
- The Next.js Turbopack compiler panics when processing `@tailwindcss/postcss` injected `globals.css`. This is an upstream toolchain issue and is circumvented via Webpack fallback.
- Currently, only the Temperature telemetry line is rendered on the frontend dashboard to verify end-to-end integration. Biomass, pH, DO, and Nitrogen are successfully ingested and stored but await full charting configurations.
