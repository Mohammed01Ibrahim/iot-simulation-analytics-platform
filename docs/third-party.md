# Attribution

The academic report studies **IBA Group IoT Data Simulator**, https://github.com/IBA-Group-IT/IoT-data-simulator, under Apache License 2.0. Its architecture, session API and deployment source were inspected. No IBA source files, branding or screenshots are redistributed here. This React/Node application was independently authored with AI coding assistance in November 2026, not recovered from historical coursework.

MinIO is an external **AGPL-3.0** dependency; license: `deploy/MINIO-AGPL-3.0.txt`. Source https://github.com/minio/minio at `0d7408fc9969` / Go module `v0.0.0-20250422221226-0d7408fc9969`. Compose builds unmodified upstream source with its license included. No MinIO binary is committed.

The native execution host forbids Netlink address discovery. `deploy/minio-local-loopback.patch` adds an opt-in `MINIO_LOOPBACK_ONLY=1` branch returning loopback addresses in `cmd/net.go`. This is the only upstream modification used in recorded execution and is not applied by Compose. To reproduce, obtain pinned upstream source, apply that patch and run `go build -buildvcs=false -o minio .` with Go 1.24.2. The dated patch is supplied as modification source; any patched-binary redistribution must retain applicable notices and corresponding source. MinIO's S3 server is not original application code.

Montserrat font files use the SIL Open Font License (`web/public/fonts/OFL.txt`). Lucide icons use ISC. npm dependencies retain their own license files; RabbitMQ and MongoDB are separate services under their upstream licenses. No third-party software is relicensed by this repository. New private application code has no implied public license grant. All application screenshots use synthetic readings, and UI/diagrams are newly authored.
