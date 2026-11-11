# Stage G review record

## Section 1: fix known issues first (2026-09-28): done
| Run | File(s) | Summary |
|---|---|---|
| 0 | [run-0-codex-implementation.md](run-0-codex-implementation.md) | Flake reproduced (shared SQLite file), isolated per-run DB, alert classification |
| 1 | [review](run-1-claude-review.md) · [response](run-1-codex-response.md) | 119-line client guard replaced by plain `prisma generate`; legacy advisories documented; `@babel/core` refreshed |
| 2 | [review](run-2-claude-review.md) · [response](run-2-codex-response.md) | 8 more dev-tooling families refreshed lockfile-only (implemented by Claude; Codex at its usage limit) |
| 3 | [final review](run-3-claude-review.md) | Approved |

Outcome: 0 advisories in the publishable packages' production trees; 9 of 10 affected
dev-tooling families patched; `tar` 6.2.1 accepted as legacy-only. The storage test flake is
eliminated at its cause.

## Sections 2 and 4: documentation and release tooling (2026-09-29): done
| Run | File(s) | Summary |
|---|---|---|
| 0 | [implementation](sections-2-4-run-0-codex-implementation.md) | Added library docs/guides, declaration packaging, Node matrix, Changesets, Dependabot, and direct dependency license check |
| 1 | [review](sections-2-4-run-1-claude-review.md) · [response](sections-2-4-run-1-codex-response.md) | Added package metadata, corrected Changesets/CFF metadata, and tightened privacy/Dependabot wording |
| 2 | [review](sections-2-4-run-2-claude-review.md) · [response](sections-2-4-run-2-codex-response.md) | Added honest pre-release installation guidance and user-facing benchmark wording |
| 3 | [final review](sections-2-4-run-3-claude-review.md) · [response](sections-2-4-run-3-codex-response.md) | Approved; close-out documentation completed |

Outcome: library documentation, declaration tarballs, release checks, and release metadata are
ready for the first release decision. The Node 22/24 test matrix is first verified by CI on
push; section 5 retains npm scope, publishing, and first-release owner decisions.

## Section 3: project policy files (2026-09-28): done
| Run | File(s) | Summary |
|---|---|---|
| 0 | [implementation](section-3-run-0-codex-implementation.md) | Added concise project policies, contribution guidance, templates, and README links |
| 1 | [review](section-3-run-1-claude-review.md) · [response](section-3-run-1-codex-response.md) | Clean-clone Prisma setup added; Covenant made source-faithful; conduct route clarified |
| 2 | [review](section-3-run-2-claude-review.md) · [response](section-3-run-2-codex-response.md) | Added private-security-reporting notice to direct bug reports |
| 3 | [final review](section-3-run-3-claude-review.md) · [response](section-3-run-3-codex-response.md) | Approved; close-out documentation completed |

Outcome: policies, templates, and README guidance match the owner's GitHub-only reporting,
single-maintainer, and BSD 3-Clause decisions. The owner must enable GitHub private
vulnerability reporting in repository Settings → Security before the private-report links work.

Section 5 (owner release decisions) remains.
