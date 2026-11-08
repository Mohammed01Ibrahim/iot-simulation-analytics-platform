# Verification record

Recorded checks use real local MongoDB, RabbitMQ, MQTT, HTTP and MinIO, with synthetic data. This is functional verification, not capacity/latency or production-readiness benchmarking. Execution dates and observations are retained in `evidence/integration-results.json` and `screenshots/manifest.json`.

| Check | Result | Raw evidence |
|---|---|---|
| Generator, lifecycle, schema/CSV rules, safe export | 9 / 9 passed | `evidence/unit-results.txt` |
| API + real service integration | 10 / 10 passed | `evidence/integration-results.txt`, `.json` |
| React workflow and responsive analytics | 2 / 2 passed | `evidence/browser-results.txt`, `.json` |
| Vite production build | Passed | `evidence/build-results.txt` |
| Compose | YAML syntax parsed; container build/start not run | Docker unavailable on execution host |

## Environment

Node 24.22.1; MongoDB 7.0.14; RabbitMQ 4.0.5 with MQTT/management plugins; Erlang 27; MinIO source `0d7408fc9969` built with Go 1.24.2; Chromium headless shell 131 through Playwright 1.56.1. npm dependencies are locked. Compose pins Node 22.21.1; its runtime was not exercised here.

The execution host rejects Unix/Netlink sockets and separates network namespaces between commands. Services and browser tests ran in one shared command session, with MongoDB `--nounixsocket`. MinIO required the opt-in loopback address-discovery patch in `deploy/`; the real S3 server and disk-backed storage ran. Compose builds unmodified upstream source. Browser testing used `--no-zygote --single-process --disable-gpu` and a fresh browser per test.

Integration assertions observe actual MQTT messages and HTTP receipts, database persistence, duplicate broker delivery, pause/resume/stop, finite CSV replay, MinIO input storage and byte-identical exported/downloaded CSV. No service mock replaces these dependencies. Screenshots are real browser captures from a separate showcase database and queue, with no mocked API data.

## Boundaries

Single leased scheduler; no load, soak, failover or disaster-recovery tests. Stable IDs deduplicate stored messages, but a crash between external delivery and receipt persistence can duplicate a downstream delivery. The sample HTTP receiver deduplicates its last 1,000 IDs; MQTT consumers must tolerate duplicates. Transport is at-least-once, not exactly-once. Counters and publication are not one atomic transaction across MongoDB/RabbitMQ.

Pause/stop prevents subsequent scheduling; queued work may finish. Failed delivery after three attempts is retained, with no automatic redrive UI. Lost AMQP connections require process supervision. CSV is flat, capped at 5,000 rows/500 KB; exports at 50,000 messages; sessions at 100 devices. Recent charts include up to 2,000 readings/60 seconds; headline throughput is the actual count over 10 seconds. Session listings cap at 200. Stored records have no automatic retention policy. Scheduling can drift; it is not hard-real-time.

Local demo credentials, optional shared API token, no per-user roles or TLS. The HTTP sink is administrator-configured. This is a local engineering application, not a publicly deployed/hardened service. Docker build/start still needs clean-host verification.
