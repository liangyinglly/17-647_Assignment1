const test = require("node:test");
const assert = require("node:assert/strict");
const { createRelatedBooksHandler } = require("../src/related-books-route");
const { RecommendationTimeoutError } = require("../src/recommendations");

function makeResponse() {
  return {
    statusCode: null,
    body: undefined,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    },
    send(payload) {
      this.body = payload;
      return this;
    },
    sendStatus(code) {
      this.statusCode = code;
      this.body = undefined;
      return this;
    }
  };
}

test("GET /books/:isbn/related-books handler returns 200 with raw JSON array", async () => {
  const handler = createRelatedBooksHandler({
    fetchRelatedBooks: async () => [{ ISBN: "978-1" }]
  });

  const req = { params: { isbn: "123" } };
  const res = makeResponse();
  let nextError = null;

  await handler(req, res, (error) => {
    nextError = error;
  });

  assert.equal(nextError, null);
  assert.equal(res.statusCode, 200);
  assert.deepEqual(res.body, [{ ISBN: "978-1" }]);
});

test("GET /books/:isbn/related-books handler returns 204 when no recommendations", async () => {
  const handler = createRelatedBooksHandler({
    fetchRelatedBooks: async () => []
  });

  const req = { params: { isbn: "123" } };
  const res = makeResponse();
  let nextError = null;

  await handler(req, res, (error) => {
    nextError = error;
  });

  assert.equal(nextError, null);
  assert.equal(res.statusCode, 204);
  assert.equal(res.body, undefined);
});

test("GET /books/:isbn/related-books handler returns 504 on recommendation timeout", async () => {
  const handler = createRelatedBooksHandler({
    fetchRelatedBooks: async () => {
      throw new RecommendationTimeoutError();
    }
  });

  const req = { params: { isbn: "123" } };
  const res = makeResponse();
  let nextError = null;

  await handler(req, res, (error) => {
    nextError = error;
  });

  assert.equal(nextError, null);
  assert.equal(res.statusCode, 504);
});
