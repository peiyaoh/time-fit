// Fails CI when @time-fit/core declares a runtime dependency outside the allowed set, so
// the core never again drags in a database client or vendor SDK (ADR 0007).
import { readdirSync, readFileSync } from "node:fs";

const ALLOWED_CORE_DEPENDENCIES = new Set(["cron-parser", "luxon", "seedrandom"]);
const CORE_MANIFEST_URL = new URL("../packages/core/package.json", import.meta.url);
const CORE_SOURCE_DIRECTORY_URL = new URL("../packages/core/src/", import.meta.url);
// Statement-anchored so words like "active-from" in comments never match:
// `import|export ... from "x"` (may span lines), side-effect `import "x"`, dynamic `import("x")`.
const IMPORT_SPECIFIER_PATTERN =
  /^\s*(?:import|export)\s[^;]*?\bfrom\s*["']([^"']+)["']|^\s*import\s*["']([^"']+)["']|\bimport\s*\(\s*["']([^"']+)["']/gm;

/**
 * @param {{ dependencies?: Record<string, string>, peerDependencies?: Record<string, string>,
 *           optionalDependencies?: Record<string, string> }} manifest
 * @returns {string[]} runtime dependency names not on the allowlist
 */
function findDisallowedDependencies(manifest) {
  const runtimeNames = ["dependencies", "peerDependencies", "optionalDependencies"].flatMap((field) =>
    Object.keys(manifest[field] ?? {}),
  );
  return runtimeNames.filter((name) => !ALLOWED_CORE_DEPENDENCIES.has(name));
}

/**
 * Yarn hoists every workspace dependency to the root node_modules, so an undeclared
 * import still resolves locally; scanning source catches it before a packed install does.
 * @returns {string[]} "file: specifier" for bare imports that are neither allowed nor node: builtins
 */
function findDisallowedImports() {
  const sourceFiles = readdirSync(CORE_SOURCE_DIRECTORY_URL, { recursive: true }).filter((name) => name.endsWith(".js"));
  return sourceFiles.flatMap((fileName) => {
    const source = readFileSync(new URL(fileName, CORE_SOURCE_DIRECTORY_URL), "utf8");
    return [...source.matchAll(IMPORT_SPECIFIER_PATTERN)]
      .map((match) => match[1] ?? match[2] ?? match[3])
      .filter((specifier) => !isRelativeOrBuiltin(specifier) && !ALLOWED_CORE_DEPENDENCIES.has(packageNameOf(specifier)))
      .map((specifier) => `${fileName}: ${specifier}`);
  });
}

function isRelativeOrBuiltin(specifier) {
  return specifier.startsWith(".") || specifier.startsWith("node:");
}

function packageNameOf(specifier) {
  const segments = specifier.split("/");
  return specifier.startsWith("@") ? segments.slice(0, 2).join("/") : segments[0];
}

const manifest = JSON.parse(readFileSync(CORE_MANIFEST_URL, "utf8"));
const disallowed = [...findDisallowedDependencies(manifest), ...findDisallowedImports()];
if (disallowed.length > 0) {
  console.error(
    `@time-fit/core has disallowed runtime dependencies or imports: ${disallowed.join(", ")}.\n` +
      `Allowed: ${[...ALLOWED_CORE_DEPENDENCIES].join(", ")}. ` +
      "If one is truly needed, update ADR 0007 and this allowlist in the same PR.",
  );
  process.exit(1);
}
console.log(`@time-fit/core runtime dependencies and imports OK (${[...ALLOWED_CORE_DEPENDENCIES].join(", ")}).`);
