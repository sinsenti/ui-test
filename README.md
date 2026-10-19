# Кварта

Landing page for a fictional Minsk coffee roastery. The local Next.js + TypeScript
and Docker PostgreSQL 17 foundation is complete (`f44feb7`). Lead intake and local
notification delivery passed independent testing and review. The worker includes
an offline simulator, leases, backoff, and protected recovery. The responsive
landing page uses the approved cosy design with local imagery/fonts and one
shared callback form.
The user has approved the interface. The current build's local Lighthouse
performance is 99 mobile (median of three runs) and 100 desktop; all four runs
scored 100 for accessibility, best practices and SEO. See the
[measurement conditions and reports](docs/development.md#visual-and-performance-evidence).
Vercel + Neon setup comes last.

## Run locally

Use Node.js 24, npm 11+, and Docker with Compose v2+. From the repository root,
copy the environment example on first setup only:

```sh
npm ci
cp .env.example .env.local
npm run db:up
npm run db:migrate
npm run db:check
npm run dev
```

Open http://127.0.0.1:3000. The initial dependency/image downloads need internet;
subsequent development uses cached local resources. Run `npm run check` for lint,
types, isolated PostgreSQL/API/browser integration tests, and a production build.
Install Chromium once with `npx playwright install chromium` before the checks.
`npm run db:down` preserves local data; adding `--volumes` erases it.

## Documentation

- [Roadmap and backlog](docs/roadmap.md) — status, feature order, work to do, and acceptance criteria.
- [Documentation index](docs/README.md) — product, original brief, architecture, development, and release checklist.
- [Development guide](docs/development.md) — all commands, migrations, environment variables, and known tooling limits.
- [Lead API](docs/api.md) — request fields, responses, attribution, and duplicate protection.
- [Notification operations](docs/development.md#notification-operations) — simulator settings, delivery state, and protected retries.
- [AI workflow](AGENTS.md) — task → data-modeler → builder → test → review.

The user selected the original
[cosy-pack.png](.impeccable/mocks/decision/cosy-pack.png) composition. Detailed tasks
and role handoffs stay in the conversation; the shared roadmap tracks progress.
The foundation used an AI builder with separate data-model, test, and review
sessions. The final contribution note, release evidence, mobile Lighthouse
measurement, and remaining product limitations will be recorded when implemented.
