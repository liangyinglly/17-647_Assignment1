function normalizeBaseUrl(value) {
  return String(value || "").trim().replace(/\/$/, "");
}

function buildServiceBase(kind) {
  const sharedBase = normalizeBaseUrl(process.env.URL_BASE_BACKEND_SERVICES);
  const customerBase = normalizeBaseUrl(process.env.CUSTOMER_SERVICE_URL);
  const bookBase = normalizeBaseUrl(process.env.BOOK_SERVICE_URL);

  if (kind === "customers") {
    return customerBase || sharedBase || "http://customer-service:3000";
  }
  return bookBase || sharedBase || "http://book-service:3000";
}

function filterHeaders(headers) {
  const filtered = new Headers();
  for (const [key, value] of headers.entries()) {
    const lower = key.toLowerCase();
    if (lower === "connection" || lower === "content-length" || lower === "transfer-encoding") {
      continue;
    }
    filtered.set(key, value);
  }
  return filtered;
}

function buildUpstreamHeaders(req, body) {
  const headers = new Headers();
  for (const [key, value] of Object.entries(req.headers)) {
    if (value === undefined) {
      continue;
    }
    const lower = key.toLowerCase();
    if (
      lower === "host" ||
      lower === "content-length" ||
      lower === "connection" ||
      lower === "transfer-encoding"
    ) {
      continue;
    }

    if (Array.isArray(value)) {
      headers.set(key, value.join(","));
    } else {
      headers.set(key, value);
    }
  }

  if (body && !headers.has("content-type")) {
    headers.set("content-type", "application/json");
  }
  return headers;
}

function maybeBody(req) {
  if (req.method === "GET" || req.method === "HEAD") {
    return undefined;
  }

  if (req.body && typeof req.body === "object" && Object.keys(req.body).length > 0) {
    return JSON.stringify(req.body);
  }
  return undefined;
}

function buildTargetUrl(req, serviceBase) {
  return `${serviceBase}${req.originalUrl}`;
}

async function forwardRequest(req, res, serviceKind, transformBody) {
  const targetBase = buildServiceBase(serviceKind);
  const targetUrl = buildTargetUrl(req, targetBase);
  const body = maybeBody(req);

  const upstreamResponse = await fetch(targetUrl, {
    method: req.method,
    headers: buildUpstreamHeaders(req, body),
    body
  });

  res.status(upstreamResponse.status);

  const outgoingHeaders = filterHeaders(upstreamResponse.headers);
  const originalPayload = Buffer.from(await upstreamResponse.arrayBuffer());
  const transformedPayload =
    typeof transformBody === "function"
      ? transformBody(req, upstreamResponse.headers, originalPayload)
      : null;

  outgoingHeaders.forEach((value, key) => {
    res.setHeader(key, value);
  });

  const finalPayload = transformedPayload || originalPayload;
  if (transformedPayload && !res.getHeader("content-type")) {
    res.setHeader("content-type", "application/json; charset=utf-8");
  }

  return res.send(finalPayload);
}

module.exports = {
  forwardRequest
};
