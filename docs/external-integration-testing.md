# Real service integration tests

The default test suite never requires external services. Real PostgreSQL, Neo4j,
and Judge0 checks are opt-in so local development and pull requests remain
deterministic.

Run them locally after the three services are available and `.env` contains
their connection settings:

```sh
npm run test:integration:external
```

The command verifies a real SQL query, a real Cypher query, and a real C++
compile/run request. It fails fast when a required connection variable is
missing.

GitHub Actions exposes the same checks through the **Quality** workflow's
`run_external` manual input. Configure these repository secrets before enabling
it: `DATABASE_URL`, `NEO4J_URI`, `NEO4J_USER`, `NEO4J_PASSWORD`, and
`JUDGE0_API_URL`. `JUDGE0_API_KEY` and `JUDGE0_API_HOST` are only required for
an authenticated external Judge0 provider.
