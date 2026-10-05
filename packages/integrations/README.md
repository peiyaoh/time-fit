# @time-fit/integrations

Injected delivery Actions for `@time-fit/core`. Import only the provider subpath needed by
your application; there is deliberately no package-root barrel, so importing desktop cannot
load Twilio or Mailjet code.

```js
import notifier from "node-notifier";
import { desktopNotificationAction } from "@time-fit/integrations/desktop";

const action = desktopNotificationAction({ notifier, title: "TimeFit" });
```

`notifier.notify(options, callback)` may return a promise, which the action awaits. Any other
return value is treated as a handle (node-notifier returns the notifier itself), and the action
completes when the callback is called. A callback error fails the decision. The action passes
`wait: true`, so node-notifier calls back after the user acts or after about 5 seconds, well
within the engine's default 30-second plugin timeout. A notifier that neither returns a promise
nor calls back ends as `plugin-timeout`.

The application constructs vendor clients and passes them to `twilioSmsAction` or
`mailjetEmailAction`. This package does not import vendor SDKs, read environment variables, or
own credentials. Mailjet receives `ctx.decisionId` as `CustomID`; Twilio's Messages API has no
idempotency field, so the adapter records the decision ID in its returned delivery metadata but
does not claim provider-level duplicate suppression. A pre-aborted `ctx.signal` prevents a
request; these SDK method shapes do not expose an abort signal for an in-flight request.

## Recipients

`twilioSmsAction` reads the phone number at `phonePath` (default `"phone"`) and
`mailjetEmailAction` reads the email address at `emailPath` (default `"email"`). Both paths are
dotted own-property paths into the participant the engine passes to the action. The defaults suit
flat participants such as `{ id, timeZone, phone }`. `@time-fit/storage-prisma` nests custom
fields under `attributes`, so with it use:

```js
twilioSmsAction({ client, from: "+15550001", phonePath: "attributes.phone" });
mailjetEmailAction({ client, from: { email: "study@example.org", name: "Study" }, emailPath: "attributes.email" });
```

If the value at the path is missing or blank, the decision fails with
`missing-phone-destination` or `missing-email-destination`, and nothing is sent.

## Results and errors

Each factory returns a frozen core Action. Missing participant destinations return a typed
ActionResult error rather than throwing; provider exceptions become `{ ok: false, error }` with
code `twilio-send-failed` or `mailjet-send-failed` and the provider's message. That message is
stored in the decision record, so exact copies of the recipient's phone number or email address
in it are replaced with `[recipient]`. This is exact matching only: a copy that differs in case
or formatting, and any other provider text, is kept as received. The engine bounds the stored
message to 1,024 characters.
