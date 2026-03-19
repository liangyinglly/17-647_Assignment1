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
`LLM_PROVIDER=gemini` enables summary generation on `POST /books`.

## For TA Quick Check

Use the following commands for a fast end-to-end verification:

```bash
BASE="http://localhost:80"
ISBN="978-TA-CHECK-$(date +%s)"

# 1) Health
curl -i "$BASE/status"

# 2) Create book (expect 201)
curl -i -X POST "$BASE/books" -H "Content-Type: application/json" -d "{
  \"ISBN\":\"$ISBN\",
  \"title\":\"Clean Architecture\",
  \"Author\":\"Robert C. Martin\",
  \"description\":\"A book about software architecture principles\",
  \"genre\":\"non-fiction\",
  \"price\":39.99,
  \"quantity\":10
}"

# 3) Verify async summary (it will take some time to generate the summary)
sleep 40
curl -s "$BASE/books/$ISBN"
```

Pass criteria:
- `/status` returns `200 OK` with body `OK`
- `POST /books` returns `201 Created`
- Final `GET /books/{ISBN}` contains `summary` with non-empty text

## Important Port/Host Rule

- If API runs on host (`npm start`), `DB_HOST=127.0.0.1` is correct when MySQL is exposed on host 3306.
- If API runs in Docker (`docker run`), **do not use `DB_HOST=127.0.0.1`** for MySQL in another container.  
  Use the MySQL container name (for example `a1-mysql`) on a shared Docker network.

## Run Locally

Start MySQL (Docker, mapped to host 3306):

```bash
docker rm -f a1-mysql-local 2>/dev/null || true
docker run -d \
  --name a1-mysql-local \
  -e MYSQL_ROOT_PASSWORD=your_db_password \
  -e MYSQL_DATABASE=bookstore \
  -p 3306:3306 \
  mysql:8.0
```

Then run API on host:

```bash
npm install
npm start
```

Default listener: `http://localhost:80`

## Run with Docker (API + MySQL)

This is the recommended reproducible setup for grading-style testing.

```bash
docker network create a1-net 2>/dev/null || true

docker rm -f a1-mysql 2>/dev/null || true
docker run -d \
  --name a1-mysql \
  --network a1-net \
  -e MYSQL_ROOT_PASSWORD=your_db_password \
  -e MYSQL_DATABASE=bookstore \
  mysql:8.0

docker build -t a1-service:latest .
docker run --rm \
  --name a1-service \
  --network a1-net \
  -p 80:80 \
  --env-file .env \
  -e DB_HOST=a1-mysql \
  a1-service:latest
```

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

Expected:
- `GET /status` -> `200 OK`
- `POST /books` -> `201 Created`
- `GET /books/{ISBN}` eventually returns non-empty `summary` (async; may take 10-60s)


## My AWS Deployment Notes

1. Build/pull image on EC2 and run container with production `.env`.
2. Point DB settings to **RDS writer endpoint** (`DB_HOST=<rds-writer-endpoint>`).
3. Ensure security groups allow:
   - ALB -> EC2 app port
   - EC2 -> RDS 3306
4. In Target Group health check, use:
   - Path: `/status`
   - Success code: `200`
5. Set `url.txt` to public base URL:
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

- Don't commit `.env` or any API keys
- If a key is ever exposed, revoke/rotate immediately
- Use `.env.example` for shared configuration template only

