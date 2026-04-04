const test = require("node:test");
const assert = require("node:assert/strict");
const { buildActivationEmail } = require("../src/email");
const { handleCustomerRegisteredEvent } = require("../src/customer-handler");

test("buildActivationEmail uses exact subject and required body wording", () => {
  const email = buildActivationEmail(
    {
      name: "Jane",
      userId: "jane@example.com"
    },
    {
      ANDREW_ID: "jdoe",
      EMAIL_FROM: "no-reply@example.com"
    }
  );

  assert.equal(email.subject, "Activate your book store account");
  assert.equal(
    email.text,
    "Dear Jane,\nWelcome to the Book store created by jdoe.\nExceptionally this time we won’t ask you to click a link to activate your account."
  );
});

test("handleCustomerRegisteredEvent calls sendActivationEmail", async () => {
  let received = null;

  await handleCustomerRegisteredEvent(
    {
      name: "Jane",
      userId: "jane@example.com"
    },
    {
      sendActivationEmail: async (customer) => {
        received = customer;
      }
    }
  );

  assert.deepEqual(received, {
    name: "Jane",
    userId: "jane@example.com"
  });
});
