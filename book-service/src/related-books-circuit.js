const OPEN_WINDOW_MS = 60000;

function createRelatedBooksCircuit(options = {}) {
  const now = typeof options.now === "function" ? options.now : () => Date.now();
  const openWindowMs = Number(options.openWindowMs || OPEN_WINDOW_MS);
  let openedAtMs = null;

  function check() {
    if (openedAtMs === null) {
      return { allowed: true, phase: "closed" };
    }

    const elapsed = now() - openedAtMs;
    if (elapsed < openWindowMs) {
      return { allowed: false, phase: "open" };
    }

    return { allowed: true, phase: "retry" };
  }

  function open() {
    openedAtMs = now();
  }

  function close() {
    openedAtMs = null;
  }

  return {
    check,
    open,
    close
  };
}

module.exports = {
  createRelatedBooksCircuit,
  OPEN_WINDOW_MS
};
