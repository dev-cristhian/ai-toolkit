// Regenerates the README sections between markers:
//   <!-- CATALOG:START/END -->   catalog tables per level (own + recommended)
//   <!-- CREDITS:START/END -->   credits for recommended items
//   <!-- CONTRAST:START/END -->  verified color contrast table
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT, loadCatalog, sourceUrl, isNonCommercial } from '../lib/catalog.mjs';
import { replaceBetween } from './lib/markers.mjs';
import { contrastReport } from './lib/contrast.mjs';

const README = join(ROOT, 'README.md');
const catalog = loadCatalog();
const TYPE_LABEL = { skill: 'Skill', agent: 'Agent', mcp: 'MCP' };

// Escape characters that would break a Markdown table cell.
const cell = (s) => String(s ?? '').replace(/\|/g, '\\|').replace(/\r?\n/g, ' ');
const code = (s) => `\`${cell(s)}\``;
const link = (text, url) => (url ? `[${cell(text)}](${url})` : cell(text));

function ownTable(items) {
  if (!items.length) return '_Coming soon._';
  return [
    '| Name | Type | Description | Install |',
    '| --- | --- | --- | --- |',
    ...items.map((i) => `| ${link(i.name, `./${i.source.path}`)} | ${TYPE_LABEL[i.type]} | ${cell(i.description_en)} | ${code(i.install.command)} |`),
  ].join('\n');
}

function recommendedTable(items) {
  if (!items.length) return '_Coming soon._';
  return [
    '| Name | Type | Author | Description | Install |',
    '| --- | --- | --- | --- | --- |',
    ...items.map((i) => `| ${link(i.name, sourceUrl(i))} | ${TYPE_LABEL[i.type]} | ${cell(i.author)} | ${cell(i.description_en)} | ${code(i.install.command)} |`),
  ].join('\n');
}

function renderCatalog() {
  const total = catalog.items.length;
  const own = catalog.items.filter((i) => i.origin === 'own').length;
  const parts = [`_${total} items (${own} own, ${total - own} recommended). Generated from \`catalog.json\`; do not edit this section by hand._`];
  for (const level of catalog.levels) {
    const items = catalog.items.filter((i) => i.level === level.id);
    parts.push(
      `### Level ${level.id}: ${level.name_en}`,
      level.description_en,
      '**Own**',
      ownTable(items.filter((i) => i.origin === 'own')),
      '**Recommended**',
      recommendedTable(items.filter((i) => i.origin === 'recommended')),
    );
  }
  return parts.join('\n\n');
}

function renderCredits() {
  const repos = new Map();
  for (const item of catalog.items.filter((i) => i.origin === 'recommended')) {
    const key = item.source.repo;
    if (!repos.has(key)) repos.set(key, { author: item.author, license: item.license, items: [] });
    repos.get(key).items.push(item.name);
  }
  const rows = [...repos.entries()].sort(([a], [b]) => a.localeCompare(b))
    .map(([repo, r]) => `| [${new URL(repo).pathname.slice(1)}](${repo}) | ${cell(r.author)} | ${cell(r.license ?? 'See repository')} | ${cell(r.items.join(', '))} |`);
  return [
    'Recommended items are referenced, never copied. All rights belong to their authors, under the licenses of the original repositories:',
    '',
    '| Repository | Author | License | Items |',
    '| --- | --- | --- | --- |',
    ...rows,
    ...(catalog.items.some((i) => i.origin === 'recommended' && isNonCommercial(i.license))
      ? ['', "> **NonCommercial (NC) licenses:** those items may not be used for commercial purposes without the author's permission."]
      : []),
  ].join('\n');
}

function renderContrast() {
  const html = readFileSync(join(ROOT, 'site', 'index.html'), 'utf8');
  const rows = contrastReport(html).filter((r) => !r.missing);
  return [
    '| Theme | Foreground | Background | Ratio | Required | Usage |',
    '| --- | --- | --- | --- | --- | --- |',
    ...rows.map((r) => `| ${r.theme} | \`${r.fg}\` ${r.fgHex} | \`${r.bg}\` ${r.bgHex} | ${r.ratio.toFixed(2)}:1 ${r.pass ? '✅' : '❌'} | ${r.min}:1 | ${cell(r.usage)} |`),
  ].join('\n');
}

const current = readFileSync(README, 'utf8');
let next = replaceBetween(current, 'CATALOG', renderCatalog());
next = replaceBetween(next, 'CREDITS', renderCredits());
next = replaceBetween(next, 'CONTRAST', renderContrast());

if (next === current) {
  console.log('README.md is up to date.');
} else {
  writeFileSync(README, next);
  console.log('README.md updated.');
}
