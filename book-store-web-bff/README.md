# book-store-web-bff

Role: web backend-for-frontend service.

Current step-1 state:
- Runs as a standalone Express service
- Exposes `/status`
- Includes placeholder `/books` and `/customers` endpoints (`501`) until proxy/auth logic is implemented

Target A2 work remaining:
- Add JWT validation and backend forwarding behavior for web clients
