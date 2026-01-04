const fs = require('fs');
const path = require('path');
const { spawn, execSync } = require('child_process');

const functionsPackagePath = path.join(__dirname, '../functions/package.json');
const backupPath = path.join(__dirname, '../functions/package.json.bak');

// 0. Build Everything
console.log('Building all packages...');
try {
  execSync('pnpm -r run build', {
    cwd: path.join(__dirname, '..'),
    stdio: 'inherit',
  });
} catch (e) {
  console.error('Build failed:', e);
  process.exit(1);
}

// Ensure we don't overwrite a backup if it exists (e.g. from a crashed run)
if (fs.existsSync(backupPath)) {
  console.log('Restoring from previous backup...');
  fs.copyFileSync(backupPath, functionsPackagePath);
}

// 1. Backup
console.log('Backing up functions/package.json...');
fs.copyFileSync(functionsPackagePath, backupPath);

try {
  // 2. Modify
  console.log('Removing workspace dependencies for deployment...');
  const pkg = JSON.parse(fs.readFileSync(functionsPackagePath, 'utf8'));

  // Remove workspace deps from devDependencies
  if (pkg.devDependencies) {
    for (const key in pkg.devDependencies) {
      if (pkg.devDependencies[key].startsWith('workspace:')) {
        console.log(`  Removing devDependency: ${key}`);
        delete pkg.devDependencies[key];
      }
    }
  }

  // Remove workspace deps from dependencies (if any, though usually they shouldn't be there for functions)
  if (pkg.dependencies) {
    for (const key in pkg.dependencies) {
      if (pkg.dependencies[key].startsWith('workspace:')) {
        console.log(`  Removing dependency: ${key}`);
        delete pkg.dependencies[key];
      }
    }
  }

  fs.writeFileSync(functionsPackagePath, JSON.stringify(pkg, null, 2));

  // 3. Run firebase deploy
  console.log('Running firebase deploy...');
  // Pass through arguments from the command line (skipping 'node' and 'script path')
  const args = ['deploy', ...process.argv.slice(2)];

  const deploy = spawn('firebase', args, { stdio: 'inherit', shell: true });

  deploy.on('close', (code) => {
    // 4. Restore
    console.log('Restoring functions/package.json...');
    fs.copyFileSync(backupPath, functionsPackagePath);
    fs.unlinkSync(backupPath);
    process.exit(code);
  });
} catch (err) {
  console.error('Error during deployment preparation:', err);
  // Attempt restore
  if (fs.existsSync(backupPath)) {
    fs.copyFileSync(backupPath, functionsPackagePath);
    fs.unlinkSync(backupPath);
  }
  process.exit(1);
}

// Handle unexpected exits
process.on('SIGINT', () => {
  console.log('\nProcess interrupted. Restoring functions/package.json...');
  if (fs.existsSync(backupPath)) {
    fs.copyFileSync(backupPath, functionsPackagePath);
    fs.unlinkSync(backupPath);
  }
  process.exit(1);
});
