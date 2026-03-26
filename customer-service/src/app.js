require("dotenv").config();
const express = require("express");
const customersRouter = require("./routes/customers");
const { initSchema } = require("./db");

const app = express();
const port = Number(process.env.PORT || 3000);

app.set("trust proxy", true);
app.use(express.json());

app.get("/status", (_req, res) => {
  res.type("text/plain").status(200).send("OK");
});

app.use("/customers", customersRouter);

app.use((req, res) => {
  res.status(404).json({ message: "Not found." });
});

app.use((err, req, res, next) => {
  if (err?.type === "entity.parse.failed") {
    return res.status(400).json({ message: "Invalid or missing input." });
  }

  console.error("Unhandled error:", err);
  if (res.headersSent) {
    return next(err);
  }
  return res.status(500).json({ message: "Internal server error." });
});

async function start() {
  if ((process.env.DB_AUTO_INIT || "true").toLowerCase() !== "false") {
    await initSchema();
  }

  app.listen(port, "0.0.0.0", () => {
    console.log(`Customer service listening on port ${port}`);
  });
}

start().catch((error) => {
  console.error("Failed to start application:", error);
  process.exit(1);
});
