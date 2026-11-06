# Requirements and evidence matrix

Review date: 2026-11-06 UTC. This matrix was prepared before application implementation.

## Source recovery

The attached `Ubiquitous Computing Project version03(1).docx` is byte-identical to the previously supplied report (SHA-256 `bdab1dcf0dd3cc95c59656172da4012185a86f4d40a32acb3d3b7a5149f5fde4`). All document text and all 12 embedded figures were examined. Figures 1–6 are literature-review illustrations, not implementation diagrams. Figures 7–8 show definition/dataset selection; Figure 9 contains session API code; Figure 10 shows a counter console; Figure 11 shows Docker Desktop; Figure 12 shows JavaScript styling.

The connected GitHub account listed five repositories: this empty private repository, two empty tutorial/study repositories, the public profile repository and `real-estate-price-prediction`. This repository had no branches and no commits. The supplied real-estate, prescription and PHP store archives contain other projects, not surviving IoT source. No student-authored IoT branch or source archive was recovered. This is a bounded search of accessible material, not a claim that no copy exists elsewhere.

The upstream source is [IBA-Group-IT/IoT-data-simulator](https://github.com/IBA-Group-IT/IoT-data-simulator), inspected at tree `c392047d95791979aa6ede4b54dce9fde949ad8d`. Its [Apache 2.0 license](https://github.com/IBA-Group-IT/IoT-data-simulator/blob/master/LICENSE) was checked (license blob `261eeb9e9f8b2b4b0d119366dda99c6fd7d35c64`). Figure 9 matches `ui/public-src/src/app/shared/api/sessionsApiQueryManager.js` (blob `4f61f62f26b7fd263fb83bd4752833e5a02bb814`), including resume calling `start`. Figure 11 names `ibagroup/iot-data-simulator-*` images consistent with `release/docker-compose.yml` (blob `14beadbf2c16e445d550b8d35eb9ececbd9ce8b9`). Upstream has a Java services module, a Node data sender and a React frontend. The report's statement that Java is the frontend is inconsistent with that evidence.

## Evidence classes

| Requirement | Historical evidence | Confidence / recovery | New implementation decision |
|---|---|---|---|
| Virtual devices and schemas | Report architecture; upstream device/schema components | Described; no student source recovered | Validated device CRUD; flat JSON field schema; snapshot settings per session |
| Numeric/text/time/status readings | Report generation section; upstream rule processors | Supported in upstream, not independently attributable to student | Safe declarative generator; no arbitrary JavaScript execution |
| CSV replay | Report methodology; Figure 8; upstream README | Documented upstream feature | CSV upload to MinIO, bounded parsing, finite per-device replay |
| Start/pause/resume/stop | Figure 9 and exact upstream source match | Recovered upstream reference, not original student code | Explicit state machine persisted in MongoDB |
| RabbitMQ | Figure 11 and upstream Compose | Historical deployment screenshot; no raw test records | Durable queue, publisher confirms, manual consumer acknowledgments |
| MongoDB | Figure 11 and upstream Compose | Configuration/session role described | Configurations, immutable session snapshots, consumed message records |
| MinIO | Figure 11 and upstream Compose | File-storage role described | CSV inputs and CSV exports stored as actual S3-compatible objects |
| MQTT and HTTP | Report sender section; upstream sender dependencies | Protocol support confirmed upstream only | MQTT QoS 1 and allowlisted HTTP sink with explicit delivery records |
| Live charts/dashboard | Architecture prose and proposed-work section | No chart screenshot or student implementation recovered | New React dashboard using persisted readings and measured rates |
| Redis heartbeats | Methodology text only; not shown in six-service deployment | Unconfirmed; no Redis component in inspected release Compose | Omitted; Mongo worker heartbeat and explicit degraded status |
| Gaussian batches / 1,000+ devices / latency percentiles | Report claims | No scripts, raw observations or result table recovered | Not carried forward as achievements; new tests report only observed results |
| Drag-and-drop nested schemas | Proposed work and later claimed as implemented | Conflicting text; no source evidence | Structured field editor plus JSON editor; no drag-and-drop claim |
| Cloud-specific connectors / ML anomaly models | Proposed work / future extensions | Not verified | Out of scope; generic MQTT/HTTP only; no ML model claim |
| Docker deployment | Figure 11, upstream Compose | Historical upstream deployment evidence | New Compose authored; runtime validation recorded separately |

## Ownership and scope

This repository is an independent implementation developed in November 2026 with AI coding assistance for Mohammed Basim Ibrahim's portfolio. It is informed by the academic report and publicly documented upstream architecture. No upstream source files, branding or screenshots are copied into the application. Dependency licenses remain their owners'. Historical coursework is described as an architecture study; newly authored functionality is never represented as part of the historical submission.

The new implementation uses React and Node throughout, as requested, rather than porting the upstream Java service. Similar service roles are architectural requirements, not an assertion of identical behavior. Its supported scale and reliability are limited to the explicit tests in `docs/verification.md`.
