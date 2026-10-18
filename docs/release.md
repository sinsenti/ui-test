# Release checklist

This is a future checklist for F5, not a record of a configured cloud deployment.
As of 2026-10-18, the local foundation, lead intake, and simulated notification
delivery are implemented. Keep cloud account/project
setup and the real Telegram bot connection until the earlier local features pass.
See the [roadmap](roadmap.md) for dependencies and [architecture](architecture.md)
for environment and reliability decisions.

## 1. Local readiness

- [ ] F2–F4 acceptance criteria pass with actual independent test/review evidence.
- [ ] `npm ci` and `npm run check` pass with the current lockfile. Run the browser
  checks added by F4; record their actual commands and results.
- [ ] Inspect a local production build at phone and desktop sizes; fix material
  functional, accessibility, visual, and performance findings.
- [ ] Confirm all required content, prices, contact facts, fonts, and asset provenance.
- [ ] Review dependency advisories, including the foundation's development-only
  lint dependency issue, and document any remaining limitation with a dated result.
- [ ] Recheck the submission deadline from the original brief: Monday 19 October,
  18:00 Moscow. This checklist is a work sequence, not an estimate or extension.

## 2. Provider and environment setup

- [ ] Recheck actual Vercel and Neon free-plan limits/eligibility and PostgreSQL 17
  support. Earlier quoted free allowances are not a current guarantee.
- [ ] Create the Vercel application and Neon database only now. Choose compatible
  nearby regions and record the non-secret project/environment mapping here.
- [ ] Configure production runtime with the pooled Neon `DATABASE_URL` and migration
  execution with `DATABASE_URL_DIRECT`. Use supported TLS and keep URLs private.
- [ ] Create an isolated Neon preview/development branch and separate preview
  variables. Preview must never inherit the production database or chat target.
- [ ] Select the bot/chat for real delivery, configure the implementation's actual
  server-only secrets, and use a mock or separate test destination in preview.
  Set production `TELEGRAM_TRANSPORT=telegram`, `TELEGRAM_BOT_TOKEN`, and
  `TELEGRAM_CHAT_ID` explicitly; simulation marked `sent` is not real delivery.
- [ ] Configure the protected retry path and daily recovery trigger using F3's
  authentication contract. Verify the then-current scheduler frequency/timing limit.
  Use `CRON_SECRET` for the authenticated `GET /api/notifications/drain` cron and
  the [manual procedure](development.md#notification-operations); no scheduler is
  deployed yet. Verify one bounded batch per invocation meets the operational need.
- [ ] Update `.env.example` with placeholders for every required variable and
  document actual runtime, retry, and transport settings in the development guide.
- [ ] Set `SITE_URL` to the real public HTTPS origin before building/deploying;
  verify absolute Open Graph/Twitter image URLs on the deployed page. Rebuild
  after changing this variable.
- [ ] Check the Vercel Node.js runtime and database pool lifecycle/connection budget.
  Confirm no secret is exposed via a public environment variable, page, or response.

## 3. Migrate and deploy

- [ ] Verify the target database/environment explicitly before executing migrations.
  For an existing database, establish a backup/restore option first and record it.
- [ ] Apply `npm run db:migrate` using the target's direct URL in a controlled
  environment. Do not run migrations from a page build or request handler.
- [ ] Verify migration history and required schema. Keep existing migration files
  immutable; prefer an additive repair migration for a shared deployed database.
- [ ] Deploy the reviewed commit and record its SHA and live URL in this checklist.
- [ ] Confirm the production server can access PostgreSQL and keeps lead/outbox
  data across an application restart or redeployment. Preserve pending jobs.
- [ ] Exercise an application rollback/redeployment plan without treating database
  rollback as automatically safe. `db:rollback` may destroy data and is not a
  substitute for restore planning.

## 4. Verify the deployed flow

Use synthetic contact data for verification and redact credentials and personal
details from shared reports. Real integration verification requires internet and
the configured service; simulated tests do not satisfy these items.

- [ ] Submit through the production page and verify exactly one persisted lead
  and outbox job, with product context and attribution.
- [ ] Verify one real notification in the intended Telegram chat with that lead's
  stable ID; confirm stored delivery state matches the observed result.
- [ ] Repeat the same number inside ten minutes and test concurrent submissions:
  no extra lead or job. Invalid numbers create neither.
- [ ] Exercise delivery failure/recovery safely, using preview or a controlled
  test target where appropriate. Verify a saved lead still shows success and
  due/abandoned jobs can recover. Record which environment was actually tested.
- [ ] Verify authenticated recovery works and unauthenticated attempts are rejected.
  Record the scheduled trigger configuration and its observed result when run;
  configuring a schedule alone does not prove that it executed.
- [ ] Submit in preview and confirm it uses its own database and mock/test chat,
  with no production writes or production messages.
- [ ] Verify form pending, saved, duplicate, invalid, network failure, and retry
  behavior without losing input. Confirm browser attribution capture end to end.
- [ ] Inspect phone/desktop layouts, keyboard/focus behavior, social metadata/image,
  and image/font loading on the live URL.
- [ ] Run mobile Lighthouse on the deployed URL, retain the actual report or
  screenshot and test conditions, and fix material findings. Report the real score.
- [ ] Ensure logs are useful without containing tokens, database URLs, or visitor
  phone numbers/comments. Record how an operator checks pending/failed jobs.

## 5. Operating notes and submission

- [ ] Add the actual protected retry procedure, pending/failed-job inspection,
  credential rotation, backup/restore path, and responsible operator to these docs.
  Confirm a retention/deletion practice before collecting real contacts.
- [ ] State the actual recovery limit: prompt normal delivery, durable retry state,
  possible repeated Telegram messages, and no rapid outage recovery guarantee
  under the selected daily schedule.
- [ ] Finalize the concise root README: choices/assumptions, human versus AI work,
  a real caught mistake and correction, and honest unfinished work or limitations.
- [ ] Confirm the repository has coherent incremental commits, no secrets, and the
  access required by the assignment recipient.
- [ ] Prepare one package containing the live URL, repository URL, authentic AI
  session export or key screenshots, and mobile Lighthouse evidence. Do not
  fabricate missing exports or replace actual evidence with reconstructed logs.
- [ ] Update the roadmap only after release verification and final review pass.

The user sends the prepared submission unless they explicitly authorize sending
it. No submission message is sent as part of this planning task.

## Results to fill at release

| Evidence | Actual result |
| --- | --- |
| Reviewed/deployed commit | Pending |
| Production URL and repository access | Pending |
| Production/preview isolation check | Pending |
| Applied migration history and persistence check | Pending |
| Real Telegram delivery and recovery check | Pending |
| Scheduler execution evidence | Pending |
| Deployed mobile Lighthouse report and conditions | Pending |
| Authentic AI work evidence | Pending |
| Known limitations and operating owner | Pending |
