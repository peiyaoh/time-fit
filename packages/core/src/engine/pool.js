/**
 * Maps `items` through an async function with at most `concurrency` calls in flight,
 * preserving input order in the result.
 *
 * If a call rejects, no further items start, every call already started is awaited, and the
 * first observed rejection is rethrown. The caller therefore never regains control while work
 * it started is still running (ADR 0013).
 * @template T, R
 * @param {ReadonlyArray<T>} items
 * @param {number} concurrency  positive integer
 * @param {(item: T) => Promise<R>} mapItem
 * @returns {Promise<R[]>}
 */
export async function mapWithConcurrency(items, concurrency, mapItem) {
  if (!Number.isInteger(concurrency) || concurrency < 1) {
    throw new TypeError("mapWithConcurrency: concurrency must be a positive integer");
  }
  const results = new Array(items.length);
  let nextIndex = 0;
  // Tagged so that a rejection with undefined, null, or false still counts as a failure.
  let firstFailure = null;
  const worker = async () => {
    while (firstFailure === null && nextIndex < items.length) {
      const index = nextIndex;
      nextIndex += 1;
      try {
        results[index] = await mapItem(items[index]);
      } catch (reason) {
        if (firstFailure === null) firstFailure = { reason };
      }
    }
  };
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, worker));
  if (firstFailure !== null) throw firstFailure.reason;
  return results;
}
