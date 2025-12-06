#!/usr/bin/env node
/* Helper for automated assistants: run repository-wide checks after an edit
   This script is intended to be executed by automated agents (or humans)
   immediately after making code changes to ensure formatting, lint, tests,
   and build are all successful before reporting the change done.

   It will run the repository's `check` script when available and bubble up
   a non-zero exit code if anything failed.
*/
/* eslint-disable @typescript-eslint/no-var-requires */
const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

function run(cmd, args, opts = {}) {
  console.log('> ', cmd, args.join(' '));
  const res = spawnSync(cmd, args, { stdio: 'inherit', shell: true, ...opts });
  return res.status;
}

function main() {
  const hasPnpm = fs.existsSync(path.join(process.cwd(), 'pnpm-lock.yaml'));

  // Prefer the workspace-wide `check` script if available
  const cmd = hasPnpm ? 'pnpm' : 'npx';
  const args = hasPnpm ? ['-w', 'run', 'check'] : ['run', 'check'];

  console.log('\n[ai-post-edit-check] Running workspace check (format/lint/test/build)...');
  const exitCode = run(cmd, args);

  if (exitCode !== 0) {
    console.error(
      '\n[ai-post-edit-check] 🚨 Checks failed. Fix issues and re-run this script (or run `pnpm -w run check`).'
    );
    process.exit(exitCode);
  }

  console.log('\n[ai-post-edit-check] ✅ All checks passed');
  process.exit(0);
}

main();
