# Stage G section 3 review: run 1 (Claude)

**Reviewed:** `882fc13`.
**Verdict:** concise and faithful to the owner decisions: a single maintainer (@peiyaoh),
GitHub private reporting, no email anywhere (checked: no address in any new file). Security
scope excludes `contrib/legacy`, and no SLA is promised. The Code of Conduct matches the
official Contributor Covenant 2.1 paragraph for paragraph; I diffed it against the upstream
text. Two findings would mislead people, and one is cosmetic.

## Findings

### S1 (important): CONTRIBUTING's commands fail on a clean clone
`CONTRIBUTING.md` (and the PR checklist) list `yarn install --immutable` then `yarn test`. CI
has a step between them, `yarn prisma generate --schema contrib/legacy/prisma/schema.prisma`,
because the legacy suites import `@prisma/client`, which throws at import time until that
client exists. That is exactly why CI never passed before the step was added (see the
progress log, "CI finding"). A contributor following CONTRIBUTING on a fresh clone would see
the legacy suites fail. **Ask:** add that command to the setup block, in the same order as
CI, and give it a one-line reason. The PR checklist can keep listing checks only.

### S2 (important): conduct reports are routed to the security-advisory form without saying so
The Covenant's contact line links to `/security/advisories/new`. That URL is GitHub's private
*vulnerability* form: it creates a draft security advisory, and it only exists once the owner
enables private vulnerability reporting. Given the owner's "no email" decision, it is also
the only private channel GitHub offers to reach a maintainer, so reusing it is defensible.
The text just has to say so honestly. **Ask:** reword the contact as something like
"privately through this repository's
[private reporting form](...), which also accepts conduct reports", and add one sentence
that abusive content on GitHub itself can also be reported to GitHub using "Report content".
Do not add an email.

### S3 (minor): make the Covenant byte-faithful
Two paragraphs use curly apostrophes (’) where upstream uses straight ones ('), and the
attribution uses inline links instead of upstream's reference-style links. Restore the
upstream text exactly, except for the filled contact placeholder, so "verbatim" is literally
true and future diffs against upstream stay clean.

## Not requested
No further templates, no CODEOWNERS, no bots. The files are appropriately short.
