# Privacy guidance

This is technical guidance, not legal advice. Applications decide their own consent, retention,
access control, security review, and jurisdiction-specific obligations.

For each recorded decision, TimeFit stores identifiers and scheduling metadata: decision/tick,
participant or system scope, task/version/checkpoint, scheduled/evaluated timestamps and zone,
availability and condition results, randomization, state, and terminal delivery or error. Plugin
evidence and delivery payloads are capped at 8 KB serialized; oversized or unserializable values
become markers. An optional application `snapshot(participant)` hook can add an explicitly
chosen snapshot, subject to the same cap. See [ADR 0004](../adr/0004-decision-record-identity-delivery.md) and
[ADR 0009](../adr/0009-stage-c2-engine-clarifications.md).

The engine does **not** serialize the participant object. It passes the copied, frozen object to
plugins only. Avoid returning unnecessary personal data in plugin evidence, delivery metadata, or
the snapshot hook. `logUnavailable: false` avoids storing unavailable eligible decisions; it
trades MRT completeness for less stored data.

Structured logs carry correlation IDs such as `tickId`, `decisionId`, task ID, and participant
ID. Warning and error events can include capped condition evidence and error messages, so plugins
must keep evidence free of personal data. Configure the application logger and its retention/access
controls accordingly; plugin errors may include stack traces. Error codes, messages, and stacks the
engine stores or logs are bounded (128, 1,024, and 4,096 characters; see
[ADR 0013](../adr/0013-pre-release-engine-contract-fixes.md)). The supplied Twilio and Mailjet
actions replace exact copies of the recipient's phone number or email address in provider error
messages with `[recipient]`. Other provider text, and recipient copies that differ in case or
formatting, are stored as received. The memory store retains bounded, short-lived records and is not a
research-data store.

Before deployment, define informed consent and a data inventory; set retention/deletion rules;
restrict participant and decision-log access; secure logs, adapters, and provider credentials;
and review which plugin and snapshot fields can identify people.
