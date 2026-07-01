/**
 * Frees a TCP port before the dev server starts, so a leftover/duplicate
 * `nest start --watch` from a previous run can never cause EADDRINUSE.
 *
 * Usage: node scripts/free-port.cjs 3000
 * Cross-platform (Windows + POSIX). Safe to run when nothing holds the port.
 */
const { execSync } = require('child_process');

const port = process.argv[2] || '3000';

function pidsOnPort(p) {
  try {
    if (process.platform === 'win32') {
      const out = execSync(`netstat -ano -p tcp`, { encoding: 'utf8' });
      const pids = new Set();
      for (const line of out.split(/\r?\n/)) {
        // ...  TCP  0.0.0.0:3000  ...  LISTENING  <pid>
        const m = line.match(/:(\d+)\s+\S+\s+LISTENING\s+(\d+)/);
        if (m && m[1] === String(p)) pids.add(m[2]);
      }
      return [...pids];
    }
    const out = execSync(`lsof -ti tcp:${p} -s tcp:LISTEN`, { encoding: 'utf8' });
    return out.split(/\s+/).filter(Boolean);
  } catch {
    return []; // nothing listening / tool returned non-zero
  }
}

const pids = pidsOnPort(port);
if (pids.length === 0) {
  console.log(`[free-port] :${port} is free`);
  process.exit(0);
}

for (const pid of pids) {
  try {
    if (process.platform === 'win32') {
      execSync(`taskkill /PID ${pid} /F /T`, { stdio: 'ignore' });
    } else {
      process.kill(Number(pid), 'SIGKILL');
    }
    console.log(`[free-port] killed stale process ${pid} on :${port}`);
  } catch (e) {
    console.warn(`[free-port] could not kill ${pid}: ${e.message}`);
  }
}
