# Kvarta development instructions

## Sources of truth

- Read `docs/PRODUCT.md`, `docs/roadmap.md`, and the current task from the
  conversation before work. `docs/README.md` is the documentation index.
- `docs/kvarta-brief.md` supplies business facts; `docs/PRODUCT.md` records subsequent user
  decisions, including required Telegram notifications and cloud setup last.
- Technical boundaries live in `docs/architecture.md`, local commands in
  `docs/development.md`, and final release gates in `docs/release.md`.
- Keep project documentation under `docs/`. Root `README.md` remains the entry
  point and `AGENTS.md` remains discoverable agent guidance. Root `PRODUCT.md`
  is a symbolic link to `docs/PRODUCT.md` for Impeccable compatibility; edit the
  document in `docs/`, preserving the link. When the UI feature establishes
  `DESIGN.md`, keep its content under `docs/` and provide the same root link if
  required by Impeccable. Design-tool artifacts stay under `.impeccable/` and
  assets keep their existing paths.
- The approved design baseline is
  `.impeccable/mocks/decision/cosy-pack.png`. Preserve it when implementing UI;
  use the local Impeccable skill for frontend work.

## Feature workflow

For implementation, follow `task -> data-modeler -> builder -> test -> review`.
Keep task definitions and handoffs in the conversation and agent messages.
Per-feature files, templates, and stage logs are not required. Optional scratch
notes may live under `features/`, which is ignored by Git; the workflow must work
from a fresh checkout without those local notes.

| Stage | Responsibility | Handoff |
| --- | --- | --- |
| Task | Define the user outcome, scope, dependencies, and observable acceptance criteria. | A concise task description. |
| Data-modeler | Define data ownership, schema, constraints, migrations, API boundaries, and failure behavior. | A data/API contract, or a reason no data change is needed. |
| Builder | Implement the agreed behavior and preserve the approved design. | Working changes, rationale, and contract deviations. |
| Test | Derive cases independently from the acceptance criteria and run relevant checks. | Actual commands, results, reproduction steps, and coverage limits. |
| Review | Read the requirements, code, and evidence independently. | Prioritized findings with file references and a pass or changes-requested verdict. |

The coordinating agent owns task context, scope, stage transitions, and
final integration. It may act as the builder. This workflow explicitly permits
delegating the data-modeler, builder, tester, and reviewer roles to sub-agents.
Use separate sessions for testing and review when available so they assess the
actual requirements and diff independently. Reuse a role session for fixes to
the same feature; do not reuse unrelated asset-generation sessions.

Stages with handoff dependencies run sequentially. Default to one active feature.
Parallel work is appropriate only for independent tasks with clear file ownership.
Agents share the workspace: assign write scopes and avoid overlapping edits.
Reviewer sessions are read-only and return findings to the coordinator.

Every handoff includes the role, goal, acceptance criteria, allowed files,
relevant contracts, current changes, and actual evidence. Give each role enough
task context directly; do not depend on an ignored local file. A role must read
the source and original requirements rather than rely only on the previous
role's conclusions. If separate sessions are unavailable, use the roles
sequentially and disclose that limitation in the conversation.

Do not request approval between routine stages. Ask only for missing product
decisions, external access when needed, or a consequential scope change. Route
findings back to the relevant role, then rerun the affected tests and review.

Documentation-only changes can use task and review directly; mark data modeling
and runtime tests not applicable when no runtime behavior changes.

## Implementation plan and status

Use `docs/roadmap.md` as the shared backlog and source of implementation order,
dependencies, acceptance criteria, and completion status. Update it after a
feature passes its completion checks, referencing the actual commit or evidence.
Keep detailed task definitions, stage logs, and handoffs in the conversation;
the roadmap does not require a committed file per feature. Keep architecture,
development, and release docs aligned with the implemented changes and clearly
label planned behavior.

## Local-first development

- Node.js 24 + npm; Next.js runs on the host.
- PostgreSQL runs in Docker Compose with a named volume. Keep its major version
  aligned with Neon when the production project is created.
- Use `pg` for both local PostgreSQL and Neon; parameterize SQL.
- Use versioned SQL migrations. Tests use a separate disposable database.
- Store fonts and imagery locally so development works offline after downloads.
- Use a simulated Telegram transport locally. Tests never contact the real bot.
- Keep secrets in ignored environment files. Commit placeholders in
  `.env.example`; do not put bot tokens or database credentials in briefs/logs.

Cloud provisioning and real Telegram configuration belong to the final release
feature, after local implementation, tests, and review. Do not make cloud setup
a prerequisite for earlier features.

## Completion and evidence

A feature is done only when its acceptance criteria are met, meaningful checks
have actually run, material review findings are resolved, and the conversation
reports the evidence and remaining limits. A simulated external service verifies local
behavior; real service verification remains an explicit release criterion.

Keep incremental commits for code, tests, migrations, and durable project
instructions. Do not stage per-feature scratch notes or force-add ignored files.
Preserve genuine prompts, decisions, corrections, test results, and review
findings through the conversation and actual tool outputs. These supplement the
authentic session export or screenshots required for submission; never fabricate
or claim to have captured evidence that is unavailable.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
