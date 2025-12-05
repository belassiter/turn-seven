AI Assistant instructions
=========================

If an automated assistant (Copilot, CI agent, or other automation) edits this repository it MUST follow this verification flow before reporting a task as completed.

1) If the project provides a `pnpm verify:ai` script, run it. That script will attempt to:
   - Format changed files with Prettier
   - Run ESLint with `--fix` on changed files and report remaining issues to `.eslint-result.json`
   - Run the project's tests (one-shot, non-watch)

2) If `pnpm verify:ai` doesn't exist, follow these steps in order:
   - Run Prettier formatting: `pnpm format` (or `prettier --write` if necessary)
   - Run ESLint with auto-fix on the changed files: `pnpm exec eslint --fix <files>`
   - Re-run ESLint and write any remaining diagnostics to `.eslint-result.json` using `--format json`
   - Run tests: `pnpm test -- --run` or the project's equivalent

3) Iteration rules for the assistant
   - If any step produces auto-fixable changes, apply them and re-run the workflow from step 1.
   - If ESLint produces non-fixable errors, parse the JSON output, make targeted code edits to resolve specific rule violations, and re-run the checks.
   - If tests fail after linting is clean, attempt to fix tests or revert the change and report a human review if the assistant cannot confidently fix the failures.

4) Finalization
   - Only claim the task is finished if formatting, linting, and tests are all passing.
   - Do not auto-commit directly to protected branches; create a PR with passing checks where required.

These rules ensure that any automated changes are validated locally and deterministically before being pushed or marked done.
