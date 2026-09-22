/**
 * Maps `items` through an async function with at most `concurrency` calls in flight,
 * preserving input order in the result.
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
  const worker = async () => {
    while (nextIndex < items.length) {
      const index = nextIndex;
      nextIndex += 1;
      results[index] = await mapItem(items[index]);
    }
  };
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, worker));
  return results;
}
