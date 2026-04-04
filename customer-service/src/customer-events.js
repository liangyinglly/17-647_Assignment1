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

let producerPromise = null;

async function getProducer(deps = {}) {
  if (deps.producer) {
    return deps.producer;
  }

  if (!producerPromise) {
    producerPromise = (async () => {
      const env = deps.env || process.env;
      const createKafka =
        deps.createKafka ||
        (() => {
          const { Kafka } = require("kafkajs");
          return new Kafka({
            clientId: String(env.KAFKA_CLIENT_ID || "customer-service"),
            brokers: resolveBrokers(env)
          });
        });

      const kafka = createKafka();
      const producer = kafka.producer();
      await producer.connect();
      return producer;
    })();
  }

  return producerPromise;
}

async function publishCustomerRegisteredEvent(payload, deps = {}) {
  const env = deps.env || process.env;
  const topic = deps.topic || resolveTopic(env);
  const producer = await getProducer(deps);

  await producer.send({
    topic,
    messages: [{ value: JSON.stringify(payload) }]
  });
}

function __resetProducerForTests() {
  producerPromise = null;
}

module.exports = {
  publishCustomerRegisteredEvent,
  resolveTopic,
  resolveBrokers,
  __resetProducerForTests
};
