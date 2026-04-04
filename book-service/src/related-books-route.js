const { fetchRelatedBooks, RecommendationTimeoutError } = require("./recommendations");
const { createRelatedBooksCircuit } = require("./related-books-circuit");

function createRelatedBooksHandler(deps = {}) {
  const fetcher = deps.fetchRelatedBooks || fetchRelatedBooks;
  const circuit = deps.circuit || createRelatedBooksCircuit();

  return async function relatedBooksHandler(req, res, next) {
    const gate = circuit.check();
    if (!gate.allowed) {
      return res.sendStatus(503);
    }

    try {
      const isbn = String(req.params.isbn);
      const recommendations = await fetcher(isbn);
      circuit.close();
      if (!Array.isArray(recommendations) || recommendations.length === 0) {
        return res.status(204).send();
      }
      return res.status(200).json(recommendations);
    } catch (error) {
      if (error instanceof RecommendationTimeoutError) {
        circuit.open();
        if (gate.phase === "closed") {
          return res.sendStatus(504);
        }
        return res.sendStatus(503);
      }

      if (gate.phase === "retry") {
        circuit.open();
        return res.sendStatus(503);
      }
      return next(error);
    }
  };
}

module.exports = {
  createRelatedBooksHandler
};
