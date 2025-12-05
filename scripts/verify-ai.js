#!/usr/bin/env node
const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

function run(cmd, args, options = {}) {
  console.log('>', cmd, args.join(' '));
  const res = spawnSync(cmd, args, { stdio: 'inherit', shell: true, ...options });
  return res.status === 0;
}

function runCapture(cmd, args) {
  const res = spawnSync(cmd, args, { encoding: 'utf8', shell: true });
  return { status: res.status, stdout: res.stdout || '', stderr: res.stderr || '' };
}

// Collect changed files relative to HEAD (includes untracked)
function getChangedFiles() {
  // Files changed vs HEAD (staged or unstaged)
  const diff = runCapture('git', ['diff', '--name-only', 'HEAD']);
  const modified = new Set(diff.stdout.split(/\r?\n/).filter(Boolean));

  // Untracked files
  const ls = runCapture('git', ['ls-files', '--others', '--exclude-standard']);
  for (const f of ls.stdout.split(/\r?\n/).filter(Boolean)) modified.add(f);

  // Only keep source files matching our lint/format targets
  const allowed = [...modified].filter(f => /\.(ts|tsx|js|jsx|json|md|css)$/.test(f));
  return allowed;
}

function main() {
  const changed = getChangedFiles();
  const targetFiles = changed.length ? changed : ['.'];

  console.log('\n[verify:ai] targets ->', targetFiles.join(' '));

  // Step 1 — Prettier format
  // Use project script if available, otherwise call prettier directly
  const usePnpm = fs.existsSync(path.join(process.cwd(), 'pnpm-lock.yaml'));
  // prefer to run the local binary via pnpm exec so the correct package is used
  const prettierCmd = usePnpm ? 'pnpm' : 'npx';
  const prettierArgs = usePnpm ? ['exec', 'prettier', '--write', ...targetFiles] : ['prettier', '--write', ...targetFiles];

  if (!run(prettierCmd, prettierArgs)) {
    console.error('[verify:ai] prettier failed. This usually means the project devDependencies (prettier) are not installed. Run `pnpm install` and try again.');
    process.exit(10);
  }

  // Step 2 — ESLint fix
  const eslintArgsBase = ['--ext', '.ts,.tsx,.js,.jsx', '--fix', ...targetFiles];
  const eslintCmd = usePnpm ? 'pnpm' : 'npx';
  const eslintArgs = usePnpm ? ['exec', 'eslint', ...eslintArgsBase] : ['eslint', ...eslintArgsBase];

  if (!run(eslintCmd, eslintArgs)) {
    console.log('[verify:ai] eslint --fix had problems, continuing to re-check');
  }

  // Step 2b — Re-run ESLint and capture JSON report for tooling
  const eslintCheckArgsBase = ['--ext', '.ts,.tsx,.js,.jsx', '--format', 'json', ...targetFiles];
  const eslintCheckArgs = usePnpm ? ['exec', 'eslint', ...eslintCheckArgsBase] : ['eslint', ...eslintCheckArgsBase];
  const res = runCapture(eslintCmd, eslintCheckArgs);
  let problems = [];
  try {
    problems = JSON.parse(res.stdout || '[]');
  } catch (e) {
    // ignore parse errors
  }

  // If there are any non-empty entries in problems, treat as failures
  const hasProblems = Array.isArray(problems) && problems.some(p => Array.isArray(p.messages) && p.messages.length > 0);
  if (hasProblems) {
    const outFile = path.join(process.cwd(), '.eslint-result.json');
    fs.writeFileSync(outFile, res.stdout || '[]');
    console.error('\n[verify:ai] ESLint reported remaining problems. Details written to .eslint-result.json');
    process.exit(11);
  }

  // Step 3 — Run tests
  // prefer pnpm test if available
  if (!run(usePnpm ? 'pnpm' : 'npx', usePnpm ? ['test', '--reporter', 'verbose'] : ['vitest', '--run', '--reporter', 'verbose'])) {
    console.error('[verify:ai] tests failed');
    process.exit(12);
  }

  console.log('\n[verify:ai] success — format/lint/tests all passed for changed files');
  process.exit(0);
}

main();
