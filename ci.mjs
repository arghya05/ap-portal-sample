// CI for ap_portal: syntax check, unit tests with coverage (>= 90% lines), static checks. Last stdout line is JSON.
import { spawnSync } from 'node:child_process';
import { readdirSync, readFileSync } from 'node:fs';
const env = { ...process.env, NODE_PATH: 'src' };
const files = readdirSync('src/ap_portal').filter((f) => f.endsWith('.js')).map((f) => `src/ap_portal/${f}`);
const compile = files.every((f) => spawnSync('node', ['--check', f]).status === 0);
const r = spawnSync('node', ['--test', '--experimental-test-coverage', '--test-coverage-include=src/**', 'tests/*.test.js'], { env, encoding: 'utf8' });
const out = (r.stdout || '') + (r.stderr || '');
const num = (re) => Number((out.match(re) || [0, 0])[1]);
const coverage = num(/# all files\s*\|\s*([\d.]+)/);
const static_issues = [];
for (const f of files) readFileSync(f, 'utf8').split('\n').forEach((line, i) => {
  if (/console\.log|\beval\(/.test(line)) static_issues.push(`${f}:${i + 1} console.log or eval`);
  if (line.length > 140) static_issues.push(`${f}:${i + 1} line longer than 140 characters`);
});
const tests_run = num(/^# tests (\d+)/m), failures = num(/^# fail (\d+)/m);
const passed = compile && r.status === 0 && failures === 0 && tests_run > 0 && coverage >= 90 && static_issues.length === 0;
console.log(JSON.stringify({ compile, tests_run, failures, errors: 0, coverage, static_issues, test_output: out.slice(-3000), coverage_report: (out.match(/# start of coverage report[\s\S]*# end of coverage report/) || [''])[0], passed }));
process.exit(passed ? 0 : 1);
