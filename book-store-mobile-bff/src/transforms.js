function isJsonContentType(contentType) {
  return typeof contentType === "string" && contentType.toLowerCase().includes("application/json");
}

function replaceNonFiction(value) {
  if (Array.isArray(value)) {
    return value.map(replaceNonFiction);
  }

  if (value && typeof value === "object") {
    const next = {};
    for (const [key, nested] of Object.entries(value)) {
      next[key] = replaceNonFiction(nested);
    }
    return next;
  }

  if (value === "non-fiction") {
    return 3;
  }

  return value;
}

function removeCustomerAddressFields(payload) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return payload;
  }

  const next = { ...payload };
  delete next.address;
  delete next.address2;
  delete next.city;
  delete next.state;
  delete next.zipcode;
  return next;
}

function isTargetBookGet(req) {
  if (req.method !== "GET") {
    return false;
  }

  const url = new URL(req.originalUrl, "http://localhost");
  return /^\/books\/(isbn\/)?[^/]+$/.test(url.pathname);
}

function isTargetCustomerGet(req) {
  if (req.method !== "GET") {
    return false;
  }

  const url = new URL(req.originalUrl, "http://localhost");
  if (/^\/customers\/[^/]+$/.test(url.pathname)) {
    return true;
  }

  return url.pathname === "/customers" && url.searchParams.has("userId");
}

function transformBody(req, responseHeaders, bodyBuffer) {
  const contentType = responseHeaders.get("content-type");
  if (!isJsonContentType(contentType)) {
    return null;
  }

  let parsed;
  try {
    parsed = JSON.parse(bodyBuffer.toString("utf8"));
  } catch (_error) {
    return null;
  }

  if (isTargetBookGet(req)) {
    const transformed = replaceNonFiction(parsed);
    return Buffer.from(JSON.stringify(transformed));
  }

  if (isTargetCustomerGet(req)) {
    const transformed = removeCustomerAddressFields(parsed);
    return Buffer.from(JSON.stringify(transformed));
  }

  return null;
}

module.exports = {
  transformBody
};
