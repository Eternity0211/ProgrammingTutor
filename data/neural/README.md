# Neural Recommendation Data

This folder includes datasets used by the neural recommendation modules.

## exercises.csv

`exercises.csv` is the retrieval knowledge base used by `src/server/model/neural/navigationAgent.ts`.

Columns:

- `id`: stable exercise identifier.
- `title`: short exercise title.
- `knowledge_points`: semicolon-separated concepts, for example `binary search;arrays`.
- `question_stem`: short problem statement used as retrieval text.
- `difficulty`: `EASY`, `MEDIUM`, or `HARD`.
- `source`: source platform or contest.
- `source_url`: source link for grounded references.

### Notes

- Keep `id` unique and stable.
- Keep `knowledge_points` concise and normalized.
- Add trusted public links in `source_url` to reduce recommendation hallucination risk.
