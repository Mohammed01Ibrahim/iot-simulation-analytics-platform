# API and data contracts

All routes are under `/api`. JSON input; ISO 8601 UTC times; UUID identifiers. If `API_TOKEN` is set, send `Authorization: Bearer <token>` except to `/health`. The browser offers an Enter token button; its value stays in sessionStorage. Validation returns 400, missing records 404, conflicts 409, oversized exports 413.

| Method | Path | Purpose |
|---|---|---|
| GET | /health | Live dependencies + worker heartbeat |
| GET, POST | /devices | List / create a validated device |
| PUT, DELETE | /devices/:id | Replace settings / delete unused or stopped device |
| GET, POST | /sessions | List / create immutable device snapshot; optional CSV upload |
| POST | /sessions/:id/start, pause, resume, stop | Persist a permitted lifecycle transition |
| GET | /messages?sessionId=&deviceId=&limit= | Persisted readings, up to 500 |
| GET | /overview | Counts, sessions, devices and recent values |
| GET | /events | SSE snapshots each second; UI uses 1-second polling |
| POST | /sessions/:id/export | Store CSV in MinIO; return download URL |
| GET | /exports/:id | Stream stored CSV |

Device example:
```json
{"name":"Lab sensor","deviceId":"LAB-01","sensorType":"Environment","location":"Lab","intervalMs":1000,"fields":[{"name":"temperature","type":"number","min":20,"max":30,"pattern":"sine","unit":"°C"},{"name":"status","type":"status","values":["online"]},{"name":"timestamp","type":"timestamp"}]}
```

Session: `{"name":"Study","deviceIds":["<device UUID>"],"targets":["mqtt","http"],"mode":"generate"}`. Replay adds `mode: "replay"` and `csv: "temperature\n20\n21"`. Each selected device replays all rows, then the session completes.

The broker envelope contains stable messageId, sessionId, deviceId, deviceName, sensorType, sequence, generatedAt, payload and targets. The durable topic exchange routes `sensor.<sensorType>` to a durable queue. Consumers insert a MongoDB record and deliver requested targets: MQTT topic `iot/<deviceId>/readings` with QoS 1, HTTP POST to configured `HTTP_SINK_URL` with `Idempotency-Key: <messageId>`. Receipts, attempt count and final state are retained. MinIO stores `datasets/<session>.csv` and `exports/<id>.csv`.
