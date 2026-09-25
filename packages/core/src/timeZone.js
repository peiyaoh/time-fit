import { IANAZone } from "luxon";

// Luxon also accepts fixed offsets such as "+05:00", which are not IANA names and never
// observe DST; requiring a leading letter rejects them (ADR 0005 §1).
const IANA_NAME_PATTERN = /^[A-Za-z][A-Za-z0-9_+\-/]*$/;

/**
 * @param {unknown} zone
 * @returns {boolean} true only for IANA zone names Luxon can resolve.
 */
export function isValidTimeZone(zone) {
  return typeof zone === "string" && IANA_NAME_PATTERN.test(zone) && IANAZone.isValidZone(zone);
}
