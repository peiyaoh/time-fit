# Run 6: Post-final review of v6 (Claude, at the user's request in place of Codex)

**Input from the user (2026-09-22):** the fitbit-break (Walk-to-Joy) study is **not
running**, and no new features are planned for the near future.

## 1. Consequences of the decision
1. **Stage D′ is dropped.** fitbit-break goes to `contrib/legacy` and stays there.
2. **Stage A is mostly wasted work now; drop it.** Every Stage A fix targets code that
   Stage D quarantines and nobody runs:
   - `TaskExecutor` `datetime` and await fixes;
   - the resolver fix;
   - `start()` registration;
   - `cron.js`;
   - `engine.mjs`;
   - `time-engine/index.js`;
   - legacy dependency metadata.

   The `/api/cron` CI job would guard a route that is never called. The one thing Stage A
   produced for later stages was the "legacy scenario suite." That suite is no longer
   needed, because nothing migrates onto core through the façade. Instead, the known
   defects (#4, #12, #13, #17) are listed in `contrib/legacy/README.md` so nobody revives
   the study unaware.
3. **Move the fitbit-break app too, not just its packages.** Leaving it in `apps/` next to
   the examples tells new users it is a supported sample. Move it to
   `contrib/legacy/fitbit-break`. Keep its `next build` CI job through Stage D (it proves the
   move broke nothing), then make it optional (manual trigger).
4. **Legacy semantics were never executed.** Because every condition evaluation threw
   (#12), the legacy precondition tree has never run in production *through this
   code path*. The §3.6 ADR must describe *intended* semantics read from the code, not
   observed behavior. C1 fixtures are the first time those semantics are executed.

## 2. New finding: take-a-break CI smoke is flaky (verified)
Reproduced locally by simulating a minute boundary: `processClock` → Prisma
`event.create` rejects inside `setInterval` → unhandled rejection → **process exits 1**.
The CI job accepts only exit codes 0 and 124 (`.github/workflows/ci.yml`), so any run whose 5 s
window crosses a minute boundary fails, about 1 in 12. **Fix now (tiny CI change):** start
the smoke only when the current second is ≤ 50. That keeps the check meaningful until
Stage E replaces take-a-break with a core-based version.

## 3. Everything else
- Stage B's "claim the npm scope" requires the maintainer's npm account, so the agent
  cannot do it. It is marked as a user action.
- New order: **B → C1 → C2 → (D ∥ E) → F → G**. B is docs + fixtures, and C1 is the first
  real library code.
- No other changes. The v6 architecture holds under the decision; it gets simpler.
