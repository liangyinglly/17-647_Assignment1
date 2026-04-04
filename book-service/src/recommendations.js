function normalizeBaseUrl(value) {
  return String(value || "").trim().replace(/\/$/, "");
}

function recommendationServiceBaseUrl() {
  return (
    normalizeBaseUrl(process.env.RECOMMENDATION_SERVICE_URL) ||
    "http://recommendation-service:3000"
  );
}

function extractRecommendations(payload) {
  if (Array.isArray(payload)) {
    return payload;
  }

  if (payload && typeof payload === "object" && Array.isArray(payload.recommendations)) {
    return payload.recommendations;
  }

  return [];
}

async function fetchRelatedBooks(isbn, fetchImpl = fetch) {
  const targetUrl = `${recommendationServiceBaseUrl()}/books/${encodeURIComponent(isbn)}/related-books`;
  const response = await fetchImpl(targetUrl, {
    method: "GET",
    headers: {
      Accept: "application/json"
    }
  });

  if (response.status === 204) {
    return [];
  }

  if (!response.ok) {
    throw new Error(`Recommendation service returned ${response.status}`);
  }

  let payload = null;
  try {
    payload = await response.json();
  } catch (_error) {
    payload = null;
  }

  return extractRecommendations(payload);
}

module.exports = {
  fetchRelatedBooks,
  extractRecommendations
};
