# book-store-mobile-bff

Role: mobile backend-for-frontend service.

Current state:
- Runs as a standalone Express service on port `80`
- Exposes `/status` (no auth)
- Exposes `/customers...` and `/books...` with JWT validation
- Proxies customer routes to `CUSTOMER_SERVICE_URL` or `URL_BASE_BACKEND_SERVICES`
- Proxies book routes to `BOOK_SERVICE_URL` or `URL_BASE_BACKEND_SERVICES`
- Applies mobile response transforms only for:
  - `GET /books/isbn/{ISBN}` and `GET /books/{ISBN}`: `"non-fiction"` -> `3`
  - `GET /customers/{id}` and `GET /customers?userId=...`: remove `address`, `address2`, `city`, `state`, `zipcode`

JWT rules:
- `Authorization: Bearer <token>` required for all non-`/status` requests
- payload `sub` must be one of `starlord`, `gamora`, `drax`, `rocket`, `groot`
- payload `exp` must exist and be in the future
- payload `iss` must equal `cmu.edu`

Environment:
- See `.env.example` for `PORT`, `URL_BASE_BACKEND_SERVICES`, `CUSTOMER_SERVICE_URL`, `BOOK_SERVICE_URL`

Run:
- `npm install`
- `npm start`
