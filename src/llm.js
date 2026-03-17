function isMissing(value) {
  return typeof value !== "string" || value.trim().length === 0;
}

async function generateBookSummary(book) {
  const provider = (process.env.LLM_PROVIDER || "none").toLowerCase();
  if (provider === "none") {
    return "";
  }

  if (provider === "openai") {
    const apiKey = process.env.OPENAI_API_KEY;
    if (isMissing(apiKey)) {
      return "";
    }

    const model = process.env.OPENAI_MODEL || "gpt-4o-mini";
    const prompt = [
      "Write an approximately 500-word summary for this book.",
      "Return only the summary text.",
      `Title: ${book.title}`,
      `Author: ${book.Author}`,
      `Description: ${book.description}`,
      `Genre: ${book.genre}`
    ].join("\n");

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model,
        temperature: 0.4,
        messages: [
          {
            role: "system",
            content: "You write neutral, factual book summaries."
          },
          {
            role: "user",
            content: prompt
          }
        ]
      })
    });

    if (!response.ok) {
      return "";
    }

    const data = await response.json();
    const content = data?.choices?.[0]?.message?.content;
    return typeof content === "string" ? content.trim() : "";
  }

  if (provider === "gemini") {
    const apiKey = process.env.GEMINI_API_KEY;
    if (isMissing(apiKey)) {
      return "";
    }

    const model = process.env.GEMINI_MODEL || "gemini-1.5-flash";
    const prompt = [
      "Write an approximately 500-word summary for this book.",
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
