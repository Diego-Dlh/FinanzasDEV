// Runs every e2e suite in order (each is its own process) and fails if any of them fails.
// They run one after another because some of them reset the admin's sessions.
import { spawnSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const dir = dirname(fileURLToPath(import.meta.url));
const suites = ['security', 'balances', 'api-robustness', 'concurrency', 'finance'];

const results = suites.map((name) => {
  console.log(`\n${'─'.repeat(70)}\n▶ ${name}\n${'─'.repeat(70)}`);
  const run = spawnSync(process.execPath, [join(dir, `${name}.mjs`)], { stdio: ['ignore', 'pipe', 'inherit'], env: process.env, encoding: 'utf8' });
  process.stdout.write(run.stdout ?? '');
  const passed = (run.stdout?.match(/^✓/gm) ?? []).length;
  const failed = (run.stdout?.match(/^✗/gm) ?? []).length;
  return { name, status: run.status, passed, failed };
});

console.log(`\n${'═'.repeat(70)}\nResumen`);
for (const r of results) {
  console.log(`  ${r.status === 0 ? '✓' : '✗'} ${r.name.padEnd(16)} ${String(r.passed).padStart(3)} correctas, ${r.failed} fallidas${r.status === 0 ? '' : ` (código ${r.status})`}`);
}
const total = results.reduce((s, r) => s + r.passed, 0);
console.log(`  Total: ${total} comprobaciones`);
process.exit(results.every((r) => r.status === 0) ? 0 : 1);
