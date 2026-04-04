const express = require("express");
const { pool } = require("../db");
const { publishCustomerRegisteredEvent } = require("../customer-events");

const REQUIRED_CUSTOMER_FIELDS = [
  "userId",
  "name",
  "phone",
  "address",
  "city",
  "state",
  "zipcode"
];

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const US_STATE_PATTERN =
  /^(AL|AK|AZ|AR|CA|CO|CT|DE|FL|GA|HI|IA|ID|IL|IN|KS|KY|LA|MA|MD|ME|MI|MN|MO|MS|MT|NC|ND|NE|NH|NJ|NM|NV|NY|OH|OK|OR|PA|RI|SC|SD|TN|TX|UT|VA|VT|WA|WI|WV|WY|DC)$/;

function hasOwn(obj, key) {
  return Object.prototype.hasOwnProperty.call(obj, key);
}

function isValidCustomerPayload(body) {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return false;
  }

  for (const field of REQUIRED_CUSTOMER_FIELDS) {
    if (!hasOwn(body, field)) {
      return false;
    }
    if (body[field] === null || body[field] === undefined) {
      return false;
    }
  }

  if (hasOwn(body, "address2")) {
    if (body.address2 === null || body.address2 === undefined) {
      return false;
    }
  }

  if (!EMAIL_PATTERN.test(String(body.userId))) {
    return false;
  }
  return US_STATE_PATTERN.test(String(body.state).toUpperCase());
}

function mapCustomerRow(row) {
  return {
    id: row.id,
    userId: row.userId,
    name: row.name,
    phone: row.phone,
    address: row.address,
    address2: row.address2 || "",
    city: row.city,
    state: row.state,
    zipcode: row.zipcode
  };
}

function createPostCustomerHandler(deps = {}) {
  const dbPool = deps.pool || pool;
  const publishEvent = deps.publishCustomerRegisteredEvent || publishCustomerRegisteredEvent;

  return async function postCustomer(req, res, next) {
    try {
      if (!isValidCustomerPayload(req.body)) {
        return res.status(400).json({ message: "Invalid or missing input." });
      }

      const customer = {
        userId: String(req.body.userId),
        name: String(req.body.name),
        phone: String(req.body.phone),
        address: String(req.body.address),
        address2: hasOwn(req.body, "address2") ? String(req.body.address2) : "",
        city: String(req.body.city),
        state: String(req.body.state).toUpperCase(),
        zipcode: String(req.body.zipcode)
      };

      const [existing] = await dbPool.execute(
        "SELECT id FROM customers WHERE userId = ?",
        [customer.userId]
      );
      if (existing.length > 0) {
        return res
          .status(422)
          .json({ message: "This user ID already exists in the system." });
      }

      const [result] = await dbPool.execute(
        "INSERT INTO customers (userId, name, phone, address, address2, city, state, zipcode) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
        [
          customer.userId,
          customer.name,
          customer.phone,
          customer.address,
          customer.address2,
          customer.city,
          customer.state,
          customer.zipcode
        ]
      );

      const payload = {
        id: result.insertId,
        userId: customer.userId,
        name: customer.name,
        phone: customer.phone,
        address: customer.address,
        address2: customer.address2,
        city: customer.city,
        state: customer.state,
        zipcode: customer.zipcode
      };

      try {
        await publishEvent(payload);
      } catch (publishError) {
        console.error("Customer created but Kafka publish failed:", {
          id: payload.id,
          userId: payload.userId,
          error: publishError?.message || String(publishError)
        });
      }

      return res
        .status(201)
        .location(`${req.protocol}://${req.get("host")}/customers/${result.insertId}`)
        .json(payload);
    } catch (error) {
      return next(error);
    }
  };
}

function createCustomersRouter(deps = {}) {
  const router = express.Router();
  const dbPool = deps.pool || pool;

  router.post("/", createPostCustomerHandler({
    pool: dbPool,
    publishCustomerRegisteredEvent: deps.publishCustomerRegisteredEvent
  }));

  router.get("/:id", async (req, res, next) => {
    try {
      const id = Number(req.params.id);
      if (!Number.isInteger(id) || id <= 0) {
        return res.status(400).json({ message: "Invalid or missing input." });
      }

      const [rows] = await dbPool.execute("SELECT * FROM customers WHERE id = ?", [id]);
      if (rows.length === 0) {
        return res.sendStatus(404);
      }

      return res.status(200).json(mapCustomerRow(rows[0]));
    } catch (error) {
      return next(error);
    }
  });

  router.get("/", async (req, res, next) => {
    try {
      const userId = req.query.userId;
      if (
        typeof userId !== "string" ||
        userId.trim() === "" ||
        !EMAIL_PATTERN.test(userId)
      ) {
        return res.status(400).json({ message: "Invalid or missing input." });
      }

      const [rows] = await dbPool.execute("SELECT * FROM customers WHERE userId = ?", [userId]);
      if (rows.length === 0) {
        return res.sendStatus(404);
      }

      return res.status(200).json(mapCustomerRow(rows[0]));
    } catch (error) {
      return next(error);
    }
  });

  return router;
}

const router = createCustomersRouter();

module.exports = router;
module.exports.createCustomersRouter = createCustomersRouter;
module.exports.createPostCustomerHandler = createPostCustomerHandler;
module.exports.isValidCustomerPayload = isValidCustomerPayload;
