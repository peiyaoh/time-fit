// Checks direct runtime and peer dependencies of publishable packages against the project's
// BSD-3-Clause-compatible SPDX allowlist. Transitive dependency licensing remains a release review.
import { existsSync, readFileSync } from "node:fs";
import { dirname, join, parse } from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const ALLOWED_LICENSES = new Set(["MIT", "ISC", "BSD-2-Clause", "BSD-3-Clause", "Apache-2.0", "0BSD"]);
const PUBLISHABLE_PACKAGES = Object.freeze([
  { name: "@time-fit/core", manifestPath: new URL("../packages/core/package.json", import.meta.url) },
  { name: "@time-fit/storage-prisma", manifestPath: new URL("../packages/storage-prisma/package.json", import.meta.url) },
  { name: "@time-fit/integrations", manifestPath: new URL("../packages/integrations/package.json", import.meta.url) },
]);

const violations = PUBLISHABLE_PACKAGES.flatMap(checkPackageLicenses);
if (violations.length > 0) {
  console.error(`Incompatible production dependency license(s): ${violations.join(", ")}`);
  process.exit(1);
}
console.log(`Published dependency licenses OK (${PUBLISHABLE_PACKAGES.map(({ name }) => name).join(", ")}).`);

function checkPackageLicenses({ name: packageName, manifestPath }) {
  const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
  const runtimeDependencies = ["dependencies", "peerDependencies", "optionalDependencies"]
    .flatMap((field) => Object.keys(manifest[field] ?? {}));
  return [...new Set(runtimeDependencies)].flatMap((dependencyName) => {
    const license = readManifest(dependencyName).license;
    return ALLOWED_LICENSES.has(license) ? [] : `${packageName} -> ${dependencyName}: ${String(license)}`;
  });
}

function readManifest(packageName) {
  let directory = dirname(require.resolve(packageName));
  while (directory !== parse(directory).root) {
    const manifestPath = join(directory, "package.json");
    if (existsSync(manifestPath)) {
      const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
      if (manifest.name === packageName) return manifest;
    }
    directory = dirname(directory);
  }
  throw new Error(`Could not locate package manifest for ${packageName}`);
}
