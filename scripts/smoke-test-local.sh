#!/usr/bin/env bash
set -euo pipefail

BOOK_SERVICE_URL="${BOOK_SERVICE_URL:-http://127.0.0.1:3000}"
CUSTOMER_SERVICE_URL="${CUSTOMER_SERVICE_URL:-http://127.0.0.1:3001}"
MOBILE_BFF_URL="${MOBILE_BFF_URL:-http://127.0.0.1:3002}"
WEB_BFF_URL="${WEB_BFF_URL:-http://127.0.0.1:3003}"

JWT_SUBJECT="${JWT_SUBJECT:-groot}"
JWT_ISSUER="${JWT_ISSUER:-cmu.edu}"

TMP_DIR="$(mktemp -d)"
trap 'rm -rf "$TMP_DIR"' EXIT

PASS_COUNT=0
FAIL_COUNT=0

pass() {
  PASS_COUNT=$((PASS_COUNT + 1))
  printf 'PASS: %s\n' "$1"
}

fail() {
  FAIL_COUNT=$((FAIL_COUNT + 1))
  printf 'FAIL: %s\n' "$1"
}

require_cmd() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "Missing required command: $1" >&2
    exit 2
  fi
}

http_code() {
  local out_file=$1
  local method=$2
  local url=$3
  shift 3
  curl -sS -o "$out_file" -w '%{http_code}' -X "$method" "$url" "$@"
}

assert_status() {
  local name=$1
  local expected=$2
  local method=$3
  local url=$4
  shift 4

  local body_file="$TMP_DIR/${name}.body"
  local code
  code=$(http_code "$body_file" "$method" "$url" "$@")
  if [[ "$code" == "$expected" ]]; then
    pass "$name (status $code)"
  else
    echo "  expected=$expected actual=$code url=$url" >&2
    echo "  body=$(cat "$body_file")" >&2
    fail "$name"
  fi
}

assert_json_expr() {
  local name=$1
  local file=$2
  local expr=$3

  if node -e 'const fs=require("fs"); const obj=JSON.parse(fs.readFileSync(process.argv[1],"utf8")); const fn=new Function("obj",`return (${process.argv[2]});`); process.exit(fn(obj)?0:1);' "$file" "$expr"; then
    pass "$name"
  else
    echo "  expression failed: $expr" >&2
    echo "  body=$(cat "$file")" >&2
    fail "$name"
  fi
}

require_cmd curl
require_cmd node

VALID_TOKEN="${SMOKE_VALID_TOKEN:-$(node -e 'const b=v=>Buffer.from(JSON.stringify(v)).toString("base64url"); process.stdout.write(`${b({alg:"none",typ:"JWT"})}.${b({sub:process.env.JWT_SUBJECT||"groot",exp:Math.floor(Date.now()/1000)+3600,iss:process.env.JWT_ISSUER||"cmu.edu"})}.x`)')}"
BAD_ISS_TOKEN="${SMOKE_BAD_ISS_TOKEN:-$(node -e 'const b=v=>Buffer.from(JSON.stringify(v)).toString("base64url"); process.stdout.write(`${b({alg:"none",typ:"JWT"})}.${b({sub:process.env.JWT_SUBJECT||"groot",exp:Math.floor(Date.now()/1000)+3600,iss:"wrong-issuer"})}.x`)')}"
EXPIRED_TOKEN="${SMOKE_EXPIRED_TOKEN:-$(node -e 'const b=v=>Buffer.from(JSON.stringify(v)).toString("base64url"); process.stdout.write(`${b({alg:"none",typ:"JWT"})}.${b({sub:process.env.JWT_SUBJECT||"groot",exp:Math.floor(Date.now()/1000)-10,iss:process.env.JWT_ISSUER||"cmu.edu"})}.x`)')}"

TS="$(date +%s)"
USER_ID="smoke${TS}@example.com"
ISBN="978-SMOKE-${TS}"

# 1) /status checks
assert_status "book-service-status" 200 GET "${BOOK_SERVICE_URL}/status"
assert_status "customer-service-status" 200 GET "${CUSTOMER_SERVICE_URL}/status"
assert_status "mobile-bff-status" 200 GET "${MOBILE_BFF_URL}/status"
assert_status "web-bff-status" 200 GET "${WEB_BFF_URL}/status"

# 2) JWT failures on both BFFs
assert_status "web-jwt-missing" 401 GET "${WEB_BFF_URL}/books/${ISBN}"
assert_status "web-jwt-bad-issuer" 401 GET "${WEB_BFF_URL}/books/${ISBN}" -H "Authorization: Bearer ${BAD_ISS_TOKEN}"
assert_status "web-jwt-expired" 401 GET "${WEB_BFF_URL}/books/${ISBN}" -H "Authorization: Bearer ${EXPIRED_TOKEN}"
assert_status "mobile-jwt-missing" 401 GET "${MOBILE_BFF_URL}/books/${ISBN}"
assert_status "mobile-jwt-bad-issuer" 401 GET "${MOBILE_BFF_URL}/books/${ISBN}" -H "Authorization: Bearer ${BAD_ISS_TOKEN}"
assert_status "mobile-jwt-expired" 401 GET "${MOBILE_BFF_URL}/books/${ISBN}" -H "Authorization: Bearer ${EXPIRED_TOKEN}"

# 3) Seed customer/book through web BFF
CREATE_CUSTOMER_BODY="$TMP_DIR/create-customer.body"
CREATE_CUSTOMER_CODE=$(http_code "$CREATE_CUSTOMER_BODY" POST "${WEB_BFF_URL}/customers" \
  -H "Authorization: Bearer ${VALID_TOKEN}" \
  -H "Content-Type: application/json" \
  -d "{\"userId\":\"${USER_ID}\",\"name\":\"Smoke Tester\",\"phone\":\"4125550000\",\"address\":\"5000 Forbes Ave\",\"address2\":\"Apt 1\",\"city\":\"Pittsburgh\",\"state\":\"PA\",\"zipcode\":\"15213\"}")
if [[ "$CREATE_CUSTOMER_CODE" == "201" ]]; then
  pass "create-customer-via-web-bff (status 201)"
else
  echo "  expected=201 actual=$CREATE_CUSTOMER_CODE" >&2
  echo "  body=$(cat "$CREATE_CUSTOMER_BODY")" >&2
  fail "create-customer-via-web-bff"
fi

CUSTOMER_ID=$(node -e 'const fs=require("fs"); const x=JSON.parse(fs.readFileSync(process.argv[1],"utf8")); process.stdout.write(String(x.id||""));' "$CREATE_CUSTOMER_BODY")
if [[ -n "$CUSTOMER_ID" ]]; then
  pass "customer-id-extracted"
else
  fail "customer-id-extracted"
fi

CREATE_BOOK_BODY="$TMP_DIR/create-book.body"
CREATE_BOOK_CODE=$(http_code "$CREATE_BOOK_BODY" POST "${WEB_BFF_URL}/books" \
  -H "Authorization: Bearer ${VALID_TOKEN}" \
  -H "Content-Type: application/json" \
  -d "{\"ISBN\":\"${ISBN}\",\"title\":\"Smoke Book\",\"Author\":\"Smoke Author\",\"description\":\"Smoke description\",\"genre\":\"non-fiction\",\"price\":19.99,\"quantity\":7}")
if [[ "$CREATE_BOOK_CODE" == "201" ]]; then
  pass "create-book-via-web-bff (status 201)"
else
  echo "  expected=201 actual=$CREATE_BOOK_CODE" >&2
  echo "  body=$(cat "$CREATE_BOOK_BODY")" >&2
  fail "create-book-via-web-bff"
fi

# 4) JWT success on both BFFs
assert_status "web-jwt-success-books" 200 GET "${WEB_BFF_URL}/books/${ISBN}" -H "Authorization: Bearer ${VALID_TOKEN}"
assert_status "mobile-jwt-success-books" 200 GET "${MOBILE_BFF_URL}/books/${ISBN}" -H "Authorization: Bearer ${VALID_TOKEN}"
assert_status "web-jwt-success-customers" 200 GET "${WEB_BFF_URL}/customers?userId=${USER_ID}" -H "Authorization: Bearer ${VALID_TOKEN}"
assert_status "mobile-jwt-success-customers" 200 GET "${MOBILE_BFF_URL}/customers?userId=${USER_ID}" -H "Authorization: Bearer ${VALID_TOKEN}"

# 5) Forwarding via web BFF
WEB_BOOK_BODY="$TMP_DIR/web-book.body"
WEB_BOOK_CODE=$(http_code "$WEB_BOOK_BODY" GET "${WEB_BFF_URL}/books/${ISBN}" -H "Authorization: Bearer ${VALID_TOKEN}")
if [[ "$WEB_BOOK_CODE" == "200" ]]; then
  pass "web-forward-books-status"
  assert_json_expr "web-forward-books-shape" "$WEB_BOOK_BODY" 'obj.ISBN && obj.title && obj.Author && obj.description && obj.genre === "non-fiction"'
else
  fail "web-forward-books-status"
fi

WEB_CUSTOMER_BODY="$TMP_DIR/web-customer.body"
WEB_CUSTOMER_CODE=$(http_code "$WEB_CUSTOMER_BODY" GET "${WEB_BFF_URL}/customers?userId=${USER_ID}" -H "Authorization: Bearer ${VALID_TOKEN}")
if [[ "$WEB_CUSTOMER_CODE" == "200" ]]; then
  pass "web-forward-customers-status"
  assert_json_expr "web-forward-customers-shape" "$WEB_CUSTOMER_BODY" 'obj.userId && obj.address && obj.city && obj.state && obj.zipcode'
else
  fail "web-forward-customers-status"
fi

# 6) Mobile transformations
MOBILE_BOOK_BODY="$TMP_DIR/mobile-book.body"
MOBILE_BOOK_CODE=$(http_code "$MOBILE_BOOK_BODY" GET "${MOBILE_BFF_URL}/books/${ISBN}" -H "Authorization: Bearer ${VALID_TOKEN}")
if [[ "$MOBILE_BOOK_CODE" == "200" ]]; then
  pass "mobile-transform-books-get-status"
  assert_json_expr "mobile-transform-books-get-genre" "$MOBILE_BOOK_BODY" 'obj.genre === 3'
else
  fail "mobile-transform-books-get-status"
fi

MOBILE_BOOK_ISBN_BODY="$TMP_DIR/mobile-book-isbn.body"
MOBILE_BOOK_ISBN_CODE=$(http_code "$MOBILE_BOOK_ISBN_BODY" GET "${MOBILE_BFF_URL}/books/isbn/${ISBN}" -H "Authorization: Bearer ${VALID_TOKEN}")
if [[ "$MOBILE_BOOK_ISBN_CODE" == "200" ]]; then
  pass "mobile-transform-books-isbn-status"
  assert_json_expr "mobile-transform-books-isbn-genre" "$MOBILE_BOOK_ISBN_BODY" 'obj.genre === 3'
else
  fail "mobile-transform-books-isbn-status"
fi

MOBILE_CUSTOMER_ID_BODY="$TMP_DIR/mobile-customer-id.body"
MOBILE_CUSTOMER_ID_CODE=$(http_code "$MOBILE_CUSTOMER_ID_BODY" GET "${MOBILE_BFF_URL}/customers/${CUSTOMER_ID}" -H "Authorization: Bearer ${VALID_TOKEN}")
if [[ "$MOBILE_CUSTOMER_ID_CODE" == "200" ]]; then
  pass "mobile-transform-customer-id-status"
  assert_json_expr "mobile-transform-customer-id-shape" "$MOBILE_CUSTOMER_ID_BODY" 'obj.userId && obj.name && obj.phone && !Object.prototype.hasOwnProperty.call(obj,"address") && !Object.prototype.hasOwnProperty.call(obj,"address2") && !Object.prototype.hasOwnProperty.call(obj,"city") && !Object.prototype.hasOwnProperty.call(obj,"state") && !Object.prototype.hasOwnProperty.call(obj,"zipcode")'
else
  fail "mobile-transform-customer-id-status"
fi

MOBILE_CUSTOMER_QUERY_BODY="$TMP_DIR/mobile-customer-query.body"
MOBILE_CUSTOMER_QUERY_CODE=$(http_code "$MOBILE_CUSTOMER_QUERY_BODY" GET "${MOBILE_BFF_URL}/customers?userId=${USER_ID}" -H "Authorization: Bearer ${VALID_TOKEN}")
if [[ "$MOBILE_CUSTOMER_QUERY_CODE" == "200" ]]; then
  pass "mobile-transform-customer-query-status"
  assert_json_expr "mobile-transform-customer-query-shape" "$MOBILE_CUSTOMER_QUERY_BODY" 'obj.userId && obj.name && obj.phone && !Object.prototype.hasOwnProperty.call(obj,"address") && !Object.prototype.hasOwnProperty.call(obj,"address2") && !Object.prototype.hasOwnProperty.call(obj,"city") && !Object.prototype.hasOwnProperty.call(obj,"state") && !Object.prototype.hasOwnProperty.call(obj,"zipcode")'
else
  fail "mobile-transform-customer-query-status"
fi

echo "---"
echo "Smoke test entities: USER_ID=${USER_ID} ISBN=${ISBN} CUSTOMER_ID=${CUSTOMER_ID}"
echo "PASS=${PASS_COUNT} FAIL=${FAIL_COUNT}"

if [[ $FAIL_COUNT -gt 0 ]]; then
  exit 1
fi
