#!/usr/bin/env bash
# Packs @time-fit/core, installs the tarball into an empty directory outside the
# workspace, and runs examples/quickstart against it. Proves the published package works
# on its own: declared dependencies only, exports map, no workspace hoisting.
set -euo pipefail

repo_root="$(cd "$(dirname "$0")/.." && pwd)"
work_dir="$(mktemp -d)"
trap 'rm -rf "$work_dir"' EXIT

tarball="$(cd "$repo_root/packages/core" && npm pack --silent --pack-destination "$work_dir")"
cd "$work_dir"
npm init -y >/dev/null
npm pkg set type=module >/dev/null
npm install --silent --no-audit --no-fund "./$tarball"
cp "$repo_root/examples/quickstart/index.mjs" ./index.mjs

output="$(node index.mjs)"
echo "$output"
summary="$(echo "$output" | tail -n 1)"
node -e '
  const { counts, decisions } = JSON.parse(process.argv[1]);
  const ok = counts.occurrence === 1 && decisions.length === 1 && decisions[0].state === "completed";
  if (!ok) { console.error("quickstart produced an unexpected result"); process.exit(1); }
  console.log("packed quickstart OK");
' "$summary"

# Every published subpath must import cleanly from the tarball.
node --input-type=module -e '
  const core = await import("@time-fit/core");
  const memory = await import("@time-fit/core/memory");
  const testing = await import("@time-fit/core/testing");
  const missing = [["createTimeEngine", core], ["createMemoryStore", memory], ["decisionLogConformanceChecks", testing]]
    .filter(([name, mod]) => mod[name] === undefined).map(([name]) => name);
  if (missing.length > 0) { console.error("missing exports:", missing); process.exit(1); }
  console.log("export subpaths OK");
'
