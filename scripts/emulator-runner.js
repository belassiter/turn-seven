/* eslint-disable @typescript-eslint/no-var-requires */
const net = require('net');
const { spawn } = require('child_process');

function waitForPort(port, host = '127.0.0.1', timeout = 30000) {
  const start = Date.now();
  return new Promise((resolve, reject) => {
    (function check() {
      const socket = new net.Socket();
      socket.setTimeout(1000);
      socket.once('error', () => {
        socket.destroy();
        if (Date.now() - start > timeout) return reject(new Error('Timeout waiting for port'));
        setTimeout(check, 500);
      });
      socket.once('timeout', () => {
        socket.destroy();
        if (Date.now() - start > timeout) return reject(new Error('Timeout waiting for port'));
        setTimeout(check, 500);
      });
      socket.connect(port, host, () => {
        socket.end();
        resolve();
      });
    })();
  });
}

(async () => {
  try {
    // Wait for Firestore emulator (default 8080)
    await waitForPort(8080, '127.0.0.1', 60000);
    console.log('Emulator appears to be up; running emulator integration tests');

    const env = Object.assign({}, process.env, { RUN_EMULATOR_TESTS: '1' });
    const pattern = 'packages/games/turn-seven/src/tests/integration/*.emu.test.ts';
    const command = `pnpm -w test --silent -- --run "${pattern}"`;

    // Spawn through a shell to ensure argument parsing works cross-platform
    const child = spawn(command, { stdio: 'inherit', env, shell: true });
    child.on('error', (err) => {
      console.error('Failed to spawn test runner:', err);
      process.exit(2);
    });
    child.on('exit', (code) => process.exit(code));
  } catch (e) {
    console.error('Failed to detect emulator:', e.message || e);
    process.exit(2);
  }
})();
