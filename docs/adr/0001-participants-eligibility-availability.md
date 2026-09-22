# ADR 0001: Participants, eligibility, availability

## Context
The legacy engine assumes one study's user model: `username`, `timezone`,
`groupMembership`, and wake/bed fields (`TaskExecutor.js:43-49, 238-254, 353-397`). It also
invents a fake "system user" for participant-independent tasks (`TimeEngine.js:20-28`).
MRT analysis must distinguish people **outside** a task's population from people **inside**
it who were not available at a decision point.

## Decision
1. **Participant shape.** Core reads exactly two fields:
   `{ id: string, timeZone: string }`. Everything else is opaque. It is passed to plugins and
   the preference resolver unchanged, and never serialized by core.
   - `id`: non-empty, ≤ 256 chars. A participant without a valid `id` is skipped and logged
     as `participant-invalid` (no decision can be keyed without it).
   - `timeZone`: must be a valid **IANA name** (see ADR 0005 §1). An invalid zone means no
     occurrence can be computed, so the participant is skipped for participant-scoped tasks
     and logged as `participant-invalid-timezone`, with a per-tick count in the tick summary.
     No decision record is written, because no decision point exists.
     *(This refines the plan's earlier "unavailable with reason invalid-timezone": an
     unavailable record needs a `scheduledAt`, and there is none without a zone.)*
2. **Scopes.** `scope: "participant"` tasks are evaluated per participant.
   `scope: "system"` tasks are evaluated once per occurrence, with no participant, in the
   task's own required `timeZone`.
3. **Eligibility (no record).** In order:
   - `task.enabled !== false`;
   - `activeFrom ≤ scheduledAt < activeUntil` (either bound optional);
   - `task.eligibility` filter, participant scope only:
     - `participantIds?: string[]`: participant id must be listed (≤ 10,000 ids);
     - `attributes?: { mode: "all" | "any", match: { [dottedPath]: primitive[] } }`: reads
       `participant[path]` and tests membership in the allowed list. `all` = every path
       matches; `any` = at least one matches. At most 50 paths.

   Ineligible → **no record, no log per participant** (only tick-summary counts).
4. **Availability (recorded).** For eligible (participant, occurrence) pairs, the
   precondition tree (ADR 0006) is evaluated. Available or not, the outcome is recorded
   (ADR 0004), unless the task sets `logUnavailable: false`.
5. **Snapshot.** Records store plugin `evidence` and, if the app configures
   `snapshot(participant) → object` (≤ 8 KB serialized), that snapshot. Core never stores
   the participant object itself.

## Consequences
- The built-in "group" and "phase" filters from the plan collapse into one generic
  `attributes` matcher. Legacy `group.type = "group"` (any group matches) maps to
  `mode: "any"` over `groupMembership.<name>` paths (ADR 0006).
- A developer with a different participant model needs only an `id` and a `timeZone`.
