const { fetchRelatedBooks } = require("./recommendations");

function createRelatedBooksHandler(deps = {}) {
  const fetcher = deps.fetchRelatedBooks || fetchRelatedBooks;

  return async function relatedBooksHandler(req, res, next) {
    try {
      const isbn = String(req.params.isbn);
      const recommendations = await fetcher(isbn);
      if (!Array.isArray(recommendations) || recommendations.length === 0) {
        return res.status(204).send();
      }
      return res.status(200).json({ recommendations });
    } catch (error) {
      return next(error);
    }
  };
}

module.exports = {
  createRelatedBooksHandler
};
