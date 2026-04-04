const test = require("node:test");
const assert = require("node:assert/strict");
const { createRelatedBooksHandler } = require("../src/related-books-route");
const { RecommendationTimeoutError } = require("../src/recommendations");
const { createRelatedBooksCircuit } = require("../src/related-books-circuit");

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

async function invoke(handler, req = { params: { isbn: "123" } }) {
  const res = makeResponse();
  let nextError = null;
  await handler(req, res, (error) => {
    nextError = error;
  });
  return { res, nextError };
}

test("first timeout returns 504 and opens circuit; immediate retry returns 503 without external call", async () => {
  let nowMs = 0;
  let calls = 0;

  const circuit = createRelatedBooksCircuit({ now: () => nowMs, openWindowMs: 60000 });
  const handler = createRelatedBooksHandler({
    circuit,
    fetchRelatedBooks: async () => {
      calls += 1;
      throw new RecommendationTimeoutError();
    }
  });

  const first = await invoke(handler);
  assert.equal(first.nextError, null);
  assert.equal(first.res.statusCode, 504);
  assert.equal(calls, 1);

  nowMs = 1000;
  const second = await invoke(handler);
  assert.equal(second.nextError, null);
  assert.equal(second.res.statusCode, 503);
  assert.equal(calls, 1);
});

test("retry after 60s success returns normal response and closes circuit", async () => {
  let nowMs = 0;
  let calls = 0;
  let phase = "timeout";

  const circuit = createRelatedBooksCircuit({ now: () => nowMs, openWindowMs: 60000 });
  const handler = createRelatedBooksHandler({
    circuit,
    fetchRelatedBooks: async () => {
      calls += 1;
      if (phase === "timeout") {
        throw new RecommendationTimeoutError();
      }
      if (phase === "success") {
        return [{ ISBN: "978-1" }];
      }
      return [];
    }
  });

  const first = await invoke(handler);
  assert.equal(first.res.statusCode, 504);
  assert.equal(calls, 1);

  nowMs = 61000;
  phase = "success";
  const retry = await invoke(handler);
  assert.equal(retry.nextError, null);
  assert.equal(retry.res.statusCode, 200);
  assert.deepEqual(retry.res.body, [{ ISBN: "978-1" }]);
  assert.equal(calls, 2);

  nowMs = 62000;
  phase = "empty";
  const afterClose = await invoke(handler);
  assert.equal(afterClose.nextError, null);
  assert.equal(afterClose.res.statusCode, 204);
  assert.equal(calls, 3);
});

test("retry after 60s failure returns 503 and reopens circuit", async () => {
  let nowMs = 0;
  let calls = 0;
  let phase = "timeout";

  const circuit = createRelatedBooksCircuit({ now: () => nowMs, openWindowMs: 60000 });
  const handler = createRelatedBooksHandler({
    circuit,
    fetchRelatedBooks: async () => {
      calls += 1;
      if (phase === "timeout") {
        throw new RecommendationTimeoutError();
      }
      throw new Error("upstream failed");
    }
  });

  const first = await invoke(handler);
  assert.equal(first.nextError, null);
  assert.equal(first.res.statusCode, 504);
  assert.equal(calls, 1);

  nowMs = 61000;
  phase = "failure";
  const retry = await invoke(handler);
  assert.equal(retry.nextError, null);
  assert.equal(retry.res.statusCode, 503);
  assert.equal(calls, 2);

  nowMs = 62000;
  const blocked = await invoke(handler);
  assert.equal(blocked.nextError, null);
  assert.equal(blocked.res.statusCode, 503);
  assert.equal(calls, 2);
});
