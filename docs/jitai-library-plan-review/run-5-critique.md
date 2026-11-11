# Run 5 critique of v5 (final pass; Claude in the critic role, Codex unavailable)

Lens: does v5 deliver the user's three goals (**modular, reusable, performant**) plus
open-source readiness, and is anything still wrong at the behavior level?

## 1. Behavior bugs still in the contract
1. **`"system"` tasks in UTC would break take-a-break.** §3.4 evaluates `"system"` cron in
   UTC. take-a-break's task is `"*/30 * * * 1-5"` (`apps/take-a-break/index.js`). In
   UTC, "weekdays" start and end at 19:00–20:00 Detroit time, so reminders would fire on
   Friday evening and stop early on Monday. The legacy engine used the system user's
   `timezone: "America/Detroit"` (`TimeEngine.js:23`). **Fix:** system tasks take a
   `timeZone` field in the spec (required when `scope: "system"`, no silent UTC default).
2. **The memory store grows without bound.** A desktop reminder running for weeks
   accumulates decision records forever, which violates the "cap unbounded collections" rule
   in the maintainer's own coding standards. Dedupe only needs records inside
   `catchUpWindow`. **Fix:** the memory store keeps records inside a retention window
   (default `catchUpWindow + 1h`) plus an optional `maxRecords` cap. This is documented as
   "not for research data".
3. **`logUnavailable: true` in the spec contradicts §3.4** ("every eligible decision point
   produces exactly one record"). Either remove the flag or define it: an opt-out for
   non-research uses, default `true`. Choose one.

## 2. Modularity and reusability
- **The conformance suite must be test-runner agnostic.** If
  `@time-fit/core/testing` imports Jest, every adapter author has to use Jest. Export async
  functions using `node:assert` that any runner can call.
- **Stage C is still one XL PR.** A solo maintainer cannot review or land it safely in one go.
  Split it into **C1 pure kernel** (spec validation, `occurrences()`, identity/`taskVersion`,
  seeded randomization, precondition-tree evaluation; all fixture-tested, no I/O)
  and **C2 engine** (tick loop, ports, memory store, conformance suite, quickstart
  tarball). C1 is also the most reusable artifact in the whole plan.
- **Leftovers the plan never mentions:** `test_script/` (77 ad-hoc `.mjs` scripts on the
  pre-split layout), `DatabaseUtility`'s new characterization tests, `packages/index.js`
  history, and `docs/refactor-plan.md` still reading as the current plan. Assign each:
  scripts and tests move to `contrib/legacy`, and `refactor-plan.md` gets a "superseded by"
  banner.

## 3. Performance
- The design now has the right hooks (pull-based pages, bounded concurrency, pure memoizable
  occurrences, batched writes, reserved `evaluateBatch`). What is missing is any stated
  **scale envelope**, so users cannot tell whether 50k participants is in scope.
  At minimum, G should publish the benchmark result and the tested envelope in the README.
- In the Stage A deprecation warning for the legacy resolver, the legacy code is being
  quarantined, not upgraded, so the warning is noise for the only consumer. Drop it.

## 4. Open-source readiness
- `CITATION.cff` exists (authors: Hung, Pei-Yao). For a research library, citation
  metadata matters. Stage G should update it for the published packages and add a
  "citing / MRT usage" section.

## 5. Verdict
**Score: 9/10.** Fix §1 (1 is a real behavior bug) and split C, and the plan is final.
The architecture, sequencing, and scope cuts are sound.
