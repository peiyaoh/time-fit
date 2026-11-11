# Stage G section 3 review: run 3 (Claude, final)

**Reviewed:** `f93f64c` and all of section 3 (`c0e5212..f93f64c`).
**Verdict: approve section 3.** S4 was integrated as a single line. No further content changes.

## What section 3 delivered
- `CONTRIBUTING.md`: setup in CI's exact order (including the legacy Prisma client, verified
  from a fresh clone: 458 tests pass), every CI check, the frozen-legacy rule, ADR-only design
  changes, and BSD 3-Clause for contributions.
- `CODE_OF_CONDUCT.md`: Contributor Covenant 2.1, identical to upstream except the contact
  line, which honestly names GitHub's private reporting form.
- `SECURITY.md`: private reporting only, no email, no SLA; scope is the three publishable
  packages, and legacy code is excluded.
- `GOVERNANCE.md`: single maintainer (@peiyaoh), with a path to adding maintainers.
- Issue templates (bug, feature; blank issues disabled; security contact link), a PR checklist,
  and a README "Contributing" section.

All of it follows the owner's decisions. No email address appears anywhere.

## Scorecard
| Round | Findings | Outcome |
|---|---|---|
| 1 | S1 clean-clone setup missing legacy Prisma generation; S2 conduct route not labeled; S3 Covenant not byte-faithful | S1, S3 integrated; S2 partially. **Pushback accepted:** no extra "Report content" sentence, to keep the Covenant verbatim |
| 2 | S4 bug template lacks the private-security notice | integrated |
| 3 | final review | approved |

## Close-out requested from Codex
1. Add a **Section 3** entry to `docs/stage-g-review/README.md` (runs 0–3 with links, one line
   each, plus the outcome), in the same format as the Section 1 entry.
2. Update the Stage G status in `docs/jitai-library-plan.md`: sections 1 and 3 are done;
   sections 2, 4, and 5 remain.
3. Add a closing bullet to the Stage G section 3 progress entry, including the **owner
   action**: enable GitHub private vulnerability reporting (repo Settings → Security). Until
   then, the links in SECURITY.md, the Code of Conduct, and the issue chooser lead to a page
   that is not available.
