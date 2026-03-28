require("dotenv").config();
const express = require("express");
const { requireJwt } = require("./auth");
const { forwardRequest } = require("./proxy");

const app = express();
const port = Number(process.env.PORT || 80);

app.set("trust proxy", true);

app.get("/status", (_req, res) => {
  res.type("text/plain").status(200).send("OK");
});

app.use((req, res, next) => {
  if (req.path === "/status") {
    return next();
  }
  return requireJwt(req, res, next);
});

app.use(express.json());

app.use("/customers", async (req, res, next) => {
  try {
    await forwardRequest(req, res, "customers");
  } catch (error) {
    next(error);
  }
});

app.use("/books", async (req, res, next) => {
  try {
    await forwardRequest(req, res, "books");
  } catch (error) {
    next(error);
  }
});

app.use((req, res) => {
  res.status(404).json({ message: "Not found." });
});

app.use((err, _req, res, next) => {
  if (err?.type === "entity.parse.failed") {
    return res.status(400).json({ message: "Invalid or missing input." });
  }

  console.error("Unhandled error:", err);
  if (res.headersSent) {
    return next(err);
  }
  return res.status(502).json({ message: "Bad gateway." });
});

app.listen(port, "0.0.0.0", () => {
  console.log(`Web BFF listening on port ${port}`);
});
