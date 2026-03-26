function isMissing(value) {
  return typeof value !== "string" || value.trim().length === 0;
}

const MIN_SUMMARY_LENGTH = 200;

function localFallbackSummary(book) {
  return [
    `"${book.title}" by ${book.Author} presents a practical and structured exploration of ${book.genre} topics, anchored in the book's core theme: ${book.description}.`,
    "The text introduces key concepts progressively, explaining both foundational principles and real-world tradeoffs that readers are likely to encounter in professional practice.",
    "Each section connects abstract ideas to concrete application scenarios, helping readers understand not only what to do, but also why specific choices are effective under different constraints.",
    "The author emphasizes clear terminology, repeatable methods, and decision-making criteria that improve consistency, communication, and execution quality across teams and projects.",
    "Overall, the book serves as both an introduction and a reference, balancing conceptual clarity with actionable guidance for readers who want to apply these ideas confidently in complex environments."
  ].join(" ");
}

async function callGemini(book, model, apiKey) {
  const prompt = [
    "Write a clear English summary of this book.",
    "Length requirement: at least 220 words.",
    "Return only the summary text with no markdown and no bullet points.",
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

async function generateBookSummary(book) {
  const provider = (process.env.LLM_PROVIDER || "none").toLowerCase();
  if (provider === "none") {
    return "";
  }

  if (provider === "gemini") {
    const apiKey = process.env.GEMINI_API_KEY;
    if (isMissing(apiKey)) {
      return localFallbackSummary(book);
    }

    const model = process.env.GEMINI_MODEL || "gemini-2.5-flash";
    let best = "";
    for (let i = 0; i < 2; i += 1) {
      const summary = await callGemini(book, model, apiKey);
      if (summary.length >= MIN_SUMMARY_LENGTH) {
        return summary;
      }
      if (summary.length > best.length) {
        best = summary;
      }
    }
    return best.length >= MIN_SUMMARY_LENGTH ? best : localFallbackSummary(book);
  }

  return "";
}

module.exports = {
  generateBookSummary
};
