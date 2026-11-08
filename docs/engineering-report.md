# Reverse engineering and implementation report

Project: IoT Simulation & Analytics Platform / Technical Portfolio V3.1  
Owner: Mohammed Basim Ibrahim  
Reconstruction: November 2026, independently implemented with AI coding assistance  
Repository: https://github.com/Mohammed01Ibrahim/iot-simulation-analytics-platform (private)

## Evidence before implementation

The complete `Ubiquitous Computing Project version03.docx` text and all 12 embedded figures were inspected. SHA-256: `bdab1dcf0dd3cc95c59656172da4012185a86f4d40a32acb3d3b7a5149f5fde4`. The duplicate attachment is byte-identical. Figures 1–6 illustrate literature; 7–8 show configuration/dataset interfaces; 9 contains session API code; 10 shows successive console messages; 11 shows upstream Docker images; 12 is styling code. The original report, existing portfolio, CV, available source archives and verification notes were reviewed. CV and V3 were preserved.

The upstream project is IBA Group's [IoT-data-simulator](https://github.com/IBA-Group-IT/IoT-data-simulator), inspected at tree `c392047d95791979aa6ede4b54dce9fde949ad8d`. Its Apache 2.0 license was checked. The session API code in Figure 9 matches the upstream JavaScript file; Figure 11 names IBA images. Upstream includes Java services, a Node sender and a React interface. Thus the report's claim that Java is the frontend is inconsistent with source evidence.

No original student IoT implementation was recovered from the accessible archives or repositories. The target private repository was empty at the initial check. Other supplied archives contain real estate, prescription and store projects. The new code follows the service roles in the report, with new React/Node modules rather than porting the Java implementation. No IBA code, branding or screenshot is copied into the application. This is not a byte-equivalent recreation and is not presented as functionality proven in the historical submission.

The full [requirements-to-evidence matrix](requirements-evidence.md) distinguishes recovered upstream reference code, report-only features, unconfirmed proposals and new engineering decisions. Unsupported claims about 1,000+ devices, latency, Gaussian batching, Redis and ML/cloud connectors were not carried into achievements.

## Components and provenance

| Component | Status | Evidence / implementation |
|---|---|---|
| Academic study and original report figures | Recovered documentation | Complete DOCX and image extraction |
| Original student's IoT source | Not recovered | Bounded archive/repository/history search |
| IBA session API and deployment structure | Upstream reference inspected | Apache-2.0 source; no source copied |
| React dashboard, field editor, charts and console | Newly implemented | `web/src/` |
| REST/SSE API and device/session validation | Newly implemented | `src/server.js`, `domain.js` |
| Generator and RabbitMQ consumer | Newly implemented | `src/worker.js` |
| MQTT / HTTP delivery and receipt storage | Newly implemented integration | Real broker subscription and HTTP receiver checks |
| MongoDB and MinIO persistence | Newly implemented integration | Real database and S3-compatible object APIs |
| Docker configuration, tests and screenshot capture | Newly implemented | `compose.yaml`, `deploy/`, `tests/`, `scripts/` |
| MinIO loopback discovery | Adapted external dependency for native test host | Pinned upstream source, dated patch and AGPL notice; normal Compose unmodified |

## Implemented behavior

Device CRUD validates identifiers, sensor types, location, 100–60,000 ms intervals and 1–24 unique safe field names. Number fields use random, sine or sequential patterns; text/status fields cycle configured values; timestamps are UTC. Settings persist in MongoDB and are copied into immutable session snapshots. Active session configurations therefore do not change when device settings are edited.

A Mongo-backed lifecycle supports Ready → Running → Paused → Running → Stopped; CSV replay completes after all selected devices emit the finite dataset. Invalid transitions are rejected. A single leased scheduler publishes durable envelopes with stable IDs through a RabbitMQ topic exchange and confirmed publications. A manual-acknowledgment consumer deduplicates Mongo records, delivers selected MQTT QoS 1 and HTTP targets, and retains receipts/attempts. Exhausted retries become visible failures. An already queued message can finish after pause/stop.

CSV uploads are actually stored in MinIO and read by the worker. Exported records are rendered to formula-safe CSV, stored as MinIO objects and streamed through the API. The React UI polls persisted readings, offers interactive SVG charts, shows actual time-window throughput, and expands message envelopes. Health reports MongoDB, RabbitMQ, MinIO, worker and MQTT connectivity.

## Verification and genuine visuals

See [verification.md](verification.md), raw files under `evidence/`, and screenshot provenance in `screenshots/manifest.json`. Recorded checks exercise real service communication. Native runtime verification is distinct from the supplied Docker Compose configuration, whose container startup was not possible on this host. Counters in screenshots are measurements of that small demonstration session, not benchmark results.

Screenshot source is the locally running Express-served React build, with synthetic sensor data. Six captures cover overview, devices, configuration, active session, analytics and monitoring. No mocked responses or image-generated UI were used. Editable architecture/lifecycle SVGs describe actual implementation relationships.

## Portfolio review: Resume Analyzer recovery

The available team repository [ZakiAlkhaf16/ai-resume-analyzer](https://github.com/ZakiAlkhaf16/ai-resume-analyzer) was inspected at `14d8e285335bf984df9269d9508d42297a70a931`. Its README assigns Mohammed Ibrahim the job-matching model, Zaki the parser, Nawaf NLP extraction and Mahdi API/frontend/database. Source inspection found PDF/DOCX/TXT extraction with OCR fallback, basic name/email/phone parsing and parser tests. The matcher, API, database and separate NLP directories contain empty initializers; the frontend is a placeholder.

Six branches and seven accessible commits were inspected. `main` and `feature/parser-tests` point to the parser-era revision; `api-frontend`, `matcher-dev`, `nlp-dev`, `parser-dev` point to initial scaffolding (`cd08f7037fec97e2e05dffc52247235a8ee239c6`). No executable matching/ranking interface was recovered. README framework alternatives are not proof of a deployed framework. The supplied `ai-resume-analyzer-main-20251104T203242Z-1-001.zip` was unavailable and could not be read.

Documentation supports the conceptual weighted matcher: **Score = α × Semantic Similarity + (1 − α) × Skill Score**. Alpha is the semantic weight on [0,1], and 1−alpha the skill weight. A value of 0.8 is illustrated as 80/20, not claimed as a newly verified default. Exact preprocessing, normalizations, model artifacts, thresholds and live ranking behavior cannot be recovered from the parser and role description alone. A new matcher could be authored, but would be a separately specified implementation, not recovered historical evidence. No invented ranking screenshot or unsupported accuracy/AUC is included.

## Portfolio review: Real Estate evaluation

The archived evaluation records remain unchanged. Four fixed candidates were compared by validation MAE. Code uses group-separated train/validation/test partitions, 3-fold training-only cross-validation, then clones/refits the selected Random Forest on train + validation before held-out evaluation. Validation and test therefore evaluate different fitted instances, as explicitly intended by that pipeline.

| Metric | Validation | Held-out test | Observed gap |
|---|---:|---:|---:|
| MAE (USD) | 73,225.85 | 90,684.97 | +23.84% |
| RMSE (USD) | 182,942.79 | 728,516.72 | 3.98× |
| R² | 0.7421 | 0.1423 | −0.5998 |

The saved residual analysis plots actual minus predicted prices and includes exceptionally large positive residuals. This supports large underpredictions as a contributor to the much larger RMSE, which squares errors. It does not isolate distribution shift, overfitting, label errors or a specific subgroup as the cause. No such unverified causal explanation is asserted. Raw CSV and fitted model are absent, so no retraining or performance improvement is claimed. The previous 205 passing tests (5 November 2026) used synthetic fixtures and test engineering behavior, not real-data predictive accuracy.

## Portfolio review: Prescription System and background

Source confirms React → Express → PostgreSQL. `auth.js` hashes passwords with bcrypt (10 rounds), uses parameterized lookups and expiring JWTs. `prescriptions.js` categorizes questionnaire answers with explicit rules, queries doctors by specialization ordered by experience, stores the assignment and supports request/status retrieval and updates. The updated five-step diagram is Registration → Questionnaire → Rule-Based Categorization → Doctor Assignment → Request Tracking. This is team educational work, not established clinical validation; database integration was not rerun.

The final portfolio page emphasizes the documented matching contribution, consistent ML pipeline, verified connected IoT work and practical diagnostics/customer-facing experience. Experience dates are preserved from the supplied CV. Current residence remains Riyadh. No CV edit or V3 overwrite was made.

## Remaining limits and next reproducible steps

- Full Resume Analyzer source is still needed for actual matcher execution and ranking screenshots.
- Real-estate raw data/model are needed for new experiments and deeper residual attribution.
- Run the supplied Compose stack on a normal Docker host. Recorded native integration results do not prove that unexecuted deployment path.
- Single-worker scheduling, at-least-once external delivery, bounded views/exports and no automatic retention are deliberate scope limits. Load testing, failover, multi-user authorization and public deployment hardening remain unverified.
