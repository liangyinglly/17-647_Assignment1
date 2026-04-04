const { sendActivationEmail } = require("./email");

async function handleCustomerRegisteredEvent(customer, deps = {}) {
  if (!customer || typeof customer !== "object") {
    throw new Error("Invalid customer payload.");
  }

  if (typeof customer.userId !== "string" || customer.userId.trim() === "") {
    throw new Error("Missing customer userId.");
  }

  if (typeof customer.name !== "string" || customer.name.trim() === "") {
    throw new Error("Missing customer name.");
  }

  const sender = deps.sendActivationEmail || sendActivationEmail;
  await sender(customer, deps);
}

module.exports = {
  handleCustomerRegisteredEvent
};
