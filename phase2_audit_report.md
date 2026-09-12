# Phase 2: Model Engine Audit & Implementation Report

## 1. Overall Status
**PASS**

The Phase 2 Model Engine pipeline is fully functional end-to-end. It consumes raw Phase 1 telemetry, aggregates it into Environmental Snapshots, processes it through a deterministic Monod-Droop growth model, and outputs versioned Biomass and Carbon Estimates with proper provenance tracing.

## 2. What was implemented
* **Environmental Snapshot Layer:** Time-windowed aggregation of raw sensor readings taking medians to build model-ready input.
* **Monod-Droop Mechanistic Model:** Pure Python implementation of algal growth kinetics:
  * Light limitation `f(I)`
  * Temperature limitation `f(T)`
  * pH limitation `f(pH)`
  * Nitrogen limitation `f(N)`
* **Dynamic Carbon Fraction:** Carbon fraction correctly scales between `C_base` (0.48) and `C_base + ΔC` (0.56) based on nitrogen limitation stress.
* **Model Run Architecture:** Database tables for `ModelRun`, `BiomassEstimate`, and `CarbonEstimate` to ensure exact reproducibility and historical versioning.
* **Unspecified End-Use Constraint:** Net carbon sequestration is strictly nullified (`NULL`) if the end-use is unspecified, avoiding fabricated carbon credits.
* **Background Scheduler:** An async model loop triggers execution across all active ponds based on the rolling telemetry window.

## 3. Files Created / Modified
* `backend/app/models.py`: Added `ModelRun`, `EnvironmentalSnapshot`, `BiomassEstimate`, `CarbonEstimate`.
* `backend/app/schemas.py`: Added corresponding Pydantic schemas.
* `backend/app/model_engine.py`: **[NEW]** Created pure scientific model functions.
* `backend/app/services.py`: **[NEW]** Created the model execution service (DB I/O wrapper).
* `backend/tests/test_model.py`: **[NEW]** Added unit tests for model calculations.
* `backend/tests/test_model_integration.py`: **[NEW]** Added end-to-end integration tests.
* `frontend/src/lib/api.ts`: Added frontend fetch hooks.
* `frontend/src/app/page.tsx`: Updated Dashboard to fetch and display modeled Phase 2 outputs rather than hardcoded mock data. Replaced "Verified" with "Modeled".
* `backend/alembic/versions/e486b2244f74_phase_2_models.py`: **[NEW]** Alembic DB migration.

## 4. Model Equations Implemented
```text
μ = μmax × f(I) × f(T) × f(pH) × f(N)
dB/dt = (μ - m)B
C_frac = C_base + ΔC × (1 - f(N))
Gross CO₂ = ΔB_kg × C_frac × (44/12)
```

## 5. Tests Executed
```bash
pytest -s tests/                  PASS
alembic upgrade head              PASS
curl /api/model/carbon            PASS
curl /api/model/biomass           PASS
```

## 6. End-to-end Validation
```text
Simulator (Generates T, pH, N, DO)
↓ HTTP POST
Ingestion API (Saves SensorReading)
↓ APScheduler (asyncio model_loop)
Aggregation (Creates EnvironmentalSnapshot)
↓ Model Engine (run_model_step)
Growth Rate & Carbon Metrics calculated
↓ SQLAlchemy
Database (Saves ModelRun, BiomassEstimate, CarbonEstimate)
↓ HTTP GET
Dashboard UI (Displays Modeled Gross CO₂ & Estimated Biomass)
```

## 7. Scientific Validation
The model correctly demonstrates causal behavior:
- Nutrient Depletion scenario triggers a measurable drop in `f(N)`, which increases the Carbon Fraction (`c_frac`) due to stress, while simultaneously slashing the net `growth_rate`.
- Sensor dropouts are handled gracefully (using conservative defaults or maintaining extreme penalties to prevent unchecked hallucinated growth).
- Unspecified end-use returns explicit `NULL` for retained and net carbon, matching strict MRV rules.

## 8. Remaining Limitations
- **Background Scheduler:** The current `asyncio` sleep loop is sufficient for hackathon/demo purposes but should be upgraded to `APScheduler` or `Celery` in production (Phase 7+).
- **Turbopack:** Next.js Turbopack compiler error remains (Next.js v15 upstream bug). `npm run dev -- --webpack` must be used.

## 9. Recommendation
**READY FOR PHASE 3**
