# Kvarta development instructions

## Sources of truth

- Read `PRODUCT.md` and the relevant feature brief before work.
- `kvarta-brief.md` supplies business facts; `PRODUCT.md` records subsequent user
  decisions, including required Telegram notifications and cloud setup last.
- The approved design baseline is
  `.impeccable/mocks/decision/cosy-pack.png`. Preserve it when implementing UI;
  use the local Impeccable skill for frontend work.

## Feature workflow

For implementation, follow `task -> data-modeler -> builder -> test -> review`.
The procedure, feature order, and handoff requirements are in
`features/README.md`. Use `features/_template.md` to create each feature brief.

The coordinating agent owns the feature brief, scope, stage transitions, and
final integration. It may act as the builder. This workflow explicitly permits
delegating the data-modeler, builder, tester, and reviewer roles to sub-agents.
Use separate sessions for testing and review when available so they assess the
actual requirements and diff independently. Reuse a role session for fixes to
the same feature; do not reuse unrelated asset-generation sessions.

Stages with handoff dependencies run sequentially. Default to one active feature.
Parallel work is appropriate only for independent tasks with clear file ownership.
Agents share the workspace: assign write scopes and avoid overlapping edits.
Reviewer sessions are read-only and return findings to the coordinator.

Every handoff includes the feature path, role, goal, allowed files, relevant
contracts, current changes, and actual evidence. A role must read the feature
and source rather than rely only on the previous role's summary. If separate
sessions are unavailable, use the roles sequentially and record that limitation.

Do not request approval between routine stages. Ask only for missing product
decisions, external access when needed, or a consequential scope change. Route
findings back to the relevant role, then rerun the affected tests and review.

Documentation-only changes can use task and review directly; mark data modeling
and runtime tests not applicable when no runtime behavior changes.

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
have actually run, material review findings are resolved, and the brief records
the evidence and remaining limits. A simulated external service verifies local
behavior; real service verification remains an explicit release criterion.

Keep incremental commits. Record genuine prompts, decisions, corrections, test
results, and review findings in the feature brief. These notes supplement the
authentic session export or screenshots required for submission; never fabricate
or claim to have captured evidence that is unavailable.
