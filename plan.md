# Algae Carbon Intelligence & Verification Platform (AlgaX)
##### HackOut'26 · Problem Statement 15 · Updated Master Implementation Blueprint (V2)

---

### 1. Executive Summary
We are building **AlgaX** — a carbon intelligence and verification platform for algae-based carbon sequestration operations. It is **not** a sensor dashboard. It is a system that turns raw pond telemetry into a defensible, uncertainty-labeled, cryptographically auditable chain of evidence: 
`sensor readings → biomass/growth estimate → gross carbon fixation → full LCA operational net sequestration → anomaly detection with mechanistic root-cause explanation → cryptographic hash-chained verification report`.

The single biggest risk in this domain is **scientific overclaiming** — presenting a simulated number as a certified carbon credit or ignoring the operational energy footprint required to cultivate and harvest algae. Our core differentiation is to build a system that is **honest by construction**, where:
1. Every data point carries a provenance tag (`measured` / `simulated` / `estimated` / `modeled` / `verified`) and a composite confidence score.
2. Every carbon figure distinguishes between **Gross Carbon Fixed**, **End-Use Retained Carbon**, **Operational Footprint (Scope 1/2 Emissions)**, and **Net Carbon Removed**.
3. Every generated report carries a **SHA-256 Cryptographic Hash Chain** linking sensor raw data, model parameters, and output payloads into a tamper-evident audit artifact.
4. Third-party auditors (`Verifier` role) have an interactive workflow to review evidence, run hash integrity verification, and formally stamp or flag reports.

---

### 2. Problem Understanding & Verification Gaps
Algae farms sequester carbon by growing biomass through photosynthesis, but four critical gaps undermine industry credibility today:
1. **Gross Uptake vs. Physiological Variation:** Biomass growth and elemental carbon content are not static. Nutrient stress alters cell composition, requiring dynamic kinetics rather than flat constants.
2. **Durable Removal vs. Operational Emissions (LCA Boundary):** Harvesting and mixing require electricity and fertilizers. If Scope 1/2 operational emissions exceed gross uptake, the net carbon balance is negative.
3. **Data Integrity & Auditability:** Standard database logs can be manipulated prior to audits. Verifiers need cryptographically verifiable proof that raw readings were not altered post-hoc.
4. **Causal Transparency:** Black-box AI flags anomalies without explaining biological limitations, making third-party verification impossible without site visits.

AlgaX addresses all four gaps with a transparent, scientific, and auditable software architecture.

---

### 3. Target Users & Interactive Roles

| User Role | Primary Need | Platform Capability & Workflow |
| :--- | :--- | :--- |
| **Algae Farm Operator** *(Primary)* | Daily operational visibility + defensible report generation | Live pond telemetry, Monod limitation diagnostics, lab dry-weight calibration, harvest/energy logging, report execution. |
| **Carbon Auditor / Verifier** *(Secondary)* | Independent auditability without site visits | Read-only evidence inspection, SHA-256 hash verification route, interactive **Audit Action Modal** (`Approve` / `Flag` / `Reject` + Notes). |
| **Researcher** | Scientific analysis of growth kinetics | Exportable time-series with limitation-factor breakdowns and provenance tags. |
| **Investor** | Confidence in farm performance and carbon claims | Read-only executive dashboard showing net carbon removal waterfall and report history. |

---

### 4. Product Definition & Key Differentiators

**What it is:** A pond-level operations and carbon-accounting platform that ingests environmental sensor data (simulated in hackathon, real-IoT ready), runs transparent Monod-Droop mechanistic kinetics, factors in Scope 1/2 operational emissions, flags and explains anomalies mechanistically, and produces a tamper-evident **Verification-Ready Report** complete with SHA-256 hash digests and an interactive verifier workflow.

**Core Differentiators:**
1. **4-Tier Carbon Removal Waterfall:** Explicitly accounts for `Gross CO₂ Fixed` $\rightarrow$ `End-Use Retained` $\rightarrow$ `Operational Footprint Deducted` $\rightarrow$ `Net Carbon Removed`.
2. **Dynamic Carbon Fraction ($C_{\text{frac}}$):** Adjusts elemental carbon fraction based on nitrogen stress ($f(N)$) rather than assuming a fixed 50% constant.
3. **Diurnal Physics with Dark Respiration:** Models nighttime O₂ consumption and paddlewheel re-aeration to prevent false-positive nighttime culture crash alerts.
4. **Lab Sample OD Recalibration:** Allows operators to log offline dry-weight lab samples ($g/L$) to recalibrate optical density ($k_{\text{OD}}$) sensors against biofouling and non-algal turbidity drift.
5. **SHA-256 Cryptographic Hash Chaining:** Hashes sensor time-series, model params, and outputs into a tamper-evident digest on every report.
6. **Mechanistic Anomaly Attribution:** Root cause is derived directly from drops in biological limitation terms ($f(I), f(T), f(pH), f(N)$), ensuring 100% explainability.

---

### 5. Domain & Scientific Foundations

#### 5.1 Multiplicative Limitation Growth Model
Microalgae specific growth rate ($\mu$, $\text{day}^{-1}$) is governed by a Monod-Droop kinetics engine:
$$\mu = \mu_{\max} \cdot f(I) \cdot f(T) \cdot f(\text{pH}) \cdot f(N)$$

Where:
* $f(I) = \frac{I}{I + K_I}$ (Light saturation curve)
* $f(T) = \exp\left(-\left(\frac{T - T_{\text{opt}}}{\sigma_T}\right)^2\right)$ (Skewed Gaussian temperature optimum)
* $f(\text{pH}) = \exp\left(-\left(\frac{\text{pH} - \text{pH}_{\text{opt}}}{\sigma_{\text{pH}}}\right)^2\right)$ (Enzymatic pH optimum)
* $f(N) = \frac{N}{N + K_N}$ (Monod nitrogen saturation)

Biomass update equation:
$$\frac{dB}{dt} = (\mu - m) \cdot B - h(t)$$
where $m$ is natural mortality and $h(t)$ is harvest removal rate.

#### 5.2 Dynamic Carbon Content Kinetics
Algal elemental carbon content varies with nutrient status. Under nitrogen limitation ($f(N) < 0.3$), microalgae accumulate lipids and carbohydrates, shifting carbon fraction upward:
$$C_{\text{frac}} = C_{\text{base}} + \Delta C \cdot (1 - f(N))$$
*Default values: $C_{\text{base}} = 0.48$, $\Delta C = 0.08$ (yielding $C_{\text{frac}} \in [0.48, 0.56]$).*

#### 5.3 Diurnal Sensor Physics (Dissolved Oxygen & pH)
Dissolved Oxygen ($\text{DO}$) accounts for photosynthetic production, dark respiration, and mechanical re-aeration:
$$\frac{d\text{DO}}{dt} = P_{\text{photo}}(\mu, B) - R_{\text{resp}}(T, B) + k_a \cdot (\text{DO}_{\text{sat}}(T, S) - \text{DO})$$
* $P_{\text{photo}} = Y_{\text{O2/B}} \cdot \mu \cdot B$ (Daylight O₂ evolution)
* $R_{\text{resp}} = R_0 \cdot \theta^{(T-20)} \cdot B$ (Nighttime & baseline respiration)
* $k_a$: Paddlewheel re-aeration coefficient ($\text{hr}^{-1}$)
* $\text{DO}_{\text{sat}}$: Temperature/salinity saturation limit.

This physics formulation prevents false culture crash alerts during nocturnal O₂ drawdown.

#### 5.4 Optical Density Drift & Offline Lab Calibration
Optical Density ($\text{OD}_{680/720}$) drifts over time due to biofouling and organic debris. Biomass estimation uses a calibrated scalar:
$$B_{\text{estimated}} = k_{\text{OD}} \cdot (\text{OD}_{\text{raw}} - \text{OD}_{\text{baseline}})$$
When an operator logs an offline dry-weight lab sample ($B_{\text{lab}}$, $g/L$), the system updates:
$$k_{\text{OD\_new}} = \frac{B_{\text{lab}}}{\text{OD}_{\text{raw}} - \text{OD}_{\text{baseline}}}$$
 logging a `LabSample` calibration record in the evidence chain.

#### 5.5 Full LCA Carbon Accounting Equations
$$\text{Gross CO}_2 \text{ Fixed (kg)} = \Delta B_{\text{dry, kg}} \cdot C_{\text{frac}} \cdot \left(\frac{44}{12}\right)$$

$$\text{Retained CO}_2 \text{ (kg)} = \text{Gross CO}_2 \text{ Fixed} \cdot \text{Factor}_{\text{EndUse}}$$

$$\text{Operational Deductions (kg CO}_2\text{e)} = E_{\text{kWh}} \cdot \text{EF}_{\text{grid}} + M_{\text{fert, kg}} \cdot \text{EF}_{\text{fert}}$$

$$\text{Net Carbon Removed (kg CO}_2\text{e)} = \text{Retained CO}_2 - \text{Operational Deductions}$$

##### Permanence Horizon Categorization (ISO 14064-2 / Puro.earth Aligned):
* **100+ Year Permanent Sink:** Geologic/anoxic deep injection, biochar incorporation ($\text{Factor} = 0.95$, Horizon: `Permanent`).
* **10–50 Year Durable Product:** Bioplastics, construction composite materials ($\text{Factor} = 0.60$, Horizon: `Durable`).
* **<1 Year Temporary Flux:** Biofuels, animal feed, nutraceuticals ($\text{Factor} = 0.00$, Horizon: `Short-Lived`).

---

### 6. System & Data Architecture

#### 6.1 High-Level Flow
```
[ Sensor Simulator Engine ] ──(5-min telemetry)──► [ FastAPI Ingestion API ]
         │                                                      │
 (Night Respiration &                                           ▼
  Paddlewheel Physics)                                [ PostgreSQL / Timescale ]
                                                                │
                                                                ▼
                                                    [ Monod Growth Engine ]
                                                                │
                                             ┌──────────────────┴──────────────────┐
                                             ▼                                     ▼
                                   [ Anomaly Engine ]                    [ Carbon LCA Engine ]
                                (Limitation Drop Root Cause)            (4-Tier Net Calculation)
                                             │                                     │
                                             └──────────────────┬──────────────────┘
                                                                ▼
                                                  [ Report Generator & Hashing ]
                                                   (SHA-256 Digest Chain)
                                                                │
                                                      ┌─────────┴─────────┐
                                                      ▼                   ▼
                                              [ Operator Portal ]   [ Verifier Portal ]
                                              (Live Telemetry)     (Audit Action Modal)
```

#### 6.2 Data Model Entities
* **`Farm`**: `id`, `name`, `location`, `created_at`.
* **`Pond`**: `id`, `farm_id`, `name`, `volume_liters`, `species`, `status`.
* **`Sensor`**: `id`, `pond_id`, `type` (`temp`, `pH`, `DO`, `turbidity`, `PAR`, `salinity`), `unit`, `is_simulated`.
* **`SensorReading`**: `id`, `sensor_id`, `timestamp`, `value`, `quality_flag`.
* **`LabSample`**: `id`, `pond_id`, `timestamp`, `dry_weight_g_per_l`, `recalibrated_k_od`.
* **`BiomassEstimate`**: `id`, `pond_id`, `timestamp`, `biomass_g_per_l`, `method`, `confidence_score`.
* **`CarbonEstimate`**: `id`, `pond_id`, `period_start`, `period_end`, `gross_co2_kg`, `retained_co2_kg`, `operational_emissions_kg`, `net_carbon_removed_kg`, `realized_c_fraction`, `end_use`, `permanence_horizon_label`, `confidence_score`.
* **`Anomaly`**: `id`, `pond_id`, `detected_at`, `type`, `severity`, `limiting_factor`, `explanation`, `status`.
* **`VerificationReport`**: `id`, `farm_id`, `pond_id`, `period`, `generated_at`, `json_payload`, `sha256_hash`, `prev_report_hash`, `verification_status` (`Pending` / `Verified` / `Flagged` / `Rejected`), `verifier_notes`, `verified_at`.

---

### 7. Cryptographic Tamper-Resistance & Verifier Workflow

#### 7.1 Cryptographic Hash Chain Engine
To guarantee auditability, when a `VerificationReport` is generated:
1. The backend orders all underlying `SensorReading` records and `ModelRun` payloads in the period.
2. It compiles a canonical JSON byte string of input telemetry, laboratory calibration records, operational kWh logs, and model output values.
3. It computes a SHA-256 digest:
   $$\text{Current Hash} = \text{SHA256}(\text{Prev Report Hash} \,||\, \text{Canonical Data JSON})$$
4. The digest is permanently stored in `VerificationReport.sha256_hash` and rendered on the generated PDF report with a QR verification code.

#### 7.2 Verifier Interactive Workflow
1. Verifier logs into the dedicated **Verifier Portal**.
2. Selects a period report; the UI hits `GET /api/reports/{id}/verify`, re-computing the SHA-256 hash across stored database rows and verifying it against `sha256_hash`.
3. Displays a **"SHA-256 Digest Verified"** badge.
4. Verifier clicks **"Audit Action"** modal, selecting status (`Verified` / `Flagged for Review` / `Rejected`) and submitting signed audit notes via `POST /api/reports/{id}/audit-action`.

---

### 8. Anomaly Detection & Root-Cause Diagnostics

* **Sensor-Level Anomalies:** Single-sensor outliers or dropouts detected via rolling 3-sigma z-scores. Readings flagged as `outlier` and excluded from model runs.
* **Biological / Environmental Anomalies:** Detected when actual growth rate deviates from maximum capacity. Root-cause explanation is computed deterministically by identifying the minimum limitation term:
  $$\text{Limiting Factor} = \arg\min_{x \in \{I, T, \text{pH}, N\}} f(x)$$
* **UI Output:** Displays actionable diagnostics: e.g., *"Nitrogen limitation dropped to 0.18 → Growth rate degraded by 64% → Dynamic C-fraction shifted to 54.2%."*

---

### 9. API Specifications

* `POST /api/ingest/reading` — Ingest sensor telemetry stream.
* `POST /api/ponds/{id}/lab-samples` — Submit offline dry-weight sample ($g/L$) for OD recalibration.
* `POST /api/ponds/{id}/harvest` — Record harvest event with declared end-use & operational energy inputs ($kWh$, fertilizer $kg$).
* `GET /api/ponds/{id}/timeseries` — Fetch historical telemetry with quality flags.
* `GET /api/ponds/{id}/carbon-lca` — Fetch 4-tier carbon waterfall metrics.
* `POST /api/reports/generate` — Assemble evidence bundle & compile SHA-256 hash-chained report.
* `GET /api/reports/{id}/verify` — Re-compute and validate cryptographic SHA-256 hash chain integrity.
* `POST /api/reports/{id}/audit-action` — Submit verifier approval/flag status and audit commentary.
* `WS /ws/ponds/{id}` — Live telemetry and anomaly WebSocket stream.

---

### 10. Judge-Proof 5-Minute Demo Script

1. **Farm Overview & Live Telemetry (0:00 - 1:00)**
   * Display 3 active raceway ponds with live-updating DO, pH, Temp, and Turbidity over WebSocket.
   * Highlight the **4-Tier Carbon Waterfall** widget showing live Gross Fixed vs Net Removed CO₂e.
2. **Pond Detail & Monod Kinetic Diagnostics (1:00 - 2:00)**
   * Drill into Pond B. Show limitation factor breakdowns ($f(I), f(T), f(pH), f(N)$).
   * Demonstrate nighttime DO dark respiration decay operating smoothly without false alarms.
3. **Injected Anomaly & Mechanistic Explanation (2:00 - 3:00)**
   * Trigger simulated nitrogen depletion scenario.
   * System flags an anomaly, pin-pointing root cause: *"Nitrogen limitation dropped to 0.18 → Growth slowed → Carbon fraction dynamically shifted to 54.2%."*
4. **Lab Sample Calibration & Harvest LCA Entry (3:00 - 3:45)**
   * Log an offline lab dry-weight sample ($0.85\text{ g/L}$) to recalibrate OD drift.
   * Input harvest event: declared end-use (*Bioplastics*) + Scope 1/2 energy input ($120\text{ kWh}$).
5. **Report Generation & Cryptographic SHA-256 Hashing (3:45 - 4:30)**
   * Generate **Verification-Ready Report**.
   * Show 4-tier carbon waterfall PDF layout, evidence log, and **Tamper-Evident SHA-256 Hash Digest**.
6. **Verifier Portal & Interactive Stamp (4:30 - 5:00)**
   * Switch to `Verifier` role view. Run cryptographic hash verification route (`GET /api/reports/{id}/verify`).
   * Open Audit Action modal; select **"Approved & Verified"**, attach audit note, and apply verification stamp.

---

### 11. Development Roadmap & Priorities

* **Phase 0 — Foundations (Hours 0–4):** Schema setup in PostgreSQL with `LabSample`, `VerificationReport` hash fields, and FastAPI/Next.js skeletons.
* **Phase 1 — Physics Simulator (Hours 4–8):** Diurnal light/temp cycles, dark respiration, paddlewheel aeration, and dynamic $C_{\text{frac}}$ kinetics.
* **Phase 2 — Science Engine & Net LCA (Hours 8–14):** Monod growth kinetics, Scope 1/2 energy subtraction, and Lab Sample OD recalibration.
* **Phase 3 — Anomaly Engine & SHA-256 Hashing (Hours 14–18):** Mechanistic limitation root-cause diagnostics and cryptographic hash digest generator.
* **Phase 4 — Frontend & Verifier Workflow (Hours 18–22):** Operator dashboard, 4-tier waterfall charts, PDF report engine, and Verifier Audit portal.
* **Phase 5 — Demo Rehearsal & Polish (Hours 22–24):** End-to-end rehearsal of the 5-minute scripted scenario.

---
Target Status: Master Plan Updated (V2). Ready for Implementation.
