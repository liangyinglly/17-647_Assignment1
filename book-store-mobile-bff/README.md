# book-store-mobile-bff

Role: mobile backend-for-frontend service.

Current step-1 state:
- Runs as a standalone Express service
- Exposes `/status`
- Includes placeholder `/books` and `/customers` endpoints (`501`) until proxy/auth/transform logic is implemented

Target A2 work remaining:
- Add JWT validation, backend forwarding, and response transformation for mobile clients
