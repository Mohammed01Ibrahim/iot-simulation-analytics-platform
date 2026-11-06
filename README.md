# IoT Simulation & Analytics Platform

An independent React and Node.js application that generates synthetic sensor readings, routes them through RabbitMQ, records them in MongoDB, delivers them over MQTT/HTTP, and stores replay datasets and exports in MinIO.

Developed for Mohammed Basim Ibrahim's technical portfolio with AI coding assistance. Informed by the academic architecture study of IBA Group's IoT Data Simulator; this is not the historical upstream application or an assertion of authorship of IBA Group software. See [requirements and evidence](docs/requirements-evidence.md).

## Local deployment

Docker Compose configuration, tests, screenshots and verification notes are being completed alongside the application. Development remains private. Final verification will distinguish native-service execution from Docker execution.

The implementation includes virtual devices with declarative JSON schemas, numeric/text/time/status fields, periodic generation, finite CSV replay, persisted session control, live charts, a message inspector, and CSV export.

No historical performance claims from the report are treated as measured results of this implementation.
