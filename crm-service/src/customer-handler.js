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
  try {
    await sender(customer, deps);
    console.log("CRM activation email sent.", { userId: customer.userId });
  } catch (error) {
    console.error("CRM activation email send failed.", {
      userId: customer.userId,
      error: error?.message || String(error)
    });
    throw error;
  }
}

module.exports = {
  handleCustomerRegisteredEvent
};
