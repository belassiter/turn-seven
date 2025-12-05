# turn-seven
demo implementation of the card game Turn Seven

## Development

Recommended commands and notes for contributors and CI:

- Install and run tests (one-shot/non-watch):

```powershell
pnpm install
pnpm test
```

By default `pnpm test` runs a single non-watch run (vitest --run). To run tests in watch mode, use:

```powershell
pnpm test -- --watch
```

- Verbose output (useful locally or in CI):

```powershell
pnpm test -- --reporter verbose
```

## AI-agent / automation verification

If an automated agent (for example Copilot or other automation) is making changes directly in the repository, it should verify its work *before* declaring a task completed. The repository provides a cross-platform verification helper:

```powershell
pnpm verify:ai
```

What `pnpm verify:ai` does:
- Runs the configured formatter (Prettier) on changed files or the whole repo
- Runs ESLint with --fix on changed files, then re-checks and writes a machine readable report to `.eslint-result.json` if problems remain
- Runs the project's tests (one-shot non-watch run)

If any non-auto-fixable lint problems remain or tests fail the script will exit non-zero and leave details for the agent to examine and fix.

This lets an AI agent iterate locally and fix lint/test issues deterministically before pushing changes to a branch or claiming the task finished.

### Apply this repo's recommended editor settings globally (optional)

If you prefer to make these settings available for all projects on your machine, this repository includes a small PowerShell helper that will merge the recommended VS Code settings into your global user settings and install the recommended extensions.

Run from the repo root in PowerShell (Windows):

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\install-vscode-global-settings.ps1
```

Notes:
- The script backs up your current settings.json before modifying it.
- If the VS Code `code` CLI is not in your PATH, you'll be prompted to install it from the Command Palette.
- You can also manually apply the settings via VS Code > Preferences > Settings (JSON) and install the `ESLint` and `Prettier` extensions.

CI note
-------
The GitHub Actions workflow ensures `pnpm` is available on the runner. The workflow installs or activates `pnpm` (via corepack or as a global fallback) before running any `pnpm` commands so the CI job won't fail due to a missing `pnpm` binary.

