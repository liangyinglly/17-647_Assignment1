const ALLOWED_SUBS = new Set(["starlord", "gamora", "drax", "rocket", "groot"]);

function decodeBase64Url(value) {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized + "=".repeat((4 - (normalized.length % 4)) % 4);
  return Buffer.from(padded, "base64").toString("utf8");
}

function decodeJwtPayload(token) {
  const parts = token.split(".");
  if (parts.length < 2) {
    return null;
  }

  try {
    return JSON.parse(decodeBase64Url(parts[1]));
  } catch (_error) {
    return null;
  }
}

function isValidPayload(payload) {
  if (!payload || typeof payload !== "object") {
    return false;
  }

  if (typeof payload.sub !== "string" || !ALLOWED_SUBS.has(payload.sub)) {
    return false;
  }

  const exp = Number(payload.exp);
  if (!Number.isFinite(exp) || exp <= Math.floor(Date.now() / 1000)) {
    return false;
  }

  if (payload.iss !== "cmu.edu") {
    return false;
  }

  return true;
}

function requireJwt(req, res, next) {
  const authorization = req.get("authorization");
  if (typeof authorization !== "string" || !authorization.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const token = authorization.slice("Bearer ".length).trim();
  if (!token) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const payload = decodeJwtPayload(token);
  if (!isValidPayload(payload)) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  req.jwtPayload = payload;
  return next();
}

module.exports = {
  requireJwt
};
