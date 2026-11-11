# ADR 0012: License is BSD 3-Clause

**Status:** Accepted (2026-09-28). **Supersedes:** the `license: MIT` item of ADR 0007
("Every published package declares ... `license: MIT`"). The rest of ADR 0007 stands.

## Context
The repository's `LICENSE.txt` has always been the BSD 3-Clause License, Copyright (c) 2025,
The Regents of the University of Michigan, The Mobile Intervention Architecture (MIA)
Collaborative. The README states the same. Stage 1 of the earlier refactor set the root
`package.json` to `"license": "MIT"`, and ADR 0007 carried MIT forward to the new packages. A
published package cannot declare one license while shipping the text of another.

## Decision
The project owner chose **BSD 3-Clause** (2026-09-28), matching `LICENSE.txt`.
- Every tracked `package.json` declares the SPDX identifier `"license": "BSD-3-Clause"`. That
  covers the root, the three publishable packages, `apps/take-a-break`, `examples/prisma`, and
  the quarantined `contrib/legacy/*` packages.
- Each publishable package (`packages/core`, `packages/storage-prisma`, `packages/integrations`)
  carries a verbatim copy of `LICENSE.txt` as `LICENSE`. npm includes it in the tarball
  automatically, and BSD 3-Clause requires that redistributions retain the copyright notice.

## Consequences
- Stage G's license scan and publish dry run check for BSD-3-Clause.
- If `LICENSE.txt` changes (for example, the copyright year), the three package copies must be
  updated in the same commit.
