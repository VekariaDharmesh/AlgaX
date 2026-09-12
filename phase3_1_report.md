# Phase 3.1: Sensor Anomaly Detection Report

## PHASE 3.1 STATUS
**PASS**

Phase 3.1 Sensor Anomaly Detection is ready for Phase 3.2.

## Executive Summary
Phase 3.1 has been successfully implemented to detect irregular sensor behavior from raw Phase 1 telemetry. The system now strictly separates sensor-level anomalies from environmental/biological abnormalities. Pure detector functions have been implemented to track Out of Range, Sudden Spikes/Drops, Rate of Change, Stale Values, and Sensor Dropouts. The backend architecture successfully captures anomalies with high provenance, ensuring that all detection evidence is version-controlled and verifiable.

## Files changed
* `backend/app/models.py`: Added `Anomaly` SQLAlchemy model.
* `backend/app/schemas.py`: Added Pydantic schema validation for anomalies.
* `backend/app/main.py`: Hooked `run_sensor_anomaly_detection` into `/api/ingest/reading` and `check_for_dropouts` into the background loop. Added `GET /api/anomalies` endpoints.
* `backend/app/anomaly/config.py`: Defined deterministic threshold configurations for all sensors.
* `backend/app/anomaly/detectors/*.py`: Implemented 5 pure Python detection modules.
* `backend/app/anomaly/service.py`: Centralized telemetry history pulling, detector triggering, and database persistence.
* `backend/app/anomaly/resolver.py`: Auto-closes specific sensor anomalies when behavior returns to normal bounds.
* `frontend/src/app/page.tsx`: Replaced hardcoded demo anomaly alerts with live API data mapping.
* `backend/tests/test_anomaly.py` & `backend/tests/test_anomaly_integration.py`: Added unit and E2E coverage.

## Database changes
* Generated and applied Alembic migration `42badfc31cb0_add_anomaly_model.py`.
* Created `anomaly` table containing comprehensive provenance fields (`farm_id`, `pond_id`, `sensor_id`, `anomaly_type`, `severity`, `confidence_score`, `observed_value`, `expected_value`, `deviation`, `source_provenance`, `status`, etc.).

## Detection methods
* **Range Detector (`detect_out_of_range`)**: Flags impossible physical values.
* **Spike Detector (`detect_spike`)**: Uses Median Absolute Deviation (MAD) against a rolling 2-hour window (max 20 readings) to detect robust Z-score deviations (Sudden Spikes / Drops).
* **Rate Detector (`detect_rate_change`)**: Calculates `Δvalue / Δtime` to detect physically impossible volatility.
* **Stale Detector (`detect_stale_value`)**: Flags sensors that fail to fluctuate more than a designated tolerance over a configurable time window (e.g. frozen pH probes).
* **Dropout Detector (`detect_dropout`)**: Identifies disconnected sensors based on timestamps rather than DB row recency.

## API
* `GET /api/anomalies` — List anomalies globally.
* `GET /api/ponds/{pond_id}/anomalies` — List anomalies for a specific pond.
* (Both endpoints support `status` and `limit` query parameters).

## Frontend
* Updated `src/app/page.tsx` DashboardOverview to poll `fetchAnomalies()` concurrently with Carbon/Biomass fetching.
* Mapped active `OPEN` anomalies into the UI, ensuring proper confidence scores, severity badge rendering, and professional technical language are utilized.

## Tests
* Executed `pytest tests/test_anomaly.py` and `pytest tests/test_anomaly_integration.py`.
* Validated edge cases: Negative biomass bounds, heatwaves, 99.0 impossible ranges, and 30-minute sensor dropout simulations.
* Result: **6 Tests Passed (0 errors, 0 failures).**
* Executed `npm run lint`.
* Result: **0 Errors.**

## Known limitations
* **Phase 3.2 (Environmental Anomalies):** The system explicitly avoids classifying "Hot Water" as a sensor failure if it passes the rate-of-change and bounds checking. This distinction is intentionally deferred to Phase 3.2.
* **Phase 3.3/3.4 (Biological/Mechanistic Engine):** Integration with growth rates and Monod-Droop limits is intentionally deferred.
* **Turbopack Build:** `npm run build` currently fails downstream due to an upstream Next.js Turbopack compiler error with Tailwind CSS (as noted in earlier phases). We continue to rely on the functional `npm run dev -- --webpack` workaround.
