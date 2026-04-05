function resolveTopic(env = process.env) {
  const explicitTopic = String(env.KAFKA_TOPIC || "").trim();
  if (explicitTopic) {
    return explicitTopic;
  }

  const andrewId = String(env.ANDREW_ID || "").trim();
  if (!andrewId) {
    throw new Error("Missing ANDREW_ID or KAFKA_TOPIC for customer event topic.");
  }

  return `${andrewId}.customer.evt`;
}

function resolveBrokers(env = process.env) {
  const raw = String(env.KAFKA_BROKERS || "").trim();
  if (!raw) {
    throw new Error("Missing KAFKA_BROKERS.");
  }

  const brokers = raw
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);

  if (brokers.length === 0) {
    throw new Error("KAFKA_BROKERS must contain at least one broker.");
  }

  return brokers;
}

async function startCustomerConsumer(onCustomerRegistered, deps = {}) {
  if (typeof onCustomerRegistered !== "function") {
    throw new Error("onCustomerRegistered handler is required.");
  }

  const env = deps.env || process.env;
  const createKafka =
    deps.createKafka ||
    (() => {
      const { Kafka } = require("kafkajs");
      return new Kafka({
        clientId: String(env.KAFKA_CLIENT_ID || "crm-service"),
        brokers: resolveBrokers(env)
      });
    });

  const topic = deps.topic || resolveTopic(env);
  const groupId = String(env.KAFKA_GROUP_ID || "crm-service-group");
  const brokers = resolveBrokers(env);
  const kafka = createKafka();
  const consumer = kafka.consumer({ groupId });

  await consumer.connect();
  await consumer.subscribe({ topic, fromBeginning: false });
  console.log("CRM Kafka consumer connected.", { topic, groupId, brokers });

  await consumer.run({
    eachMessage: async ({ message }) => {
      try {
        const raw = message.value ? message.value.toString("utf8") : "";
        if (!raw) {
          console.warn("CRM Kafka event received with empty payload.");
          return;
        }

        const payload = JSON.parse(raw);
        console.log("CRM customer event received.", {
          userId: payload?.userId || "",
          id: payload?.id || null
        });
        await onCustomerRegistered(payload);
      } catch (error) {
        console.error("CRM customer event handling failed:", {
          error: error?.message || String(error)
        });
      }
    }
  });

  return consumer;
}

module.exports = {
  startCustomerConsumer,
  resolveTopic,
  resolveBrokers
};
