# 17-647 Assignment A1 - Bookstore Service

Backend REST service for a simplified bookstore/customer management system.  
Implemented with Node.js + Express + MySQL, containerized with Docker, and designed for AWS deployment (EC2 + RDS + ALB).

## Overview

This project implements the required A1 endpoints:

- Book management (`POST`, `PUT`, `GET` by ISBN)
- Customer management (`POST`, `GET` by numeric ID / userId email)
- Health check endpoint (`GET /status`)
- Asynchronous Gemini summary generation on book creation

## Tech Stack

- Runtime: Node.js (CommonJS)
- Web framework: Express
- Database: MySQL (mysql2/promise)
- LLM provider: Google Gemini API
- Containerization: Docker (`node:23.9.0-alpine`)

## Project Structure

```text
.
├── src/
│   ├── app.js                  # Express bootstrap and global middleware
│   ├── db.js                   # MySQL pool + schema initialization
│   ├── llm.js                  # Gemini summary integration
│   └── routes/
│       ├── books.js            # /books endpoints
│       └── customers.js        # /customers endpoints
├── Dockerfile
├── package.json
├── .env.example                # Safe template (no secrets)
└── url.txt                     # Base URL for submission
```

## Configuration

Create `.env` in project root (never commit real secrets):

```env
PORT=80
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_db_password
DB_NAME=bookstore
DB_AUTO_INIT=true

LLM_PROVIDER=gemini
GEMINI_API_KEY=your_gemini_api_key
GEMINI_MODEL=gemini-2.5-flash
```

`DB_AUTO_INIT=true` creates `books` and `customers` tables at startup if missing.

## Run Locally

```bash
npm install
npm start
```

Default listener: `http://localhost:80`

## Run with Docker

```bash
docker build -t a1-service:latest .
docker run --rm -p 80:80 --env-file .env a1-service:latest
```

If MySQL is also in Docker, set `DB_HOST` to the MySQL container name and run both on the same Docker network.

## API Endpoints

### Health
- `GET /status` -> `200`, `text/plain`, body: `OK`

### Books
- `POST /books`
- `PUT /books/{ISBN}`
- `GET /books/{ISBN}`
- `GET /books/isbn/{ISBN}`

### Customers
- `POST /customers`
- `GET /customers/{id}`
- `GET /customers?userId=<email>`

## Quick Smoke Test

```bash
BASE="http://localhost:80"
ISBN="978-TEST-$(date +%s)"

curl -i "$BASE/status"

curl -i -X POST "$BASE/books" -H "Content-Type: application/json" -d "{
  \"ISBN\":\"$ISBN\",
  \"title\":\"Clean Architecture\",
  \"Author\":\"Robert C. Martin\",
  \"description\":\"A book about software architecture principles\",
  \"genre\":\"non-fiction\",
  \"price\":39.99,
  \"quantity\":10
}"

# summary is generated asynchronously
sleep 40
curl -s "$BASE/books/$ISBN"
```

## AWS Deployment Notes

1. Build/pull image on EC2 and run container with production `.env`.
2. Point DB settings to RDS writer endpoint.
3. Ensure security groups allow:
   - ALB -> EC2 app port
   - EC2 -> RDS 3306
4. Set `url.txt` to public base URL:
   - `http://<ALB-DNS-Name>:80`

## Submission Checklist

- `url.txt` exists in zip root
- `node_modules/` excluded
- `.env` / secrets excluded
- Tables cleared before final submission if required by grader:

```sql
DELETE FROM books;
DELETE FROM customers;
ALTER TABLE customers AUTO_INCREMENT = 1;
```

## Security Notes

- Do not commit `.env` or any API keys
- If a key is ever exposed, revoke/rotate immediately
- Use `.env.example` for shared configuration template only
