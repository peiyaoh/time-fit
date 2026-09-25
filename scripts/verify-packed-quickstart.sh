#!/usr/bin/env bash
# Packs published candidates, installs them into empty directories outside the workspace,
# and runs the memory and injected-Prisma examples. This proves declared dependencies,
# exports, and no workspace hoisting.
set -euo pipefail

repo_root="$(cd "$(dirname "$0")/.." && pwd)"
work_dir="$(mktemp -d)"
trap 'rm -rf "$work_dir"' EXIT
# Keep npm's short-lived cache inside the fixture. Some developer caches are intentionally
# unreadable to this process; a clean cache also better simulates a consumer machine.
npm_cache="$work_dir/npm-cache"
export npm_config_cache="$npm_cache"

core_tarball="$(cd "$repo_root/packages/core" && npm pack --silent --pack-destination "$work_dir")"
storage_tarball="$(cd "$repo_root/packages/storage-prisma" && npm pack --silent --pack-destination "$work_dir")"
integrations_tarball="$(cd "$repo_root/packages/integrations" && npm pack --silent --pack-destination "$work_dir")"
cd "$work_dir"
npm init -y >/dev/null
npm pkg set type=module >/dev/null
npm install --silent --no-audit --no-fund "./$core_tarball"
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

integrations_dir="$work_dir/integrations-example"
mkdir "$integrations_dir"
cd "$integrations_dir"
npm init -y >/dev/null
npm pkg set type=module >/dev/null
# Deliberately install no Twilio, Mailjet, or node-notifier package: desktop depends only
# on the injected notifier and the exports map must not load vendor modules.
npm install --silent --no-audit --no-fund "../$core_tarball" "../$integrations_tarball"
node --input-type=module -e '
  const { desktopNotificationAction } = await import("@time-fit/integrations/desktop");
  const notifications = [];
  const action = desktopNotificationAction({ notifier: { notify: async (options) => { notifications.push(options); return "shown"; } } });
  const result = await action.execute({ message: "Packed desktop integration" }, { decisionId: "packed-decision" });
  if (!result.ok || notifications.length !== 1 || result.delivery.provider !== "desktop") process.exit(1);
  console.log("packed integrations desktop example OK");
'

prisma_dir="$work_dir/prisma-example"
mkdir "$prisma_dir"
cp "$repo_root/examples/prisma/index.mjs" "$repo_root/examples/prisma/package.json" "$prisma_dir/"
cp -R "$repo_root/examples/prisma/prisma" "$prisma_dir/prisma"
cd "$prisma_dir"
npm install --silent --no-audit --no-fund "../$core_tarball" "../$storage_tarball" prisma@6.10.0 @prisma/client@6.10.0
npx prisma generate --schema prisma/schema.prisma >/dev/null
npx prisma db push --skip-generate --schema prisma/schema.prisma >/dev/null
prisma_output="$(node index.mjs)"
echo "$prisma_output"
node -e '
  const result = JSON.parse(process.argv[1]);
  if (result.state !== "completed" || result.participantCount !== 1) process.exit(1);
  console.log("packed Prisma example OK");
' "$prisma_output"
