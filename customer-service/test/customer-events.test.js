const test = require("node:test");
const assert = require("node:assert/strict");
const {
  createPostCustomerHandler
} = require("../src/routes/customers");

function makeResponse() {
  return {
    statusCode: null,
    headers: {},
    body: undefined,
    status(code) {
      this.statusCode = code;
      return this;
    },
    location(value) {
      this.headers.location = value;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    }
  };
}

test("POST /customers publishes event payload after successful insert", async () => {
  const calls = [];
  const fakePool = {
    async execute(sql, params) {
      calls.push({ sql, params });
      if (sql.startsWith("SELECT id FROM customers")) {
        return [[]];
      }
      if (sql.startsWith("INSERT INTO customers")) {
        return [{ insertId: 42 }];
      }
      throw new Error("Unexpected SQL");
    }
  };

  let publishedPayload = null;
  const handler = createPostCustomerHandler({
    pool: fakePool,
    publishCustomerRegisteredEvent: async (payload) => {
      publishedPayload = payload;
    }
  });

  const req = {
    body: {
      userId: "user@example.com",
      name: "Jane",
      phone: "4125551111",
      address: "5000 Forbes Ave",
      address2: "Apt 1",
      city: "Pittsburgh",
      state: "PA",
      zipcode: "15213"
    },
    protocol: "http",
    get(header) {
      if (header === "host") {
        return "localhost:3000";
      }
      return "";
    }
  };

  const res = makeResponse();
  let nextError = null;

  await handler(req, res, (error) => {
    nextError = error;
  });

  assert.equal(nextError, null);
  assert.equal(res.statusCode, 201);
  assert.deepEqual(res.body, {
    id: 42,
    userId: "user@example.com",
    name: "Jane",
    phone: "4125551111",
    address: "5000 Forbes Ave",
    address2: "Apt 1",
    city: "Pittsburgh",
    state: "PA",
    zipcode: "15213"
  });
  assert.deepEqual(publishedPayload, res.body);
  assert.equal(calls.length, 2);
});

test("POST /customers still returns 201 when Kafka publish fails", async () => {
  const fakePool = {
    async execute(sql) {
      if (sql.startsWith("SELECT id FROM customers")) {
        return [[]];
      }
      if (sql.startsWith("INSERT INTO customers")) {
        return [{ insertId: 43 }];
      }
      throw new Error("Unexpected SQL");
    }
  };

  const handler = createPostCustomerHandler({
    pool: fakePool,
    publishCustomerRegisteredEvent: async () => {
      throw new Error("Kafka unavailable");
    }
  });

  const req = {
    body: {
      userId: "user2@example.com",
      name: "John",
      phone: "4125552222",
      address: "5000 Forbes Ave",
      address2: "",
      city: "Pittsburgh",
      state: "PA",
      zipcode: "15213"
    },
    protocol: "http",
    get(header) {
      if (header === "host") {
        return "localhost:3000";
      }
      return "";
    }
  };

  const res = makeResponse();
  let nextError = null;

  await handler(req, res, (error) => {
    nextError = error;
  });

  assert.equal(nextError, null);
  assert.equal(res.statusCode, 201);
  assert.deepEqual(res.body, {
    id: 43,
    userId: "user2@example.com",
    name: "John",
    phone: "4125552222",
    address: "5000 Forbes Ave",
    address2: "",
    city: "Pittsburgh",
    state: "PA",
    zipcode: "15213"
  });
});
