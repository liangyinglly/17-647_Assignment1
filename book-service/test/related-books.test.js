const test = require("node:test");
const assert = require("node:assert/strict");
const { createRelatedBooksHandler } = require("../src/related-books-route");

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
    }
  };
}

test("GET /books/:isbn/related-books handler returns 200 with JSON recommendations", async () => {
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
  assert.deepEqual(res.body, { recommendations: [{ ISBN: "978-1" }] });
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
