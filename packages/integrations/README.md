# @time-fit/integrations

Injected delivery Actions for `@time-fit/core`. Import only the provider subpath needed by
your application; there is deliberately no package-root barrel, so importing desktop cannot
load Twilio or Mailjet code.

```js
import notifier from "node-notifier";
import { desktopNotificationAction } from "@time-fit/integrations/desktop";

const action = desktopNotificationAction({ notifier, title: "TimeFit" });
```

The application constructs vendor clients and passes them to `twilioSmsAction` or
`mailjetEmailAction`. This package does not import vendor SDKs, read environment variables, or
own credentials. Mailjet receives `ctx.decisionId` as `CustomID`; Twilio's Messages API has no
idempotency field, so the adapter records the decision ID in its returned delivery metadata but
does not claim provider-level duplicate suppression. A pre-aborted `ctx.signal` prevents a
request; these SDK method shapes do not expose an abort signal for an in-flight request.

Each factory returns a frozen core Action. Missing participant destinations return a typed
ActionResult error rather than throwing; provider exceptions become `{ ok: false, error }`.
