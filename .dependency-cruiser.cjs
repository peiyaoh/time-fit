module.exports = {
  forbidden: [
    { name: "no-circular", severity: "error", from: {}, to: { circular: true } },
    { name: "published-packages-must-not-import-legacy", severity: "error", from: { path: "^packages/" }, to: { path: "^contrib/" } },
    { name: "integrations-must-not-import-legacy", severity: "error", from: { path: "^packages/integrations/" }, to: { path: "^contrib/" } },
    { name: "core-must-not-import-other-workspace-code", severity: "error", from: { path: "^packages/core/" }, to: { path: "^(apps|contrib|packages/(?!core/))" } },
  ],
  options: { doNotFollow: { path: "node_modules" }, includeOnly: "^(packages|contrib|apps)/" },
};
