# Run Local Services and Local Smoke Test

## Start services (in order)

Use four terminals.

1. `book-service`
```bash
cd /Users/liangying/Downloads/17-647_A1/book-service
env PORT=3000 DB_HOST=127.0.0.1 DB_PORT=3306 DB_USER=root DB_PASSWORD=your_db_password DB_NAME=bookstore DB_AUTO_INIT=true DB_TRUNCATE_ON_START=true LLM_PROVIDER=none node src/app.js
```

2. `customer-service`
```bash
cd /Users/liangying/Downloads/17-647_A1/customer-service
env PORT=3001 DB_HOST=127.0.0.1 DB_PORT=3306 DB_USER=root DB_PASSWORD=your_db_password DB_NAME=bookstore DB_AUTO_INIT=true DB_TRUNCATE_ON_START=false node src/app.js
```

3. `book-store-mobile-bff`
```bash
cd /Users/liangying/Downloads/17-647_A1/book-store-mobile-bff
env PORT=3002 CUSTOMER_SERVICE_URL=http://127.0.0.1:3001 BOOK_SERVICE_URL=http://127.0.0.1:3000 node src/app.js
```

4. `book-store-web-bff`
```bash
cd /Users/liangying/Downloads/17-647_A1/book-store-web-bff
env PORT=3003 CUSTOMER_SERVICE_URL=http://127.0.0.1:3001 BOOK_SERVICE_URL=http://127.0.0.1:3000 node src/app.js
```

## Required env vars

Backend services:
- `DB_HOST`
- `DB_PORT`
- `DB_USER`
- `DB_PASSWORD`
- `DB_NAME`
- `DB_AUTO_INIT`
- `DB_TRUNCATE_ON_START`
- `PORT`

BFF services:
- `PORT`
- `CUSTOMER_SERVICE_URL`
- `BOOK_SERVICE_URL`

Smoke script optional overrides:
- `BOOK_SERVICE_URL` (default `http://127.0.0.1:3000`)
- `CUSTOMER_SERVICE_URL` (default `http://127.0.0.1:3001`)
- `MOBILE_BFF_URL` (default `http://127.0.0.1:3002`)
- `WEB_BFF_URL` (default `http://127.0.0.1:3003`)
- `SMOKE_VALID_TOKEN`, `SMOKE_BAD_ISS_TOKEN`, `SMOKE_EXPIRED_TOKEN` (optional)

## Run local smoke test

From repo root:
```bash
cd /Users/liangying/Downloads/17-647_A1
bash scripts/smoke-test-local.sh
```

Convenience command:
```bash
npm run smoke:local
```

## Common failure cases

- `/status` fails: service not running or wrong port
- backend `500`: MySQL unavailable or DB credentials incorrect
- BFF `502`: incorrect `CUSTOMER_SERVICE_URL` or `BOOK_SERVICE_URL`
- BFF `401` on success checks: invalid token claims (`sub`, `exp`, `iss`)
- mobile transform checks fail: requests accidentally sent to web BFF port
