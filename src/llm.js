function isMissing(value) {
  return typeof value !== "string" || value.trim().length === 0;
}

async function generateBookSummary(book) {
  const provider = (process.env.LLM_PROVIDER || "none").toLowerCase();
  if (provider === "none") {
    return "";
  }

  if (provider === "gemini") {
    const apiKey = process.env.GEMINI_API_KEY;
    if (isMissing(apiKey)) {
      return "";
    }

    const model = process.env.GEMINI_MODEL || "gemini-1.5-flash";
    const prompt = [
      "Write an approximately 50-word summary for this book.",
      "Return only the summary text.",
      `Title: ${book.title}`,
      `Author: ${book.Author}`,
      `Description: ${book.description}`,
      `Genre: ${book.genre}`
    ].join("\n");

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }]
      })
    });

    if (!response.ok) {
      return "";
    }

    const data = await response.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    return typeof text === "string" ? text.trim() : "";
  }

  return "";
}

module.exports = {
  generateBookSummary
};
