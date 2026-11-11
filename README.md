# TimeFit

TimeFit is a Node 20+ library for time-based Just-In-Time Adaptive Interventions (JITAIs):
declare decision points, eligibility and availability, randomized outcomes, and delivery plugins;
then run an auditable decision engine from your scheduler.

TimeFit is not yet published to npm. Until the first release, clone this repository, run
`yarn install`, then try [the memory quickstart](examples/quickstart/index.mjs) or
`yarn example1`. Package installation instructions take effect after release.

| Package | Purpose |
|---|---|
| [`@time-fit/core`](packages/core/README.md) | Engine, task validation, memory demo store, and storage conformance checks. |
| [`@time-fit/storage-prisma`](packages/storage-prisma/README.md) | Injected Prisma implementation of TimeFit storage ports. |
| [`@time-fit/integrations`](packages/integrations/README.md) | Injected desktop, Twilio, and Mailjet delivery Actions. |

Start with [core concepts and quickstart](packages/core/README.md), then see
[delivery guarantees](docs/guides/delivery-guarantees.md), [privacy guidance](docs/guides/privacy.md),
and the [architecture decisions](docs/adr/README.md). Runnable examples include the
[memory quickstart](examples/quickstart/index.mjs), [Prisma example](examples/prisma/), and
[desktop reminder](examples/example1.md).

## Scale and scheduling

The performance benchmark measured a 10,000-participant × 20-task default-memory tick at about **6.2 seconds**
on its benchmark machine. For simulated 1 ms decision-log I/O, concurrency 32 measured about
22× concurrency 1. Defaults remain conservative (`concurrency: 1`, `pageSize: 100`): begin
I/O-bound production tuning near concurrency 8, measure your adapter, and keep page size at
least four times concurrency. Full methods and limits: [performance benchmark report](docs/stage-f-review/README.md).

## Citing and MRT use

Use [CITATION.cff](CITATION.cff) when citing TimeFit. For MRT analysis, retain your
application-owned decision log and read the [decision-record ADR](docs/adr/0004-decision-record-identity-delivery.md),
including the meaning of unavailable and claimed records.

## Contributing

Read [CONTRIBUTING.md](CONTRIBUTING.md), [security policy](SECURITY.md),
[code of conduct](CODE_OF_CONDUCT.md), and [governance](GOVERNANCE.md). The
[`contrib/legacy/`](contrib/legacy/README.md) study code is frozen.

TimeFit is licensed under the [BSD 3-Clause License](LICENSE.txt).
