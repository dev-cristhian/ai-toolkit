// Shared catalog helpers: constants, loading, own-item discovery and
// command builders. Used by both the build scripts and the installer CLI.
import { readFileSync, readdirSync, existsSync, statSync } from 'node:fs';
import { join, dirname, basename, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseFrontmatter } from './frontmatter.mjs';

export const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
export const CATALOG_PATH = join(ROOT, 'catalog.json');
const GLOSSARY_PATH = join(ROOT, 'glossary.json');

export const TYPES = ['skill', 'agent', 'mcp'];
export const ORIGINS = ['own', 'recommended'];
export const LEVELS = [1, 2, 3];

/** Supported install targets and their `npx skills --agent` identifiers. */
export const TARGETS = {
  claude: { label: 'Claude Code', skillsAgent: 'claude-code' },
  cursor: { label: 'Cursor', skillsAgent: 'cursor' },
  codex: { label: 'OpenAI Codex', skillsAgent: 'codex' },
  copilot: { label: 'VS Code + GitHub Copilot', skillsAgent: 'github-copilot' },
};

/** Pinned version of the skills CLI used by the installer (https://github.com/vercel-labs/skills). */
export const SKILLS_CLI = 'skills@1.7.6';

export function readJson(path) {
  return JSON.parse(readFileSync(path, 'utf8'));
}

export function loadCatalog() {
  return readJson(CATALOG_PATH);
}

export function loadGlossary() {
  return readJson(GLOSSARY_PATH);
}

export function repoOwner(catalog) {
  return new URL(catalog.repository).pathname.split('/').filter(Boolean)[0];
}

function rawBase(catalog) {
  const [owner, repo] = new URL(catalog.repository).pathname.split('/').filter(Boolean);
  return `https://raw.githubusercontent.com/${owner}/${repo}/${catalog.branch}`;
}

// ---------------------------------------------------------------------------
// Display commands (shown in README and on the site)
// ---------------------------------------------------------------------------

function shellQuote(arg) {
  return /^[A-Za-z0-9_@%+=:,./-]+$/.test(arg) ? arg : `'${arg.replace(/'/g, `'\\''`)}'`;
}

export function hubInstallCommands(catalog, extraArgs = '') {
  const raw = rawBase(catalog);
  const suffix = extraArgs ? ` ${extraArgs}` : '';
  return {
    unix: `curl -fsSL ${raw}/install.sh | bash${suffix ? ` -s --${suffix}` : ''}`,
    windows: suffix
      ? `& ([scriptblock]::Create((irm ${raw}/install.ps1)))${suffix}`
      : `irm ${raw}/install.ps1 | iex`,
  };
}

function skillCommand(install) {
  return `npx skills add ${install.repo} --skill ${install.skill}`;
}

/** Per-target MCP commands/snippets for documentation purposes. */
export function mcpSnippets(server) {
  const { name } = server;
  if (server.transport === 'stdio') {
    const cmd = [server.command, ...(server.args ?? [])].map(shellQuote).join(' ');
    const json = { command: server.command, args: server.args ?? [] };
    return {
      claude: `claude mcp add --scope user ${name} -- ${cmd}`,
      codex: `codex mcp add ${name} -- ${cmd}`,
      copilot: `code --add-mcp '${JSON.stringify({ name, type: 'stdio', ...json })}'`,
      cursor: JSON.stringify({ mcpServers: { [name]: json } }, null, 2),
    };
  }
  const json = { url: server.url };
  return {
    claude: `claude mcp add --scope user --transport http ${name} ${server.url}`,
    codex: `codex mcp add ${name} --url ${server.url}`,
    copilot: `code --add-mcp '${JSON.stringify({ name, type: 'http', url: server.url })}'`,
    cursor: JSON.stringify({ mcpServers: { [name]: json } }, null, 2),
  };
}

/** The canonical single install command stored in `install.command`. */
export function installCommand(catalog, item) {
  switch (item.install?.method) {
    case 'npx-skills':
      return skillCommand(item.install);
    case 'mcp-config':
      return mcpSnippets(item.install.server).claude;
    case 'agent-file':
      return hubInstallCommands(catalog, `--id ${item.id}`).unix;
    default:
      return null;
  }
}

/** True for Creative Commons NonCommercial licenses (e.g. CC-BY-NC-SA-4.0). */
export function isNonCommercial(license) {
  return /NC|-NC-|NonCommercial/i.test(license ?? '');
}

export function sourceUrl(item) {
  const { repo, path, ref } = item.source ?? {};
  if (!repo) return item.homepage ?? null;
  if (!path) return repo;
  return `${repo}/tree/${ref ?? 'HEAD'}/${path}`;
}

// ---------------------------------------------------------------------------
// Own-item discovery
// ---------------------------------------------------------------------------

function listDirs(dir) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir).filter((n) => statSync(join(dir, n)).isDirectory()).sort();
}

function listFiles(dir, ext) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir).filter((n) => extname(n) === ext && statSync(join(dir, n)).isFile()).sort();
}

function splitList(value) {
  if (Array.isArray(value)) return value.map(String);
  if (typeof value !== 'string' || value.trim() === '') return [];
  return value.split(',').map((s) => s.trim()).filter(Boolean);
}

function hubFields(meta = {}) {
  const level = meta['hub-level'];
  return {
    level: level === undefined || level === null || level === '' ? null : Number(level),
    description_pt: meta['hub-description-pt'] ?? null,
    tags: splitList(meta['hub-tags']),
    requires: splitList(meta['hub-requires']),
  };
}

/**
 * Discover own items from skills/, agents/ and mcps/.
 * Returns { items, problems } where problems are human-readable strings.
 */
export function discoverOwnItems(catalog) {
  const items = [];
  const problems = [];
  const author = repoOwner(catalog);
  const repo = catalog.repository;

  for (const dir of listDirs(join(ROOT, 'skills'))) {
    const rel = `skills/${dir}/SKILL.md`;
    const file = join(ROOT, rel);
    if (!existsSync(file)) { problems.push(`${rel} is missing.`); continue; }
    let data;
    try { ({ data } = parseFrontmatter(readFileSync(file, 'utf8'))); }
    catch (err) { problems.push(`${rel}: ${err.message}`); continue; }
    if (!data) { problems.push(`${rel} has no YAML frontmatter.`); continue; }
    if (data.name !== dir) problems.push(`${rel}: frontmatter "name" (${data.name}) must match the folder name (${dir}).`);
    const hub = hubFields(data.metadata ?? {});
    items.push({
      id: dir,
      type: 'skill',
      level: hub.level,
      origin: 'own',
      name: data.name ?? dir,
      description_en: data.description ?? null,
      description_pt: hub.description_pt,
      author,
      license: 'MIT',
      source: { repo, path: `skills/${dir}`, ref: null },
      install: { method: 'npx-skills', repo, skill: dir },
      tags: hub.tags,
      requires: hub.requires,
    });
  }

  for (const fileName of listFiles(join(ROOT, 'agents'), '.md')) {
    const rel = `agents/${fileName}`;
    const id = basename(fileName, '.md');
    let data;
    try { ({ data } = parseFrontmatter(readFileSync(join(ROOT, rel), 'utf8'))); }
    catch (err) { problems.push(`${rel}: ${err.message}`); continue; }
    if (!data) { problems.push(`${rel} has no YAML frontmatter.`); continue; }
    if (data.name !== id) problems.push(`${rel}: frontmatter "name" (${data.name}) must match the file name (${id}).`);
    const hub = hubFields(data.metadata ?? {});
    items.push({
      id,
      type: 'agent',
      level: hub.level,
      origin: 'own',
      name: data.name ?? id,
      description_en: data.description ?? null,
      description_pt: hub.description_pt,
      author,
      license: 'MIT',
      source: { repo, path: rel, ref: null },
      install: { method: 'agent-file', path: rel },
      tags: hub.tags,
      requires: hub.requires,
    });
  }

  for (const fileName of listFiles(join(ROOT, 'mcps'), '.json')) {
    const rel = `mcps/${fileName}`;
    const id = basename(fileName, '.json');
    let def;
    try { def = readJson(join(ROOT, rel)); }
    catch (err) { problems.push(`${rel}: invalid JSON (${err.message}).`); continue; }
    items.push({
      id,
      type: 'mcp',
      level: def.level ?? null,
      origin: 'own',
      name: def.name ?? id,
      description_en: def.description_en ?? null,
      description_pt: def.description_pt ?? null,
      author,
      license: 'MIT',
      homepage: def.homepage,
      source: { repo, path: rel, ref: null },
      install: { method: 'mcp-config', server: def.server },
      tags: splitList(def.tags),
      requires: splitList(def.requires),
    });
  }

  return { items, problems };
}

// ---------------------------------------------------------------------------
// Normalization (stable key order => idempotent output)
// ---------------------------------------------------------------------------

const ITEM_KEYS = ['id', 'type', 'level', 'origin', 'name', 'description_en', 'description_pt',
  'author', 'license', 'homepage', 'source', 'install', 'tags', 'requires'];
const INSTALL_KEYS = ['method', 'repo', 'skill', 'path', 'server', 'command'];
const SERVER_KEYS = ['name', 'transport', 'command', 'args', 'url', 'auth'];

function pick(obj, keys) {
  const out = {};
  for (const k of keys) if (obj[k] !== undefined) out[k] = obj[k];
  for (const k of Object.keys(obj)) if (!keys.includes(k)) out[k] = obj[k];
  return out;
}

export function normalizeItem(catalog, item) {
  const out = pick(item, ITEM_KEYS);
  if (out.install) {
    out.install = pick({ ...out.install, command: installCommand(catalog, out) ?? out.install.command }, INSTALL_KEYS);
    if (out.install.server) out.install.server = pick(out.install.server, SERVER_KEYS);
  }
  if (out.source) out.source = pick(out.source, ['repo', 'path', 'ref']);
  if (!out.tags) out.tags = [];
  if (Array.isArray(out.requires) && out.requires.length === 0) delete out.requires;
  return out;
}

export function sortItems(items) {
  const typeOrder = (t) => TYPES.indexOf(t);
  return [...items].sort((a, b) =>
    (a.origin === b.origin ? 0 : a.origin === 'own' ? -1 : 1)
    || (a.level ?? 9) - (b.level ?? 9)
    || typeOrder(a.type) - typeOrder(b.type)
    || a.id.localeCompare(b.id));
}

export function stringifyJson(value) {
  return `${JSON.stringify(value, null, 2)}\n`;
}
