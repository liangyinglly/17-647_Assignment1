# book-store-web-bff

Role: web backend-for-frontend service.

Current state:
- Runs as a standalone Express service on port `80`
- Exposes `/status` (no auth)
- Exposes `/customers...` and `/books...` with JWT validation
- Proxies customer routes to `CUSTOMER_SERVICE_URL` or `URL_BASE_BACKEND_SERVICES`
- Proxies book routes to `BOOK_SERVICE_URL` or `URL_BASE_BACKEND_SERVICES`

JWT rules:
- `Authorization: Bearer <token>` required for all non-`/status` requests
- payload `sub` must be one of `starlord`, `gamora`, `drax`, `rocket`, `groot`
- payload `exp` must exist and be in the future
- payload `iss` must equal `cmu.edu`
