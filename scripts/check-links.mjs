// Checks that every URL referenced by recommended items is reachable, and
// that recommended skills still exist at their declared path.
// Writes a Markdown report to link-report.md when something is broken.
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT, loadCatalog } from '../lib/catalog.mjs';

const catalog = loadCatalog();
const TIMEOUT_MS = 15000;
const USER_AGENT = 'ai-toolkit-link-checker (+https://github.com/dev-cristhian/ai-toolkit)';

function rawSkillUrl(item) {
  const { repo, path, ref } = item.source;
  const url = new URL(repo);
  if (url.hostname !== 'github.com' || !path) return null;
  return `https://raw.githubusercontent.com${url.pathname}/${ref ?? 'HEAD'}/${path}/SKILL.md`;
}

function collectUrls() {
  const checks = [];
  for (const item of catalog.items.filter((i) => i.origin === 'recommended')) {
    const add = (url, what) => url && checks.push({ id: item.id, url, what });
    add(item.source?.repo, 'source repository');
    add(item.homepage, 'homepage');
    if (item.type === 'skill') add(rawSkillUrl(item), 'SKILL.md');
  }
  // De-duplicate identical URLs, keeping the first item that uses them.
  const seen = new Set();
  return checks.filter((c) => (seen.has(c.url) ? false : seen.add(c.url)));
}

async function check(url) {
  for (const method of ['HEAD', 'GET']) {
    try {
      const res = await fetch(url, {
        method,
        redirect: 'follow',
        headers: { 'user-agent': USER_AGENT },
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
      // Some servers reject HEAD (405/403); retry with GET before failing.
      if (res.ok) return { ok: true, status: res.status };
      if (method === 'GET' || ![403, 405, 501].includes(res.status)) return { ok: false, status: res.status };
    } catch (err) {
      if (method === 'GET') return { ok: false, status: err.name === 'TimeoutError' ? 'timeout' : err.message };
    }
  }
  return { ok: false, status: 'unknown' };
}

const checks = collectUrls();
const results = [];
const CONCURRENCY = 6;
for (let i = 0; i < checks.length; i += CONCURRENCY) {
  const batch = checks.slice(i, i + CONCURRENCY);
  results.push(...await Promise.all(batch.map(async (c) => ({ ...c, ...(await check(c.url)) }))));
}

const broken = results.filter((r) => !r.ok);
for (const r of results) console.log(`${r.ok ? 'ok  ' : 'FAIL'} ${String(r.status).padEnd(7)} ${r.id} (${r.what}) ${r.url}`);

if (broken.length) {
  const report = [
    `The weekly link check found ${broken.length} broken link(s) in \`catalog.json\`:`,
    '',
    '| Item | What | Status | URL |',
    '| --- | --- | --- | --- |',
    ...broken.map((r) => `| \`${r.id}\` | ${r.what} | ${r.status} | ${r.url} |`),
  ].join('\n');
  writeFileSync(join(ROOT, 'link-report.md'), `${report}\n`);
  console.error(`\n${broken.length} broken link(s). Report written to link-report.md.`);
  process.exit(1);
}
console.log(`\nAll ${results.length} links are reachable.`);
