import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { defineConfig } from 'vite';

const { version } = JSON.parse(readFileSync('package.json', 'utf8')) as { version: string };

// Commit hash, with a "+" when there are uncommitted changes, so a test build can be told apart.
function commit() {
  try {
    const hash = execSync('git rev-parse --short HEAD').toString().trim();
    const dirty = execSync('git status --porcelain').toString().trim() !== '';
    return hash + (dirty ? '+' : '');
  } catch {
    return 'no-git';
  }
}

const pad = (n: number) => String(n).padStart(2, '0');
const now = new Date();
const built = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}`;

// Relative base so the build works inside the Capacitor Android WebView.
export default defineConfig({
  base: './',
  define: {
    __BUILD_INFO__: JSON.stringify(`v${version} · ${commit()} · ${built}`),
  },
});
