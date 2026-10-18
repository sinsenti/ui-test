# Project documentation

Start with the [roadmap and backlog](roadmap.md). It records completed work,
the next feature, dependencies, and observable completion criteria.

| Document | Purpose |
| --- | --- |
| [Product](PRODUCT.md) | Agreed scope, audience, business facts, design direction, and constraints. |
| [Original brief](kvarta-brief.md) | Preserved assignment text. Later user decisions in the product document take precedence. |
| [Architecture](architecture.md) | Selected stack, data ownership, request flow, Telegram reliability, and environment boundaries. |
| [Lead API](api.md) | Implemented request fields, limits, responses, and persistence/duplicate behavior. |
| [Local development](development.md) | Setup, commands, database lifecycle, migrations, verification, and current tooling limits. |
| [Roadmap and backlog](roadmap.md) | One shared implementation plan, including release and deferred work. |
| [Release checklist](release.md) | Final cloud setup, deployed verification, recovery preparation, and submission evidence. |

The root [README](../README.md) is the repository entry point.
[AGENTS.md](../AGENTS.md) stays at the root so coding agents discover the shared
workflow. The root `PRODUCT.md` is a relative symbolic link to this folder's
product document because the local Impeccable skill reads that conventional
path. Edit `docs/PRODUCT.md`; there is only one copy of its content. If a checkout
does not preserve symbolic links, restore this link before using Impeccable.
The UI feature will add `docs/DESIGN.md` when fonts, tokens, and components are
implemented, with a root compatibility link if needed by the skill. There is no
implemented design-system document to move yet.

Approved mockups, their original prompts, and selection metadata stay in
`.impeccable/`; the typography reference stays in `assets/`. Their existing paths
are part of the design tooling and evidence. They are linked from the product
document rather than moved into the documentation folder.

## Keeping this useful

- Use the product document for business scope and agreed decisions, architecture
  for technical boundaries, and the roadmap for implementation status.
- Update the roadmap after a feature passes testing and review. Include a
  completion commit or actual evidence, and keep planned behavior labeled.
- Keep detailed tasks, role handoffs, and test/review logs in the conversation.
  There is no required per-feature file or committed stage log. Optional local
  `features/` notes remain ignored.
- Update setup commands with the code. Keep secrets out of docs and use
  synthetic contacts in shareable examples and evidence.
- Record measured release results only after the checks run. An unchecked box
  is planned work, not evidence that a capability exists.
