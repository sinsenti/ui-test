# Feature development workflow

Each feature is one unit of behavior carried through the complete AI workflow.
The feature brief is the shared handoff, so requirements stay attached to code,
tests, and review. This is an instruction-driven development process; there is
no automated orchestration service or application feature to deploy.

## Stages

| Stage | Responsibility | Required handoff |
| --- | --- | --- |
| Task | Coordinator defines the user outcome, scope, dependencies, and acceptance criteria. | A concrete feature brief with observable outcomes. |
| Data-modeler | Defines data ownership, schema, constraints, migrations, API boundaries, and failure behavior. | A data/API contract, or an explicit reason no data change is needed. |
| Builder | Implements the agreed behavior and preserves the approved design. | Working changes, rationale, and any deviations from the contract. |
| Test | An independent tester derives cases from the acceptance criteria and runs relevant checks. | Commands, actual results, failure reproduction, and coverage limits. |
| Review | An independent reviewer reads the requirements, code, and evidence. | Prioritized findings with file references and a pass or changes-requested verdict. |

The coordinator maintains the brief and integrates the work. A feature with no
data changes still gets a short data-modeler assessment; it does not need an
invented schema. Small changes use short handoffs. Documentation-only changes
use task and review, with other stages marked not applicable.

Test failures return to the builder, or to the data-modeler if the contract is
wrong. Review findings follow the same path. Changed behavior is retested and
reviewed before completion. Passing tests alone do not complete a feature.

## Using the workflow

1. Select the next feature whose dependencies are complete.
2. Create `features/NNN-name.md` from `_template.md` when its brief does not exist.
3. Run the task stage and record the authorized scope and acceptance criteria.
4. Hand the feature to the data-modeler, then builder, then tester, then reviewer.
5. Fix findings through the relevant stages and record actual evidence.
6. Mark the feature done and commit the completed unit.

For example, "Implement feature 001" starts the foundation feature through these
stages. A queued feature is planned work, not evidence that any stage has run.
Role sessions receive `AGENTS.md`, this workflow, the feature path, and an
explicit write scope. The reviewer has a fresh read-only view of the final diff.
When the builder fixes an issue, give the tester and reviewer the updated diff
and earlier findings rather than replacing the acceptance criteria to fit it.

## Feature order

| ID | Feature | Dependencies | Completion outcome | Status |
| --- | --- | --- | --- | --- |
| 001 | [Local foundation](001-local-foundation.md) | None | Next.js and persistent Docker PostgreSQL run locally with migrations and isolated test data. | Queued |
| 002 | Lead intake | 001 | The working form validates Belarusian phones, stores attribution, and enforces the rolling ten-minute duplicate rule under concurrency. | Queued |
| 003 | Required Telegram delivery | 002 | New leads create durable notification jobs; local simulated delivery, failures, and retries are verified. | Queued |
| 004 | Complete responsive landing page | 002, 003 | The approved cozy design governs all required sections, form states, metadata, and mobile/desktop behavior. | Queued |
| 005 | Cloud connection and release | 001–004 | Vercel, Neon, and the real Telegram bot are connected and the deployed flow is verified; handover evidence is ready. | Queued |

Only feature 001 has an expanded brief initially. Create the remaining briefs
at their task stage using the current requirements and completed dependencies.
This keeps the process proportional to the assignment's 4–6-hour target.

## Required Telegram behavior

Telegram is required for release. Its local feature uses a simulated transport
so development and tests remain offline. The real bot token and destination chat
are configured in feature 005, after local work is complete.

- The database remains the source of truth for received leads.
- Save a lead and a `notification_outbox` job in the same transaction, together
  with the duplicate guard. Failed persistence creates neither a received lead
  nor a notification. A duplicate submission creates no additional job.
- Attempt delivery promptly after commit with a bounded timeout. The form can
  report that the lead was received once the database commit succeeds.
- Persist job status, attempts, next eligible attempt, and safe failure details.
  Concurrent dispatchers must claim jobs atomically and recover abandoned claims.
- Retry transient failures with backoff and honor Telegram's `retry_after`.
  Keep terminal failures visible and support an operator retry after correction.
- Include the lead ID, name, phone, interest, product context, comment, and useful
  attribution in a readable message. Use plain text or correctly escaped content
  within Telegram's length limit. Keep credentials out of messages and logs.
- Prevent concurrent normal dispatch of the same job. Delivery is at least once:
  an ambiguous network timeout can produce a repeated Telegram message. Do not
  promise exactly-once delivery across PostgreSQL and the external API. A stable
  lead ID lets a manager recognize such a repeat.

The small-project default is a prompt first attempt through Next.js `after()`,
retries of due jobs on subsequent lead requests, a protected manual retry path,
and a daily recovery cron at release. Limit work per invocation and persist
anything unfinished; an in-process callback alone is not a durable queue.

Vercel Hobby currently limits each cron schedule to once per day and does not
guarantee precise timing. Accordingly, this default offers immediate normal
delivery but no rapid recovery guarantee during an outage. Recheck the limits
at release; a faster guaranteed retry schedule would be a separate architecture
decision, not an assumed free platform capability.

Sources checked on 2026-10-18:

- [Telegram sendMessage](https://core.telegram.org/bots/api#sendmessage)
- [Telegram response parameters](https://core.telegram.org/bots/api#responseparameters)
- [Next.js after](https://nextjs.org/docs/app/api-reference/functions/after)
- [Vercel cron limits](https://vercel.com/docs/cron-jobs/usage-and-pricing)

## Release completion

The final feature includes account/project setup, environment separation, local
PostgreSQL/Neon version alignment, migrations, deployment, bot/chat configuration,
and a real test notification using a synthetic lead. Local mock delivery does
not satisfy that last check. Reviewers verify that preview testing cannot insert
production leads or send to the production chat.

Finish with mobile Lighthouse evidence, a concise README, incremental commits,
the live URL and repository link, and an authentic session export or key
screenshots. Keep actual stage notes as supporting evidence throughout the work.

## Workflow definition review

The workflow documentation was independently reviewed on 2026-10-18 by
`/root/workflow_review`; verdict: pass, with no material findings. Local Markdown
links and `git diff --check` also passed. Runtime tests are not applicable to
this documentation change. All implementation features above remain queued.
