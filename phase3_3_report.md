# Phase 3.3 Implementation Report: Biological Anomaly Detection

## 1. Implementation Summary
Phase 3.3 was successfully implemented with strict adherence to architectural bounds. The core design principle ensures that the Phase 3.3 engine does **not** duplicate the Phase 2 Growth Model. Instead, it queries the backend's persistent `BiomassEstimate` history to extract the model's `Expected Biomass` and `Expected Growth Rate` over a rolling observation window. It then cross-references this against the real `Observed Biomass` emitted by Phase 1 telemetry. 

The resulting detection logic scientifically validates whether the algae is behaving according to expectations given the current environmental constraints. The Phase 3.3 logic operates on a background loop within the Uvicorn worker and produces fully traceable `Anomaly` records with `biological_engine` provenance.

## 2. Files Changed
* `backend/alembic/versions/44badfc31cb2_add_biological_anomaly_types.py`: Executed raw PostgreSQL `ALTER TYPE anomalytype ADD VALUE` statements to dynamically mutate the live `ENUM` type without corrupting historical Phase 3.1 or Phase 3.2 records.
* `backend/app/models.py` & `schemas.py`: Appended biological categories to Python domain Enum representations.
* `backend/app/anomaly/bio_detectors/config.py`: Exposes a tunable `BioDetectionConfig` controlling deviation thresholds and observation windows.
* `backend/app/anomaly/bio_detectors/engine.py`: Contains the pure scientific comparator separating database interaction from statistical evaluation.
* `backend/app/anomaly/service.py`: Updated lifecycle resolvers for biological persistence logic.
* `backend/tests/test_bio_anomaly.py`: High-density test suite covering positive anomaly checks, relative variance triggers, and lifecycle preservation.
* `backend/tests/test_bio_anomaly_dropout.py`: Crucial test ensuring Phase 3.1 Hardware Dropouts correctly suppress biological evaluation (preventing false biological alarms on broken sensors).

## 3. Biological Detection Architecture
The architecture is structured identically to the requirements:

```text
Phase 2 Model Estimates (BiomassEstimate)
      ↓
Expected Biology
      +
Phase 1 Telemetry (SensorReading)
      ↓
Observed/Estimated Biology
      ↓
Residual / Relative Deviation Calculation
      ↓
Threshold Context + Phase 3.1 Sensor Health Verification
      ↓
Biological Anomaly
      ↓
Severity + Confidence
      ↓
Persistence (Anomaly with biological_engine provenance)
      ↓
API GET /api/anomalies (dynamically filtered)
      ↓
Frontend Dashboard
```

## 4. Detection Types
The biological engine actively registers and cycles the following mathematically sound types:
* **GROWTH_SUPPRESSION:** Evaluates if relative deviation crashes below `-40%` coupled with absolute `g/L` thresholds.
* **GROWTH_ACCELERATION:** Flags unexpected rapid blooming above `+50%` variance.
* **BIOMASS_DECLINE:** Flags strict biological shrinking not attributable to natural slow down (evaluates negative `observed` vs positive/flat `expected`).
* **BIOMASS_PLATEAU:** Mathematically distinguishes natural expected flatlining against suppressed physiological stalling.

## 5. Scientific Method
The evaluator establishes an `observation_window` (default 2 hours). It isolates the median limits at the start and end of this block for both the *Expected* model curve and the *Observed* telemetry.
```python
relative_deviation = (observed_end - expected_end) / expected_end
```
By utilizing **relative residual** percentage, the detector scales naturally with biomass concentration; it prevents extreme absolute sensitivity on massive ponds while catching critical percentage deviations early on smaller crops. If `biomass` sensors are flagged with `OPEN` Phase 3.1 hardware failures, the biological engine intercepts the error and returns cleanly to preserve certainty.

## 6. Configuration
The logic relies on `BioDetectionConfig`:
* `observation_window_hours`: `2.0`
* `suppression_threshold`: `-0.4`
* `acceleration_threshold`: `0.5`
* `absolute_deviation_threshold`: `0.1 g/L`
* `growth_rate_mismatch_threshold`: `0.05`

## 7. Provenance
Anomalies inherit `source_provenance = "biological_engine"`. Expected and Observed values are stored firmly into columns `expected_value` and `observed_value`. Mathematical residuals and Phase 2 model-versioning factors are saved into the `explanation` JSON fallback fields ensuring historical model drift does not destroy Phase 3.3 auditability.

## 8. Tests Added
* `test_bio_anomaly_growth_suppression`: Proves `-50%` deviation correctly creates `GROWTH_SUPPRESSION` anomalies.
* `test_bio_anomaly_growth_acceleration`: Proves rapid non-modeled telemetry expansion creates `GROWTH_ACCELERATION`.
* `test_bio_anomaly_biomass_decline`: Captures mathematically impossible shrinkage.
* `test_bio_anomaly_sensor_dropout`: Verifies strict isolation logic where a broken hardware probe stops Phase 3.3 from throwing biological warnings.

## 9. Commands Executed
* `alembic upgrade head`: Successfully applied DB schema expansion for biological anomalies.
* `pytest tests/`: Ran a combined 26 tests spanning Phase 1, Phase 2, Phase 3.1, Phase 3.2, and Phase 3.3. **All 26 passed.**
* `curl "http://localhost:8000/api/anomalies"`: Validated anomaly filtering successfully isolated models via REST.

## 10. Remaining Limitations
* Currently, biological evaluation inherently trusts the Phase 2 Growth Model as the ground truth. If the Phase 2 model calibration (`DEFAULT_PARAMS`) shifts out of sync with real-world algae characteristics, it will trigger constant `GROWTH_SUPPRESSION` or `GROWTH_ACCELERATION`.
* The frontend fully supports the anomaly payload out of the box because it loops over standard JSON structures; however, it lacks Phase 3.3 bespoke charts overlaying *Expected* vs *Observed* lines (reserved for future visual polish).
* The Next.js 15 Turbopack Tailwind build limit is still untouched, but `npm run dev -- --webpack` continues running beautifully.
