# 001 — Local foundation

Status: queued
Current stage: task
Dependencies: none

## Task

User outcome: develop and test Kvarta locally without cloud access after the
initial dependency and Docker image downloads.

Authorized scope: initialize Next.js App Router with TypeScript and npm, Node.js
24 configuration, CSS Modules support, Docker Compose PostgreSQL, `pg`, versioned
SQL migrations, environment examples, and the initial meaningful check commands.
Use `node-pg-migrate` for SQL migrations. Keep the approved design assets intact.

Out of scope: full landing-page implementation, lead business logic, real
Telegram calls, cloud account setup, and deployment. Those have later features.

Acceptance criteria:

- [ ] A fresh checkout has documented commands for dependency installation,
  database startup, migrations, development, and verification.
- [ ] Next.js runs on the host and opens locally using Node.js 24 and npm.
- [ ] Docker PostgreSQL has a health check and persistent named volume; a
  synthetic record survives a database container restart.
- [ ] App database connectivity is verified through the shared server-side `pg`
  module. Credentials stay server-side and outside Git.
- [ ] The migration runner applies a meaningful initial migration once and
  safely reports no pending changes on a second run.
- [ ] Integration checks use a separate disposable test database, with a guard
  against accidentally targeting the development or a remote database.
- [ ] Runtime and build do not require remote font/image fetches or cloud
  credentials. The initial download requirement is documented.
- [ ] Existing product context, brief, skills, and approved mockup are preserved.
- [ ] Type checking, linting, relevant integration verification, and a production
  build have actually run, with results recorded below.

The data-modeler should choose a minimal useful initial schema boundary and
leave lead-specific modeling to feature 002. If only migration infrastructure
belongs here, verify it in the disposable database with a fixture migration;
do not add production domain tables purely to make the check pass.

## Data-modeler handoff

Status: not started

## Builder handoff

Status: not started

## Test evidence

Status: not started

## Review

Status: not started
Verdict: pending

## Completion and authentic AI work notes

This file records the planned foundation feature. No implementation, runtime
test, or feature review has been completed yet.
