# AlgaX

## 1. Project Overview
AlgaX is a comprehensive carbon intelligence and verification platform tailored for algae-based carbon sequestration operations. It provides a transparent, scientifically sound, and auditable architecture to transform raw pond telemetry into a verifiable chain of evidence, ensuring that carbon removal claims are backed by immutable data.

## 2. Problem Statement
The HackOut'26 algae-based carbon sequestration monitoring problem highlighted the lack of reliable, scalable, and verifiable MRV (Measurement, Reporting, and Verification) systems in the carbon capture space. Without a system to track biological growth, environmental stressors, and anomalies in real-time with cryptographic certainty, carbon markets struggle to trust sequestration claims. AlgaX bridges this gap.

## 3. Product Vision
AlgaX connects operations end-to-end to generate verification-ready reporting:
Virtual/Real Farm → Environment → Biology → Sensors → Telemetry → Growth Model → Carbon Accounting → Anomaly Intelligence → Imagery Intelligence → Cross-Validation → Evidence → Review → Verification-Ready Reporting

## 4. Key Principles
- **Scientific Integrity:** Models are grounded in biological first principles (Monod-Droop growth models).
- **Traceability & Provenance:** Every metric can be traced back to its raw telemetry and source algorithm.
- **Deterministic Simulation:** Reproducible and predictable environments for scenario testing.
- **Reproducibility:** Versioned models ensure calculations can be audited.
- **Evidence-Based Reporting:** Carbon claims are backed by sensor data and imagery analysis.
- **Simulation Disclosure:** Simulated data is strictly labeled and isolated from real observations.
- **Security:** Immutable storage of raw data and processed artifacts.
- **Separation of Evidence:** Clear boundaries between observed, modelled, and derived evidence.

## 5. Architecture
The system is a modular monolith backed by a centralized PostgreSQL database. It features:
- **Simulator Node:** Injects deterministic biological and environmental data.
- **Backend API:** A FastAPI service handling data ingestion, modeling, anomaly detection, imagery processing, and evidence packaging.
- **Frontend Dashboard:** A Next.js interface for real-time monitoring, review workflows, and reporting.

## 6. Technology Stack
- **Backend:** Python 3.12, FastAPI, SQLAlchemy, Alembic
- **Frontend:** React, Next.js, Tailwind CSS, Lucide React
- **Database:** PostgreSQL
- **Imagery Processing:** Pillow (PIL)
- **Testing:** Pytest, HTTPX

## 7. Repository Structure
- `backend/`: Core FastAPI application, database schemas, processing engines, and API routes.
- `frontend/`: Next.js web application encompassing dashboards, review workspaces, and reporting.
- `simulator/`: Standalone deterministic engine for generating virtual farm telemetry.
- `storage/`: Directory for securely preserving ingested imagery and processed artifacts.

## 8. Scientific Model
- **Environmental Model:** Aggregates time-windowed raw sensor data taking medians/averages.
- **Monod-Droop Growth Model:** Determines biomass growth rates governed by limiting resources (nitrogen, temperature, light).
- **Limitation Factors:** Computes dynamic growth constraints based on current environmental snapshots.
- **Biomass Calculation:** Integrates growth rates over time intervals to estimate dry algae mass.
- **Dynamic Carbon Fraction:** Adjusts the carbon ratio within biomass based on nutrient stress.
- **Carbon Waterfall:** Tracks gross CO2 capture minus operational emissions to yield net carbon removal.
- **Operational Emissions:** Accounts for energy usage required for pond circulation and harvesting.

## 9. Simulation Engine
The simulator acts as a digital twin for algae farms:
- **Environment & Biology:** Injects dynamic environmental conditions and diurnal biological cycles.
- **Virtual Sensors:** Simulates pH, temperature, dissolved oxygen, and nutrient sensors.
- **Measurement Noise & Failures:** Introduces Gaussian noise, sudden dropouts, spikes, and stale values to stress-test anomaly detection.
- **Scenarios & Seeds:** Employs configurable seeds for reproducibility in scenario testing.
- **Disclosure:** All simulated records are strictly labeled as `SIMULATED` to prevent mixing with real-world MRV data.

## 10. Telemetry Pipeline
The data lifecycle from raw ingestion to carbon estimation:
SensorReading → EnvironmentalSnapshot → ModelRun → BiomassEstimate → CarbonEstimate

## 11. Anomaly Intelligence
The Phase 3 anomaly engine detects and explains deviations:
- **Sensor Anomalies:** Identifies out-of-range, rate-of-change, stale value, and dropout events.
- **Environmental Anomalies:** Differentiates pond stress (e.g., heatwaves, nutrient depletion) from hardware failures by analyzing clean telemetry.
- **Biological Anomalies:** Cross-references observed growth metrics against expected growth rates.
- **Mechanistic Explanations:** Correlates anomalies to provide root-cause insights with severity, confidence, and relationship linking.

## 12. Imagery Intelligence
Phase 4 handles visual evidence:
- **Imagery Ingestion:** Secure endpoints for capturing pond imagery.
- **Provenance & Hashes:** Generates SHA-256 hashes for cryptographic assurance of image integrity.
- **Processing:** Deterministic preprocessing for analysis.
- **Quality Assessment:** Evaluates image fidelity and lighting conditions.
- **Visual Analysis:** Extracts color metrics and density approximations.
- **Temporal Comparison & Cross-Validation:** Compares visual metrics against sensor-derived biomass estimates to flag inconsistencies.

## 13. Evidence + Reporting
Phase 5.1 Evidence Engine:
- **EvidencePackage:** The central authoritative container aggregating scientific outputs over a specified reporting period.
- **Evidence Categories:** Collects models, telemetry, anomalies, and imagery.
- **Completeness & Provenance:** Ensures required data exists before finalizing a package.
- **Hashing:** Generates a cryptographic package hash to seal evidence.
- **Reports & Limitations:** Surfaces deterministic summary reports with limitations disclosed.

## 14. Review Workspace
Phase 5.2 Verification Workflow:
- **Review States:** Tracks package progression (`NOT_STARTED`, `IN_REVIEW`, `READY_FOR_EXTERNAL_REVIEW`, `CLOSED`).
- **Review Actions:** Records discrete workflow steps (e.g., `START_REVIEW`, `FLAG_FOR_ATTENTION`) by authorized actors.
- **Evidence Explorer:** A comprehensive UI for deep-diving into package contents.
- **Notes & Provenance Navigation:** Allows reviewers to annotate and navigate directly to source telemetry.
- **Integrity Display:** Visually confirms hash matches and data integrity.

## 15. API
Key endpoints managed by the FastAPI backend:
- `/api/ingest/reading`: Raw telemetry ingestion.
- `/api/telemetry`: Time-series sensor data retrieval.
- `/api/model/run`: Triggers the deterministic growth model.
- `/api/anomalies`: Anomaly listing and explanations.
- `/api/imagery`: Secure ingestion and processing of visual evidence.
- `/api/evidence-packages`: Generation and retrieval of sealed evidence packages.

## 16. Database
Core entities mapped via SQLAlchemy to PostgreSQL:
- `Farm`, `Pond`, `Sensor` (Topology)
- `SensorReading` (Telemetry)
- `ModelRun`, `BiomassEstimate`, `CarbonEstimate` (Models)
- `Anomaly`, `AnomalyExplanation` (Intelligence)
- `ImageryRecord`, `ImageryProcessingRecord` (Imagery)
- `EvidencePackage`, `ReviewAction` (Reporting)

## 17. Security
- **Farm Isolation:** Backend queries strictly enforce tenant/farm boundaries.
- **File Security:** Handled via deterministic storage paths (Note: Traversal issues identified in audit are being remediated).
- **Immutability:** Evidence packages and imagery hashes act as a tamper-evident seal.
- **Access Controls:** Route-level requirements ensure actions are attributed to distinct actors.

## 18. Running AlgaX Locally
1. Start PostgreSQL (e.g., via Docker):
   `docker-compose up -d`
2. Run database migrations:
   `cd backend && .\venv\Scripts\alembic upgrade head`
3. Start the backend:
   `.\venv\Scripts\uvicorn app.main:app --reload`
4. Start the frontend:
   `cd frontend && npm run dev`
5. Start the simulator:
   `cd backend && .\venv\Scripts\uvicorn simulator.main:app --port 8001`

## 19. Testing
Tests are executed using `pytest`.
Command: `.\venv\Scripts\pytest -v`

**CURRENT TEST STATUS:**
- **Total Tests:** 85
- **Passed:** 85
- **Failed:** 0
(Recent critical defects involving imagery routing, DB leakage, and fresh-database migration have been fixed during the Phase 5 defect-fix cycle.)

## 20. Current Project Status
| Phase | Scope | Status |
|-------|-------|--------|
| Phase 1 | Simulation + Telemetry | COMPLETE |
| Phase 2 | Model + Carbon | COMPLETE |
| Phase 3 | Anomaly Intelligence | COMPLETE |
| Phase 4 | Imagery Intelligence | COMPLETE |
| Phase 5 | Evidence + Review | FIXED - READY FOR RE-AUDIT |

## 21. Known Limitations
- Imagery endpoints are partially mocked and do not perform advanced multi-spectral analysis.
- File path traversal protections were recently fixed; extensive penetration testing is still required.
- The review system lacks full JWT-based authentication in this MVP.

## 22. Scientific Boundaries
AlgaX provides estimates and evidence for biological carbon capture. It does **not** independently certify carbon removal, does **not** issue certified carbon credits, does **not** guarantee sequestration, and does **not** claim regulatory approval. It is built to generate verification-ready evidence for external auditors.

## 23. Roadmap
- **Phase 6:** End-to-end integration with third-party registry APIs.
- **Phase 7:** Advanced AI-driven cross-validation models for multispectral satellite data.
- **Phase 8:** Blockchain-anchored evidence hashing for decentralized trust.
