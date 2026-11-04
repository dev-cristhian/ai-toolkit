#!/usr/bin/env node
// ai-toolkit CLI: installs the hub's own and recommended skills, agents and
// MCP servers into Claude Code, Cursor, OpenAI Codex and VS Code + Copilot.
// The install.sh / install.ps1 wrappers and a future npm package all run this file.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT, TARGETS, TYPES, ORIGINS, LEVELS, loadCatalog } from '../lib/catalog.mjs';
import { selectItems, buildPlan, printSelection, printPlan, confirm, execute, c } from '../lib/installer.mjs';

// Minimum Node.js version: the pinned skills CLI (skills@1.7.6) requires >=22.20.0.
const MIN_NODE = [22, 20];

const HELP = `
ai-toolkit: install skills, agents and MCP servers from the hub catalog.

Usage:
  ai-toolkit [install] [options]   Install items (default command)
  ai-toolkit list [options]        List catalog items
  ai-toolkit help                  Show this help

Options:
  --only <own|recommended>         Only own items or only recommendations
  --level <1|2|3>[,...]            Filter by level (1 Methodology, 2 Development, 3 QA & Business)
  --type <skill|agent|mcp>[,...]   Filter by item type
  --id <id>[,...]                  Install specific items by id (ignores other filters)
  --target <name>[,...]            claude, cursor, codex, copilot (default: all four)
  --scope <global|project>         User profile (default) or the current directory
  --local                          Install own skills from this checkout instead of GitHub
  --dry-run                        Show what would be done without changing anything
  -y, --yes                        Do not ask for confirmation
  -h, --help                       Show this help
  -v, --version                    Show the version

Examples:
  ai-toolkit --dry-run
  ai-toolkit --level 1 --target claude,cursor
  ai-toolkit --type mcp --scope project --yes
  ai-toolkit --id grill-me,context7-mcp
`;

function fail(message) {
  console.error(c.red(`Error: ${message}`));
  process.exit(1);
}

function parseArgs(argv) {
  const opts = { command: 'install', targets: [], levels: [], types: [], ids: [], scope: 'global', dryRun: false, yes: false, local: false };
  const listOf = (v) => v.split(',').map((s) => s.trim()).filter(Boolean);
  const args = [...argv];
  if (args[0] && !args[0].startsWith('-')) opts.command = args.shift();

  while (args.length) {
    let arg = args.shift();
    let value;
    if (arg.startsWith('--') && arg.includes('=')) [arg, value] = [arg.slice(0, arg.indexOf('=')), arg.slice(arg.indexOf('=') + 1)];
    const needValue = () => {
      const v = value ?? args.shift();
      if (v === undefined || v.startsWith('-')) fail(`Option ${arg} requires a value.`);
      return v;
    };
    switch (arg) {
      case '--only': opts.only = needValue(); break;
      case '--level': opts.levels.push(...listOf(needValue()).map(Number)); break;
      case '--type': opts.types.push(...listOf(needValue())); break;
      case '--id': opts.ids.push(...listOf(needValue())); break;
      case '--target': opts.targets.push(...listOf(needValue())); break;
      case '--scope': opts.scope = needValue(); break;
      case '--local': opts.local = true; break;
      case '--dry-run': opts.dryRun = true; break;
      case '-y': case '--yes': opts.yes = true; break;
      case '-h': case '--help': opts.command = 'help'; break;
      case '-v': case '--version': opts.command = 'version'; break;
      default: fail(`Unknown option: ${arg}. Run with --help to see all options.`);
    }
  }

  if (opts.only && !ORIGINS.includes(opts.only)) fail(`--only must be one of: ${ORIGINS.join(', ')}.`);
  const badLevel = opts.levels.find((l) => !LEVELS.includes(l));
  if (badLevel !== undefined) fail(`--level must be 1, 2 or 3 (got ${badLevel}).`);
  const badType = opts.types.find((t) => !TYPES.includes(t));
  if (badType) fail(`--type must be one of: ${TYPES.join(', ')} (got ${badType}).`);
  const badTarget = opts.targets.find((t) => !TARGETS[t]);
  if (badTarget) fail(`--target must be one of: ${Object.keys(TARGETS).join(', ')} (got ${badTarget}).`);
  if (!['global', 'project'].includes(opts.scope)) fail('--scope must be "global" or "project".');
  if (!opts.targets.length) opts.targets = Object.keys(TARGETS);
  opts.targets = [...new Set(opts.targets)];
  return opts;
}

function listItems(catalog, opts) {
  const selection = selectItems(catalog, opts).filter((s) => !s.dependency);
  for (const level of catalog.levels) {
    const rows = selection.filter((s) => s.item.level === level.id);
    if (!rows.length) continue;
    console.log(c.bold(`\nLevel ${level.id}: ${level.name_en}`));
    for (const { item } of rows) {
      console.log(`  ${item.id.padEnd(32)} ${item.type.padEnd(6)} ${item.origin === 'own' ? 'own' : item.author}`);
    }
  }
  console.log('');
}

async function main() {
  const [major, minor] = process.versions.node.split('.').map(Number);
  if (major < MIN_NODE[0] || (major === MIN_NODE[0] && minor < MIN_NODE[1])) {
    fail(`Node.js ${MIN_NODE.join('.')}+ is required (found ${process.versions.node}).`);
  }

  const opts = parseArgs(process.argv.slice(2));
  if (opts.command === 'help') { console.log(HELP); return; }
  if (opts.command === 'version') {
    console.log(JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8')).version);
    return;
  }

  const catalog = loadCatalog();
  if (opts.command === 'list') { listItems(catalog, opts); return; }
  if (opts.command !== 'install') fail(`Unknown command: ${opts.command}. Run with --help.`);

  let selection;
  try { selection = selectItems(catalog, opts); } catch (err) { fail(err.message); }
  if (!selection.length) fail('No items match the given filters.');

  const actions = buildPlan(catalog, selection, opts);
  printSelection(selection, opts);
  printPlan(actions);

  if (opts.dryRun) {
    console.log(c.cyan('\nDry run: nothing was changed.'));
    return;
  }
  if (!opts.yes) {
    let ok;
    try { ok = await confirm('\nProceed with the installation?'); } catch (err) { fail(err.message); }
    if (!ok) { console.log('Cancelled. Nothing was changed.'); return; }
  }

  const results = execute(actions);
  const count = (s) => results.filter((r) => r.status === s).length;
  console.log(c.bold(`\nSummary: ${count('ok')} done, ${count('skipped')} skipped, ${count('failed')} failed.`));
  console.log('Restart your AI tools (or open a new session) to load the new items.');
  if (count('failed')) process.exit(1);
}

main().catch((err) => fail(err.stack ?? String(err)));
