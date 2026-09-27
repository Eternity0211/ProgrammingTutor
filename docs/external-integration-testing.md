# Real service integration tests

The default test suite never requires external services. Real PostgreSQL, Neo4j,
and Judge0 checks are opt-in so local development and pull requests remain
deterministic.

Run them locally after the three services are available and `.env` contains
their connection settings:

```sh
npm run services:wait
npm run test:integration:external
```

The command verifies a real SQL query, a real Cypher query, and a real C++
compile/run request. It fails fast when a required connection variable is
missing.

GitHub Actions starts isolated PostgreSQL, Neo4j, and Judge0 containers, applies
all Prisma migrations, and then runs the same checks. It runs weekly and can be
started manually through the **Quality** workflow's `run_external` input. The CI
containers use disposable CI-only credentials, so no repository secrets or
publicly reachable databases are required. Container logs are printed on every
run and all CI volumes are deleted afterwards.

The local Compose stack keeps database volumes between restarts. It exposes the
application PostgreSQL service on port `5173`, Neo4j on `7474`/`7687`, and
Judge0 on `2358`. The application may also use a separately installed
PostgreSQL instance through `DATABASE_URL`; Compose never modifies that database
unless you explicitly run Prisma migrations against its URL.
