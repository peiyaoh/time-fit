// Fails CI when published candidates declare or import runtime dependencies outside their
// explicit allowlists. Source scanning closes the workspace-hoisting loophole.
import { readdirSync, readFileSync } from "node:fs";

const PACKAGE_RULES = Object.freeze([
  { name: "@time-fit/core", manifest: "../packages/core/package.json", source: "../packages/core/src/", allowed: new Set(["cron-parser", "luxon", "seedrandom"]) },
  { name: "@time-fit/storage-prisma", manifest: "../packages/storage-prisma/package.json", source: "../packages/storage-prisma/src/", allowed: new Set(["@prisma/client", "@time-fit/core"]) },
  { name: "@time-fit/integrations", manifest: "../packages/integrations/package.json", source: "../packages/integrations/src/", allowed: new Set(["@time-fit/core"]) },
]);
// Statement-anchored so words like "active-from" in comments never match:
// `import|export ... from "x"` (may span lines), side-effect `import "x"`, dynamic `import("x")`.
const IMPORT_SPECIFIER_PATTERN =
  /^\s*(?:import|export)\s[^;]*?\bfrom\s*["']([^"']+)["']|^\s*import\s*["']([^"']+)["']|\bimport\s*\(\s*["']([^"']+)["']/gm;

/**
 * @param {{ dependencies?: Record<string, string>, peerDependencies?: Record<string, string>,
 *           optionalDependencies?: Record<string, string> }} manifest
 * @returns {string[]} runtime dependency names not on the allowlist
 */
function findDisallowedDependencies(manifest, allowed) {
  const runtimeNames = ["dependencies", "peerDependencies", "optionalDependencies"].flatMap((field) =>
    Object.keys(manifest[field] ?? {}),
  );
  return runtimeNames.filter((name) => !allowed.has(name));
}

/**
 * Yarn hoists every workspace dependency to the root node_modules, so an undeclared
 * import still resolves locally; scanning source catches it before a packed install does.
 * @returns {string[]} "file: specifier" for bare imports that are neither allowed nor node: builtins
 */
function findDisallowedImports(sourceDirectoryUrl, allowed) {
  const sourceFiles = readdirSync(sourceDirectoryUrl, { recursive: true }).filter((name) => name.endsWith(".js"));
  return sourceFiles.flatMap((fileName) => {
    const source = readFileSync(new URL(fileName, sourceDirectoryUrl), "utf8");
    return [...source.matchAll(IMPORT_SPECIFIER_PATTERN)]
      .map((match) => match[1] ?? match[2] ?? match[3])
      .filter((specifier) => !isRelativeOrBuiltin(specifier) && !allowed.has(packageNameOf(specifier)))
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

const violations = PACKAGE_RULES.flatMap(({ name, manifest, source, allowed }) => {
  const manifestUrl = new URL(manifest, import.meta.url);
  const sourceUrl = new URL(source, import.meta.url);
  const parsedManifest = JSON.parse(readFileSync(manifestUrl, "utf8"));
  return [...findDisallowedDependencies(parsedManifest, allowed), ...findDisallowedImports(sourceUrl, allowed)].map((entry) => `${name}: ${entry}`);
});
if (violations.length > 0) {
  console.error(`Published candidates have disallowed runtime dependencies or imports: ${violations.join(", ")}. Update the ADR and allowlist together if required.`);
  process.exit(1);
}
console.log(`Published candidate runtime dependencies and imports OK (${PACKAGE_RULES.map(({ name }) => name).join(", ")}).`);
