/**
 * Serializes JSON-compatible data with object keys sorted recursively, so logically equal
 * values always produce the same string (used for `taskVersion`, ADR 0004 §2).
 * Arrays keep their order; object members whose value is `undefined` are dropped.
 *
 * @param {unknown} value
 * @returns {string}
 * @throws {TypeError} for values JSON cannot represent faithfully (functions, bigint,
 *   symbols, non-finite numbers, non-plain objects such as Date).
 */
export function canonicalJson(value) {
  if (value === null || typeof value === "string" || typeof value === "boolean") {
    return JSON.stringify(value);
  }
  if (typeof value === "number") return serializeFiniteNumber(value);
  if (Array.isArray(value)) return `[${value.map(canonicalArrayElement).join(",")}]`;
  if (isPlainObject(value)) return serializeObject(value);
  throw new TypeError(`canonicalJson: unsupported value of type ${describeType(value)}`);
}

function serializeFiniteNumber(value) {
  if (!Number.isFinite(value)) {
    throw new TypeError(`canonicalJson: non-finite number ${value}`);
  }
  return JSON.stringify(value);
}

// JSON.stringify writes `undefined` array holes as null; mirror that.
function canonicalArrayElement(element) {
  return element === undefined ? "null" : canonicalJson(element);
}

function serializeObject(object) {
  const members = Object.keys(object)
    .filter((key) => object[key] !== undefined)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${canonicalJson(object[key])}`);
  return `{${members.join(",")}}`;
}

// Compares prototype *shape*, not identity, so objects from another realm (vm contexts,
// worker threads, structuredClone in a test VM) still count as plain.
function isPlainObject(value) {
  if (typeof value !== "object") return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === null || Object.getPrototypeOf(prototype) === null;
}

function describeType(value) {
  return typeof value === "object" ? Object.prototype.toString.call(value) : typeof value;
}
