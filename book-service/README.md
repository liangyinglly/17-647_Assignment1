# book-service

Role: backend domain service for book-related APIs.

Current step-1 state:
- Runs as a standalone Express service
- Exposes `/status` and `/books` routes copied from A1
- Uses MySQL via `src/db.js`
- Defaults to port `3000`

Target A2 work remaining:
- Keep only required book-service behavior and finalize A2 integration with BFFs

Run:
- `npm install`
- `npm start`

Environment:
- See `.env.example` for required DB and LLM variables
