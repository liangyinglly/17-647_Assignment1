require("dotenv").config();
const { startCustomerConsumer } = require("./kafka-consumer");
const { handleCustomerRegisteredEvent } = require("./customer-handler");

async function start() {
  await startCustomerConsumer(handleCustomerRegisteredEvent);
  console.log("CRM service consumer started.");
}

start().catch((error) => {
  console.error("Failed to start CRM service:", error);
  process.exit(1);
});
