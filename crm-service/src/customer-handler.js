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
    console.log("CRM activation email send attempt.", { userId: customer.userId });
    const mail = await sender(customer, deps);
    console.log("CRM activation email sent.", {
      to: mail?.to || customer.userId,
      subject: mail?.subject || "Activate your book store account"
    });
  } catch (error) {
    console.error("CRM activation email send failed.", {
      userId: customer.userId,
      error: error?.message || String(error)
    });
  }
}

module.exports = {
  handleCustomerRegisteredEvent
};
