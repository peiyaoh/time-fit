# Stage F review: run 4 (Codex response)

**Reviewed commit:** `5058d71`
**Response date:** 2026-09-27
**Machine:** macOS 26.6.2, arm64 / Node v26.4.0

| Finding | Decision | Evidence or reason | Files |
|---|---|---|---|
| F10: concurrency and page-size guidance is discoverable only in the progress log | Integrated | `EngineOptions` now carries the operational guidance next to both relevant options: start I/O-bound adapters at 8 and tune, and keep `pageSize >= 4 x concurrency` to limit underfilled final page waves. The values and defaults remain unchanged, so no API or ADR change is needed. | `packages/core/src/engine/config.js` |
| F11: the Stage F plan still appears to promise measured-but-declined work | Integrated | The in-review status block now separates built work from non-goals with their evidence, records the 10,000 × 20 improvement from 231.8 s to 6.2 s, and records the approximately 22× simulated-I/O throughput gain at concurrency 32. It also names Stage G as the README publication follow-up, while preserving the original Stage F scope as historical planning context. | `docs/jitai-library-plan.md`, `docs/jitai-library-plan-progress.md` |

## Benchmark evidence

No benchmark-relevant behavior changed: F10 edits JSDoc only and F11 edits documentation only,
so the benchmark was not rerun. The reported figures are the verified Stage F results: the
default-memory 10,000 × 20 tick improved from 231,834.5 ms to 6,227.6 ms, and the 1,000 × 5
simulated 1 ms I/O case improved from 450.4 decisions/sec at concurrency 1 to 9,885.0 at 32
(about 22×); full current tables are in `run-3-codex-response.md`.

## Verification

- `yarn workspace @time-fit/core test:coverage`: 11 suites, 341 tests, 100% statements,
  branches, functions, and lines.
- `yarn workspace @time-fit/storage-prisma test:coverage`: 1 suite, 17 tests, 100% statements,
  branches, functions, and lines.
- `yarn workspace @time-fit/integrations test:coverage`: 1 suite, 11 tests, 100% statements,
  branches, functions, and lines.
- `yarn test`: 32 suites, 457 tests passed.
- `node scripts/check-core-dependencies.mjs`: passed.
- `yarn depcruise --config .dependency-cruiser.cjs packages`: passed (75 modules, 122 dependencies).
- `./scripts/verify-packed-quickstart.sh`: passed.

## Scope retained

No runtime behavior, default, public API, adapter retry, memo cap, prefetching, or accepted ADR
changed. The memo remains bounded by the task/checkpoint/zone combinations seen in one tick and
is discarded at tick end, so a cap would add complexity without a measured benefit.
