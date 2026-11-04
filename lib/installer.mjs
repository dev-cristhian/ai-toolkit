// Installer engine: select catalog items, build an action plan, print it,
// ask for confirmation and execute it. All side effects live here.
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync, copyFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { createInterface } from 'node:readline/promises';
import { ROOT, TARGETS, SKILLS_CLI } from './catalog.mjs';
import { agentPath, renderAgent, mcpPlan, tomlHasServer } from './targets.mjs';

const isWindows = process.platform === 'win32';

// ---------------------------------------------------------------------------
// Process helpers
// ---------------------------------------------------------------------------

function winQuote(arg) {
  if (/["%]/.test(arg)) throw new Error(`Unsupported character in argument on Windows: ${arg}`);
  return /[\s&|<>^()]/.test(arg) ? `"${arg}"` : arg;
}

/** Run a command; on Windows go through the shell so .cmd shims (npx, claude) resolve. */
export function run(cmd, args, { capture = false } = {}) {
  const options = { stdio: capture ? 'pipe' : 'inherit', encoding: 'utf8' };
  const result = isWindows
    ? spawnSync([cmd, ...args].map(winQuote).join(' '), { ...options, shell: true })
    : spawnSync(cmd, args, options);
  return { status: result.status ?? 1, stdout: result.stdout ?? '', stderr: result.stderr ?? '', error: result.error };
}

const commandCache = new Map();
function commandExists(cmd) {
  if (!commandCache.has(cmd)) {
    const result = isWindows
      ? spawnSync('where', [cmd], { stdio: 'ignore' })
      : spawnSync('sh', ['-c', `command -v ${cmd}`], { stdio: 'ignore' });
    commandCache.set(cmd, result.status === 0);
  }
  return commandCache.get(cmd);
}

// ---------------------------------------------------------------------------
// Selection
// ---------------------------------------------------------------------------

/**
 * Pick items by filters, then add their `requires` dependencies.
 * Returns [{ item, dependency: boolean }].
 */
export function selectItems(catalog, { only, levels, types, ids }) {
  const byId = new Map(catalog.items.map((i) => [i.id, i]));
  let chosen;
  if (ids?.length) {
    const unknown = ids.filter((id) => !byId.has(id));
    if (unknown.length) throw new Error(`Unknown item id(s): ${unknown.join(', ')}. Run "list" to see all ids.`);
    chosen = ids.map((id) => byId.get(id));
  } else {
    chosen = catalog.items.filter((i) =>
      (!only || i.origin === only)
      && (!levels?.length || levels.includes(i.level))
      && (!types?.length || types.includes(i.type)));
  }
  const result = new Map(chosen.map((item) => [item.id, { item, dependency: false }]));
  const queue = [...chosen];
  while (queue.length) {
    const item = queue.shift();
    for (const dep of item.requires ?? []) {
      if (result.has(dep) || !byId.has(dep)) continue;
      result.set(dep, { item: byId.get(dep), dependency: true });
      queue.push(byId.get(dep));
    }
  }
  return [...result.values()];
}

// ---------------------------------------------------------------------------
// Planning
// ---------------------------------------------------------------------------

export function buildPlan(catalog, selection, { targets, scope, local }) {
  const actions = [];
  const global = scope === 'global';

  // Skills: one `npx skills add` call per source repository.
  const skillGroups = new Map();
  for (const { item } of selection.filter((s) => s.item.type === 'skill')) {
    const ownRepo = item.origin === 'own';
    const source = ownRepo && local ? ROOT : item.install.repo;
    if (!skillGroups.has(source)) skillGroups.set(source, []);
    skillGroups.get(source).push(item);
  }
  for (const [source, items] of skillGroups) {
    const args = ['-y', SKILLS_CLI, 'add', source];
    for (const item of items) args.push('--skill', item.install.skill);
    for (const t of targets) args.push('--agent', TARGETS[t].skillsAgent);
    if (global) args.push('--global');
    args.push('--yes');
    actions.push({ kind: 'skills', label: `Skills from ${source}: ${items.map((i) => i.id).join(', ')}`, cli: 'npx', args });
  }

  // Agents: copy/convert the Markdown file into each tool's agents folder.
  for (const { item } of selection.filter((s) => s.item.type === 'agent')) {
    const sourceText = readFileSync(join(ROOT, item.install.path), 'utf8');
    for (const target of targets) {
      actions.push({
        kind: 'file',
        label: `Agent ${item.id} → ${TARGETS[target].label}`,
        file: agentPath(target, scope, item.id),
        content: renderAgent(target, sourceText),
      });
    }
  }

  // MCP servers: register through each tool's CLI or config file.
  for (const { item } of selection.filter((s) => s.item.type === 'mcp')) {
    for (const target of targets) {
      const plan = mcpPlan(target, scope, item.install.server);
      actions.push({
        ...plan,
        kind: 'mcp',
        mode: plan.kind,
        label: `MCP ${item.install.server.name} → ${TARGETS[target].label}`,
        item,
      });
    }
  }
  return actions;
}

// ---------------------------------------------------------------------------
// Output
// ---------------------------------------------------------------------------

const useColor = process.stdout.isTTY && !process.env.NO_COLOR;
const paint = (code) => (text) => (useColor ? `\x1b[${code}m${text}\x1b[0m` : text);
export const c = { bold: paint(1), dim: paint(2), green: paint(32), yellow: paint(33), red: paint(31), cyan: paint(36) };

function describeAction(action) {
  switch (action.kind) {
    case 'skills': return `npx ${action.args.join(' ')}`;
    case 'file': return `write ${action.file}`;
    case 'mcp':
      if (action.mode === 'cli') return action.display;
      if (action.mode === 'json') return `add "${action.name}" to ${action.file} ("${action.rootKey}": ${JSON.stringify(action.entry)})`;
      return `append to ${action.file}: ${action.block.replace(/\n/g, ' | ')}`;
    default: return action.kind;
  }
}

export function printSelection(selection, { targets, scope }) {
  console.log(c.bold('\nItems to install'));
  for (const type of ['skill', 'agent', 'mcp']) {
    const group = selection.filter((s) => s.item.type === type);
    if (!group.length) continue;
    console.log(`  ${c.cyan(`${type}s`)}`);
    for (const { item, dependency } of group) {
      const tag = item.origin === 'own' ? 'own' : `by ${item.author}`;
      console.log(`    - ${item.id} ${c.dim(`(level ${item.level}, ${tag}${dependency ? ', required by another item' : ''})`)}`);
    }
  }
  console.log(`\n  ${c.bold('Targets:')} ${targets.map((t) => TARGETS[t].label).join(', ')}`);
  console.log(`  ${c.bold('Scope:')}   ${scope === 'global' ? 'global (your user profile)' : `project (${process.cwd()})`}`);

  const mcps = selection.filter((s) => s.item.type === 'mcp' && s.item.origin !== 'own');
  if (mcps.length) {
    console.log(c.yellow('\n  Warning: the following third-party MCP servers will be registered.'));
    console.log(c.yellow('  Your AI tools will run these commands or connect to these URLs:'));
    for (const { item } of mcps) {
      const s = item.install.server;
      const what = s.transport === 'stdio' ? `runs: ${[s.command, ...(s.args ?? [])].join(' ')}` : `connects to: ${s.url}`;
      console.log(c.yellow(`    - ${s.name} (${item.author}) ${what}`));
      if (s.auth) {
        const set = Boolean(process.env[s.auth.env]);
        console.log(c.dim(`      ${s.auth.env} is ${set ? 'set: the API key header will be configured' : 'not set: installing without an API key'}.`));
      }
    }
  }
}

export function printPlan(actions) {
  console.log(c.bold('\nPlanned actions'));
  actions.forEach((a, i) => {
    console.log(`  ${String(i + 1).padStart(2)}. ${a.label}`);
    console.log(c.dim(`      ${describeAction(a)}`));
    for (const note of a.notes ?? []) console.log(c.dim(`      note: ${note}`));
  });
}

export async function confirm(question) {
  if (!process.stdin.isTTY) {
    throw new Error('No interactive terminal available to confirm. Re-run with --yes to proceed, or --dry-run to preview.');
  }
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  try {
    const answer = (await rl.question(`${question} [y/N] `)).trim().toLowerCase();
    return answer === 'y' || answer === 'yes';
  } finally {
    rl.close();
  }
}

// ---------------------------------------------------------------------------
// Execution
// ---------------------------------------------------------------------------

// Back up each file once per run, so the .bak holds the state before this run.
const backedUp = new Set();
function backup(file) {
  if (backedUp.has(file)) return;
  backedUp.add(file);
  if (existsSync(file)) copyFileSync(file, `${file}.ai-toolkit.bak`);
}

function writeFileEnsuringDir(file, content) {
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, content);
}

function executeFile(action) {
  if (existsSync(action.file) && readFileSync(action.file, 'utf8') === action.content) {
    return { status: 'skipped', message: 'already up to date' };
  }
  const existed = existsSync(action.file);
  backup(action.file);
  writeFileEnsuringDir(action.file, action.content);
  return { status: 'ok', message: existed ? 'updated (previous version saved as .ai-toolkit.bak)' : 'created' };
}

function executeJsonMerge(action) {
  let doc = {};
  if (existsSync(action.file)) {
    const text = readFileSync(action.file, 'utf8');
    if (text.trim()) {
      try { doc = JSON.parse(text); }
      catch {
        return { status: 'failed', message: `could not parse ${action.file} (comments or invalid JSON). Add this entry manually under "${action.rootKey}":\n${JSON.stringify({ [action.name]: action.entry }, null, 2)}` };
      }
    }
  }
  doc[action.rootKey] ??= {};
  if (doc[action.rootKey][action.name]) return { status: 'skipped', message: `"${action.name}" already configured` };
  doc[action.rootKey][action.name] = action.entry;
  backup(action.file);
  writeFileEnsuringDir(action.file, `${JSON.stringify(doc, null, 2)}\n`);
  return { status: 'ok', message: `added to ${action.file}` };
}

function executeToml(action) {
  const text = existsSync(action.file) ? readFileSync(action.file, 'utf8') : '';
  if (tomlHasServer(text, action.name)) return { status: 'skipped', message: `"${action.name}" already configured` };
  backup(action.file);
  const separator = text === '' ? '' : text.endsWith('\n\n') ? '' : text.endsWith('\n') ? '\n' : '\n\n';
  writeFileEnsuringDir(action.file, `${text}${separator}${action.block}\n`);
  return { status: 'ok', message: `added to ${action.file}` };
}

function executeCli(action) {
  if (!commandExists(action.cli)) {
    return { status: 'skipped', message: `"${action.cli}" CLI not found on PATH. Run it later manually:\n      ${action.display}` };
  }
  if (action.checkArgs && run(action.cli, action.checkArgs, { capture: true }).status === 0) {
    return { status: 'skipped', message: `"${action.item.install.server.name}" already configured` };
  }
  const result = run(action.cli, action.args);
  return result.status === 0
    ? { status: 'ok', message: 'done' }
    : { status: 'failed', message: `exit code ${result.status}` };
}

function executeSkills(action) {
  if (!commandExists('git')) return { status: 'failed', message: 'git is required by "npx skills" to download skills.' };
  const result = run(action.cli, action.args);
  return result.status === 0 ? { status: 'ok', message: 'done' } : { status: 'failed', message: `exit code ${result.status}` };
}

export function execute(actions) {
  const results = [];
  for (const action of actions) {
    console.log(`\n${c.bold('→')} ${action.label}`);
    let result;
    try {
      if (action.kind === 'skills') result = executeSkills(action);
      else if (action.kind === 'file') result = executeFile(action);
      else if (action.mode === 'cli') result = executeCli(action);
      else if (action.mode === 'json') result = executeJsonMerge(action);
      else if (action.mode === 'toml') result = executeToml(action);
      else throw new Error(`Unknown action: ${action.kind}/${action.mode}`);
    } catch (err) {
      result = { status: 'failed', message: err.message };
    }
    const color = result.status === 'ok' ? c.green : result.status === 'skipped' ? c.yellow : c.red;
    console.log(`  ${color(result.status)}: ${result.message}`);
    results.push({ action, ...result });
  }
  return results;
}
