function buildActivationEmail(customer, env = process.env) {
  const andrewId = String(env.ANDREW_ID || "").trim();
  if (!andrewId) {
    throw new Error("Missing ANDREW_ID.");
  }

  const from = String(env.EMAIL_FROM || "").trim();
  if (!from) {
    throw new Error("Missing EMAIL_FROM.");
  }

  return {
    from,
    to: customer.userId,
    subject: "Activate your book store account",
    text: `Dear ${customer.name},\nWelcome to the Book store created by ${andrewId}.\nExceptionally this time we won’t ask you to click a link to activate your account.`
  };
}

function createTransporter(env = process.env, deps = {}) {
  if (deps.transporter) {
    return deps.transporter;
  }

  const host = String(env.SMTP_HOST || "").trim();
  const port = Number(env.SMTP_PORT || 587);
  const user = String(env.SMTP_USER || "").trim();
  const pass = String(env.SMTP_PASS || "").trim();

  if (!host || !user || !pass) {
    throw new Error("Missing SMTP_HOST, SMTP_USER, or SMTP_PASS.");
  }

  const createMailer =
    deps.createMailer ||
    (() => {
      const nodemailer = require("nodemailer");
      return nodemailer;
    });

  return createMailer().createTransport({
    host,
    port,
    secure: port === 465,
    auth: {
      user,
      pass
    }
  });
}

async function sendActivationEmail(customer, deps = {}) {
  const env = deps.env || process.env;
  const transporter = createTransporter(env, deps);
  const mail = buildActivationEmail(customer, env);
  await transporter.sendMail(mail);
  return mail;
}

module.exports = {
  buildActivationEmail,
  sendActivationEmail,
  createTransporter
};
