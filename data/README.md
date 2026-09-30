# Data catalog

## Exercise recommendation catalog

- `exercises/leetcode-catalog.metadata.json` versions the external practice
  catalog and defines its required topic coverage.
- `public/leetcode-questions.json` is the runtime catalog consumed by the
  navigation agent.
- Run `npm run validate:exercises` after changing either file. CI rejects
  duplicate IDs or URLs, untrusted hosts, unknown fields, and coverage gaps.

The repository deliberately separates three kinds of data:

| Dataset                        | Location              | Purpose                                                                                   | Source of truth                                              |
| ------------------------------ | --------------------- | ----------------------------------------------------------------------------------------- | ------------------------------------------------------------ |
| Relational demo data           | `prisma/demo-data.ts` | Local product demos and authenticated acceptance tests                                    | Versioned TypeScript manifest, loaded with `npm run db:seed` |
| Neural feedback regression set | `data/neural/`        | Stable code-review schema, split, leakage, and quality regression checks                  | `scripts/build-neural-dataset.mjs`                           |
| Benefit/evaluation scenarios   | `data/evaluation/`    | Cross-version latency, cost, grounding, navigation, emotion, and human-review comparisons | Versioned JSON scenarios and human labels                    |

The neural set contains 36 curated C++ cases: 12 error categories represented
once in each of train, validation, and test. It is a regression/evaluation
corpus, not a claim of production-scale model-training coverage. Regenerate and
validate it with:

```powershell
npm run build:dataset
npm run validate:dataset:strict
```

The relational demo set contains multiple teachers, students, classrooms,
assignments, questions, test cases, submissions, student profiles, and tutoring
conversations. It must not be mixed into neural train/test splits or real user
analytics.

Real production data must be consented, de-identified, access-controlled, and
versioned under a documented retention policy before it is admitted to any
training or evaluation corpus.
