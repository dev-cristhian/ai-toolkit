// Validates the catalog (JSON Schema + consistency rules), own item files,
// the glossary and the site color contrast. Exits with code 1 on any error.
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  ROOT, CATALOG_PATH, readJson, loadGlossary, discoverOwnItems, normalizeItem,
  installCommand, sortItems,
} from '../lib/catalog.mjs';
import { spawnSync } from 'node:child_process';
import { validateSchema } from './lib/jsonschema.mjs';
import { checkContrast } from './lib/contrast.mjs';

const errors = [];
const warnings = [];
const error = (scope, message) => errors.push(`[${scope}] ${message}`);

// Terms the glossary must always contain (ids in glossary.json).
const REQUIRED_TERMS = [
  'agents', 'chain-of-thought', 'context-window', 'emergent-behavior', 'fine-tuning', 'generative-ai',
  'hallucination', 'llm', 'system-prompt', 'multimodal-model', 'nlp', 'neural-networks', 'parameters',
  'prompt-engineering', 'rag', 'reasoning-models', 'reinforcement-learning', 'temperature', 'token',
  'transformer', 'references',
];

// Simple heuristic: English fields should not contain Portuguese diacritics.
const PT_CHARS = /[ãõçáéíóúâêôàÃÕÇÁÉÍÓÚÂÊÔÀ]/;

// --- catalog ---------------------------------------------------------------
let catalog;
try {
  catalog = readJson(CATALOG_PATH);
} catch (err) {
  error('catalog', `catalog.json is not valid JSON: ${err.message}`);
}

if (catalog) {
  const schema = readJson(join(ROOT, 'catalog.schema.json'));
  for (const e of validateSchema(schema, catalog)) error('catalog', e);

  const ids = new Map();
  for (const item of catalog.items ?? []) {
    ids.set(item.id, (ids.get(item.id) ?? 0) + 1);
  }
  for (const [id, n] of ids) if (n > 1) error('catalog', `duplicate id "${id}" (${n} times)`);

  const levelIds = (catalog.levels ?? []).map((l) => l.id).sort().join(',');
  if (levelIds !== '1,2,3') error('catalog', `levels must define ids 1, 2 and 3 exactly once (found ${levelIds})`);

  for (const item of catalog.items ?? []) {
    const where = `catalog:${item.id}`;
    for (const dep of item.requires ?? []) {
      if (!ids.has(dep)) error(where, `requires unknown item "${dep}"`);
    }
    if (item.description_en && PT_CHARS.test(item.description_en)) error(where, 'description_en looks like Portuguese; keep it in en-US');
    if (item.install && item.install.command !== installCommand(catalog, item)) {
      error(where, 'install.command is out of date; run "npm run build:catalog"');
    }
    if (item.install?.method === 'npx-skills' && item.source?.repo !== item.install.repo) {
      error(where, 'install.repo must match source.repo');
    }
    if (item.install?.method === 'npx-skills' && item.type !== 'skill') error(where, 'npx-skills is only valid for skills');
    if (item.install?.method === 'agent-file' && item.type !== 'agent') error(where, 'agent-file is only valid for agents');
    if (item.install?.method === 'mcp-config' && item.type !== 'mcp') error(where, 'mcp-config is only valid for MCP servers');

    if (item.origin === 'recommended') {
      // Reference only: third-party items must point elsewhere and never be copied here.
      if (item.source?.repo === catalog.repository) error(where, 'recommended items must reference the original repository, not this one');
      const localCopies = new Set([`skills/${item.id}`, `agents/${item.id}.md`, `mcps/${item.id}.json`]);
      if (item.install?.skill) localCopies.add(`skills/${item.install.skill}`);
      for (const p of localCopies) {
        if (existsSync(join(ROOT, p))) error(where, `a local copy exists at ${p}; recommended items are references only`);
      }
    }
  }

  // Own items in catalog.json must match what is discovered on disk.
  const { items: discovered, problems } = discoverOwnItems(catalog);
  for (const p of problems) error('own', p);
  const expected = JSON.stringify(sortItems(discovered).map((i) => normalizeItem(catalog, i)));
  const actual = JSON.stringify(sortItems((catalog.items ?? []).filter((i) => i.origin === 'own')));
  if (expected !== actual) error('own', 'own items in catalog.json are out of sync with skills/, agents/ and mcps/; run "npm run build:catalog"');
  for (const item of discovered) {
    if (!Number.isInteger(item.level)) error(`own:${item.id}`, 'missing metadata "hub-level" ("1", "2" or "3") in frontmatter');
    if (!item.description_pt) error(`own:${item.id}`, 'missing metadata "hub-description-pt" in frontmatter');
    if (!item.description_en) error(`own:${item.id}`, 'missing "description" in frontmatter');
  }
}

// --- glossary --------------------------------------------------------------
try {
  const glossary = loadGlossary();
  const categories = new Set((glossary.categories ?? []).map((c) => c.id));
  const seen = new Set();
  for (const [i, term] of (glossary.terms ?? []).entries()) {
    const where = `glossary:${term.id ?? i}`;
    for (const field of ['id', 'term', 'category', 'definition']) {
      if (typeof term[field] !== 'string' || !term[field].trim()) error(where, `missing "${field}"`);
    }
    if (seen.has(term.id)) error(where, 'duplicate id');
    seen.add(term.id);
    if (term.category && !categories.has(term.category)) error(where, `unknown category "${term.category}"`);
    if (term.term && PT_CHARS.test(term.term)) error(where, 'term names stay in English (as used by the community)');
  }
  for (const id of REQUIRED_TERMS) if (!seen.has(id)) error('glossary', `required term "${id}" is missing`);
} catch (err) {
  error('glossary', `glossary.json could not be read: ${err.message}`);
}

// --- site ------------------------------------------------------------------
const indexPath = join(ROOT, 'site', 'index.html');
if (!existsSync(indexPath)) {
  error('site', 'site/index.html is missing');
} else {
  const html = readFileSync(indexPath, 'utf8');
  for (const marker of ['INSTALL', 'GLOSSARY', 'CATALOG']) {
    if (!html.includes(`<!-- ${marker}:START -->`) || !html.includes(`<!-- ${marker}:END -->`)) {
      error('site', `site/index.html is missing the ${marker}:START/END markers`);
    }
  }
  const contrast = checkContrast(html);
  for (const r of contrast.failures) error('contrast', r);
  if (!contrast.checked) warnings.push('no contrast pairs were checked');
}

// --- line endings -----------------------------------------------------------
// Shell scripts must be committed with LF or they break on macOS/Linux
// ("bad interpreter"). Check what Git stores (the index), not the working
// copy, which may legitimately use CRLF on Windows with core.autocrlf=true.
const eol = spawnSync('git', ['ls-files', '--eol', '--', '*.sh'], { cwd: ROOT, encoding: 'utf8' });
if (eol.status === 0) {
  for (const line of eol.stdout.split('\n').filter(Boolean)) {
    const [index, , , ...file] = line.split(/\s+/);
    if (index.includes('crlf')) error('eol', `${file.join(' ')} is stored with CRLF line endings; convert it to LF`);
  }
} else {
  warnings.push('git is not available; skipped the line-ending check for shell scripts');
}

// --- report ----------------------------------------------------------------
for (const w of warnings) console.warn(`warning: ${w}`);
if (errors.length) {
  console.error(`Validation failed with ${errors.length} error(s):`);
  for (const e of errors) console.error(`  - ${e}`);
  process.exit(1);
}
console.log(`Validation passed: ${catalog.items.length} catalog items, glossary and site OK.`);
