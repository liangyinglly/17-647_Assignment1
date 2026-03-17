# 17-647 A1 Bookstore Service

This repository contains a Node.js + Express implementation for Assignment A1.

## 1) Environment variables

Create a `.env` file in the project root:

```env
PORT=80
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=bookstore
DB_AUTO_INIT=true

# LLM options:
# LLM_PROVIDER=none|openai|gemini
LLM_PROVIDER=none
OPENAI_API_KEY=
OPENAI_MODEL=gpt-4o-mini
GEMINI_API_KEY=
GEMINI_MODEL=gemini-1.5-flash
```

## 2) Install and run locally

```bash
npm install
npm start
```

Service listens on port `80` by default.

## 3) API endpoints

- `GET /status` -> `200`, `text/plain`, body: `OK`
- `POST /books`
- `PUT /books/{ISBN}`
- `GET /books/isbn/{ISBN}`
- `GET /books/{ISBN}`
- `POST /customers`
- `GET /customers/{id}`
- `GET /customers?userId=<email>`

## 4) Local quick tests

```bash
curl -i http://localhost/status
```

```bash
curl -i -X POST http://localhost/books \
  -H "Content-Type: application/json" \
  -d '{
    "ISBN":"978-0136886099",
    "title":"Software Architecture in Practice",
    "Author":"Bass, L.",
    "description":"The definitive guide to architecting modern software",
    "genre":"non-fiction",
    "price":59.95,
    "quantity":106
  }'
```

## 5) Docker

Build and run:

```bash
docker build -t ediss-a1 .
docker run --rm -p 80:80 --env-file .env ediss-a1
```

## 6) Database reset before submission

Run these SQL commands to avoid duplicate-data grader issues:

```sql
DELETE FROM books;
DELETE FROM customers;
ALTER TABLE customers AUTO_INCREMENT = 1;
```

## 7) AWS notes

- Point DB environment variables to the RDS writer endpoint and credentials.
- Deploy container on EC2 and ensure security groups allow inbound HTTP to your app port.
- Put your public base URL in `url.txt`, for example:
  `http://ALB-xxxxxx.us-east-1.elb.amazonaws.com:80`
