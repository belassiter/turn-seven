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

CI note
-------
The GitHub Actions workflow ensures `pnpm` is available on the runner. The workflow installs or activates `pnpm` (via corepack or as a global fallback) before running any `pnpm` commands so the CI job won't fail due to a missing `pnpm` binary.

