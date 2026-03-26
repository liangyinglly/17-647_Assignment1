require("dotenv").config();
const express = require("express");

const app = express();
const port = Number(process.env.PORT || 80);

app.use(express.json());

app.get("/status", (_req, res) => {
  res.type("text/plain").status(200).send("OK");
});

app.all("/books*", (_req, res) => {
  res.status(501).json({ message: "Web BFF routing not implemented yet." });
});

app.all("/customers*", (_req, res) => {
  res.status(501).json({ message: "Web BFF routing not implemented yet." });
});

app.use((req, res) => {
  res.status(404).json({ message: "Not found." });
});

app.listen(port, "0.0.0.0", () => {
  console.log(`Web BFF listening on port ${port}`);
});
