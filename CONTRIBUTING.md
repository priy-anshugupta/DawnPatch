# Contributing to DawnPatch

Start with `npm ci`, `npm run browser:install`, and a local `.env` copied from the example. Use Node 22.22 or newer when possible. Run `npm run dev` for frontend/API development or `npm run build` followed by `npm start` for the built workbench.

## Changes and verification

- Keep changes focused on a concrete issue and explain the before/after behavior.
- Run `npm run build` and `npm test`. Run `npm run test:e2e` for investigation, API, or UI changes.
- Browser fixture tests use clearly labeled reference repairs. Evaluate model changes using actual Gemma inference and report failed cases too.
- For durable-workflow changes, exercise `npx tsx scripts/temporal-recovery.ts` with the local API and Temporal service running.
- Add or update documentation when environment settings, verification scope, or setup requirements change.

## Invariants to preserve

Original repositories are never edited in place. Model output is data, not execution authority. Keep exact-edit/path validation, immutable baseline evidence, candidate fingerprint checks, explicit publication review, loopback request guards, and secret redaction intact. A screenshot or a model's explanation cannot independently establish that a bug is fixed.

Do not commit credentials, `.env`, local databases, copied repositories, or private traces. Review exported evidence before publishing it. If changing Docker execution or GitHub publication, describe the authority boundary and test stale/duplicate requests.

## Pull requests

Include the problem, final behavior, relevant checks, and any remaining limitations. Distinguish a locally exercised path from one requiring external account access. Credit reused code and assets. Do not claim hosted deployment, model accuracy, partner eligibility, or development sessions without evidence.
