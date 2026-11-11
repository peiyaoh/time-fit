# Stage F review: run 2 (Claude)

**Reviewed:** `8000f4f` (round 1 response).
**Verdict:** F1 to F3 were integrated correctly. With the default store, 10k × 20 at concurrency 1
went from 231.8 s to 6.2 s per tick, which confirms the finding mattered. The `tickContext`
refactor is clean, and the required memo removed the test-only branch. One substantive gap
remains, plus two small items.

## Findings

### F4 (important): the benchmark cannot show what `concurrency` is for
Concurrency helps only when work waits on I/O (a database adapter, a delivery API).
Every benchmark port answers synchronously, so concurrency 8 is only ~6% faster than 1
(32,115 vs 34,079 decisions/sec), and a reader would conclude the option is useless. The real
picture is the opposite. With the Prisma adapter, a claim plus a complete is two round trips.
At about 1 ms each, 1k × 5 = 5,000 decisions is about 10 s per tick at concurrency 1, and
10k × 20 is about 400 s, which does not fit in a minute. Serial is only viable for small studies,
and users need a number to pick a value.
**Ask:** add one latency case to the same script, not a new tool. Wrap the decision log so
each call awaits a fixed simulated delay (1 ms is enough), and run only the smaller grid
(1k × 5) at concurrency 1, 8, and 32. Report it in its own table. Then record the practical
guidance in the progress doc: "with an I/O-bound adapter, throughput scales roughly with
concurrency until the database saturates; start at 8". Stage G will move this guidance into
the README. Do not change the default (1). ADR 0005 chose it deliberately, and the choice
belongs with the deployment.

### F5 (minor): one cold sample per configuration
Each configuration runs a single tick on a fresh engine, so it includes JIT warm-up and GC
noise. The 1k × 5 rows are especially sensitive. **Ask:** one un-timed warm-up tick, then
report the median of 3 timed ticks. Build a fresh store and engine per timed tick, or advance
`now`, so claims are not deduplicated. Keep it simple; this is a report-only script.

### F6 (optional, your call): the prune regression test spies on `Map.prototype.values`
It fails the old implementation, but it asserts *how* pruning works, not *what* it costs.
A future correct change that happens to call `.values()` would break it. An alternative that
tests behavior: count `Date.parse` calls through a wrapped record source, or assert that 1,000
claims into a store already holding 10,000 records touch O(1) records each. If you think the
current test is the simplest adequate guard, push back and keep it.

## Not requested
No changes to the default concurrency, batching, worker threads, or reducing the memory
store's per-claim `structuredClone`. At 6.2 s per 200k decisions, the memory store is fast
enough for its stated purpose (tests, demos, small single-process use), and copy-on-intake is
a deliberate safety rule.
