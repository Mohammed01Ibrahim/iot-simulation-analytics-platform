# Native service setup

Requires Node 22+, MongoDB 7, RabbitMQ 4 with MQTT + management plugins, and MinIO running on the same host/network.

```sh
npm ci
npm run build
# Separate terminals:
npm run receiver
npm start
npm run worker
# After /api/health reports healthy:
npm test
npm run test:integration
npx playwright install chromium
npm run test:e2e
npm run seed
node scripts/capture-screenshots.js
```

Defaults: `src/config.js`. RabbitMQ defaults guest/guest; MinIO iotlocal/local-development-only. Override via `.env`. Integration checks create their own test records; use a disposable installation. Seed requires an empty device list. Screenshot capture requires an active seeded session with readings.

Recorded execution used a shared network namespace and a documented native-only MinIO loopback-discovery patch. Normal Compose builds unmodified MinIO. See `docs/verification.md`.
