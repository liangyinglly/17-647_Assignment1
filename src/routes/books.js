const express = require("express");
const { pool } = require("../db");
const { generateBookSummary } = require("../llm");

const router = express.Router();

const REQUIRED_BOOK_FIELDS = [
  "ISBN",
  "title",
  "Author",
  "description",
  "genre",
  "price",
  "quantity"
];

function hasOwn(obj, key) {
  return Object.prototype.hasOwnProperty.call(obj, key);
}

function isValidPrice(value) {
  if (typeof value !== "number" && typeof value !== "string") {
    return false;
  }
  const raw = String(value).trim();
  return /^\d+(\.\d{1,2})?$/.test(raw);
}

function isValidQuantity(value) {
  if (typeof value === "number") {
    return Number.isInteger(value);
  }
  if (typeof value === "string") {
    return /^\d+$/.test(value.trim());
  }
  return false;
}

function isValidBookPayload(body) {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return false;
  }

  for (const field of REQUIRED_BOOK_FIELDS) {
    if (!hasOwn(body, field)) {
      return false;
    }
    if (body[field] === null || body[field] === undefined) {
      return false;
    }
  }

  return isValidPrice(body.price) && isValidQuantity(body.quantity);
}

function mapBookRow(row, includeSummary) {
  const payload = {
    ISBN: row.ISBN,
    title: row.title,
    Author: row.Author,
    description: row.description,
    genre: row.genre,
    price: Number(row.price),
    quantity: row.quantity
  };
  if (includeSummary) {
    payload.summary = row.summary || "";
  }
  return payload;
}

async function updateSummaryAsync(book) {
  try {
    const summary = await generateBookSummary(book);
    if (!summary) {
      return;
    }

    await pool.execute("UPDATE books SET summary = ? WHERE ISBN = ?", [
      summary,
      book.ISBN
    ]);
  } catch (error) {
    console.error("LLM summary update failed:", error.message);
  }
}

router.post("/", async (req, res, next) => {
  try {
    if (!isValidBookPayload(req.body)) {
      return res.status(400).json({ message: "Invalid or missing input." });
    }

    const book = {
      ISBN: String(req.body.ISBN),
      title: String(req.body.title),
      Author: String(req.body.Author),
      description: String(req.body.description),
      genre: String(req.body.genre),
      price: Number(req.body.price),
      quantity: Number(req.body.quantity)
    };

    const [existing] = await pool.execute("SELECT ISBN FROM books WHERE ISBN = ?", [
      book.ISBN
    ]);
    if (existing.length > 0) {
      return res
        .status(422)
        .json({ message: "This ISBN already exists in the system." });
    }

    await pool.execute(
      "INSERT INTO books (ISBN, title, Author, description, genre, price, quantity, summary) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
      [
        book.ISBN,
        book.title,
        book.Author,
        book.description,
        book.genre,
        book.price,
        book.quantity,
        ""
      ]
    );

    updateSummaryAsync(book);

    res
      .status(201)
      .location(
        `${req.protocol}://${req.get("host")}/books/${encodeURIComponent(book.ISBN)}`
      )
      .json({
        ISBN: book.ISBN,
        title: book.title,
        Author: book.Author,
        description: book.description,
        genre: book.genre,
        price: book.price,
        quantity: book.quantity
      });
  } catch (error) {
    next(error);
  }
});

router.put("/:isbn", async (req, res, next) => {
  try {
    if (!isValidBookPayload(req.body)) {
      return res.status(400).json({ message: "Invalid or missing input." });
    }

    const pathIsbn = String(req.params.isbn);
    const bodyIsbn = String(req.body.ISBN);
    if (pathIsbn !== bodyIsbn) {
      return res.status(400).json({ message: "Invalid or missing input." });
    }

    const [existing] = await pool.execute("SELECT ISBN FROM books WHERE ISBN = ?", [
      pathIsbn
    ]);
    if (existing.length === 0) {
      return res.sendStatus(404);
    }

    await pool.execute(
      "UPDATE books SET title = ?, Author = ?, description = ?, genre = ?, price = ?, quantity = ? WHERE ISBN = ?",
      [
        String(req.body.title),
        String(req.body.Author),
        String(req.body.description),
        String(req.body.genre),
        Number(req.body.price),
        Number(req.body.quantity),
        pathIsbn
      ]
    );

    const [rows] = await pool.execute("SELECT * FROM books WHERE ISBN = ?", [pathIsbn]);
    return res.status(200).json(mapBookRow(rows[0], false));
  } catch (error) {
    next(error);
  }
});

async function getBook(isbn, res, next) {
  try {
    const [rows] = await pool.execute("SELECT * FROM books WHERE ISBN = ?", [isbn]);
    if (rows.length === 0) {
      return res.sendStatus(404);
    }
    return res.status(200).json(mapBookRow(rows[0], true));
  } catch (error) {
    return next(error);
  }
}

router.get("/isbn/:isbn", async (req, res, next) => {
  return getBook(String(req.params.isbn), res, next);
});

router.get("/:isbn", async (req, res, next) => {
  return getBook(String(req.params.isbn), res, next);
});

module.exports = router;
