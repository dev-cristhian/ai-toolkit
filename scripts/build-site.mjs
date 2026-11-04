// Generates site/data.json and pre-renders the pt-BR content of
// site/index.html (quick start, glossary, install guides, catalog, credits)
// from catalog.json + glossary.json. Never edit those sections by hand.
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  ROOT, TARGETS, loadCatalog, loadGlossary, hubInstallCommands, mcpSnippets, sourceUrl, stringifyJson,
  repoOwner, isNonCommercial,
} from '../lib/catalog.mjs';
import { replaceBetween } from './lib/markers.mjs';

const catalog = loadCatalog();
const glossary = loadGlossary();
const INDEX = join(ROOT, 'site', 'index.html');
const DATA = join(ROOT, 'site', 'data.json');

const TYPE_LABEL = { skill: 'Skill', agent: 'Agent', mcp: 'MCP' };
const TYPE_PLURAL = { skill: 'Skills', agent: 'Agents', mcp: 'MCPs' };

// --- helpers ---------------------------------------------------------------
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const inline = (s) => esc(s).replace(/`([^`]+)`/g, '<code>$1</code>');
const searchText = (...parts) => esc(parts.flat().filter(Boolean).join(' ').toLowerCase());
const indent = (html, n) => html.split('\n').map((l) => (l ? ' '.repeat(n) + l : l)).join('\n');

function commandBlock(label, command, context) {
  return [
    '<div class="cmd">',
    `  <span class="cmd__label">${esc(label)}</span>`,
    '  <div class="cmd__row">',
    `    <pre tabindex="0"><code>${esc(command)}</code></pre>`,
    `    <button type="button" class="btn-copy" data-copy="${esc(command)}"><svg aria-hidden="true" focusable="false"><use href="#i-copy"/></svg><span class="btn-copy__text">Copiar</span><span class="visually-hidden"> ${esc(context)}</span></button>`,
    '  </div>',
    '</div>',
  ].join('\n');
}

// --- quick start -----------------------------------------------------------
const hub = hubInstallCommands(catalog);

function renderQuickstart() {
  return indent([
    commandBlock('macOS e Linux', hub.unix, 'comando de instalação para macOS e Linux'),
    commandBlock('Windows (PowerShell)', hub.windows, 'comando de instalação para Windows'),
    '<p class="results-count">O instalador mostra o plano e pede confirmação antes de mudar qualquer coisa. Para só visualizar, use a opção <code>--dry-run</code> (veja <a href="#como-instalar">Como instalar</a>).</p>',
  ].join('\n'), 10);
}

// --- glossary --------------------------------------------------------------
function renderGlossary() {
  const cats = new Map(glossary.categories.map((c) => [c.id, c.label]));
  const chips = [
    '<button type="button" class="chip" data-glossary-category="" aria-pressed="true">Todos</button>',
    ...glossary.categories.map((c) => `<button type="button" class="chip" data-glossary-category="${esc(c.id)}" aria-pressed="false">${esc(c.label)}</button>`),
  ];
  const terms = [...glossary.terms].sort((a, b) => a.term.localeCompare(b.term, 'en'));
  const items = terms.map((t) => [
    `<div class="term" id="termo-${esc(t.id)}" data-category="${esc(t.category)}" data-search="${searchText(t.term, t.definition, t.example, cats.get(t.category))}">`,
    `  <dt><dfn>${esc(t.term)}</dfn></dt>`,
    '  <dd>',
    `    <span class="badge term__cat">${esc(cats.get(t.category))}</span>`,
    `    <p>${inline(t.definition)}</p>`,
    t.example ? `    <p class="term__example"><strong>Exemplo:</strong> ${inline(t.example)}</p>` : null,
    '  </dd>',
    '</div>',
  ].filter(Boolean).join('\n'));

  return indent([
    '<div class="toolbar" data-glossary-toolbar hidden>',
    '  <div class="field">',
    '    <label for="glossary-search">Buscar termo</label>',
    '    <input type="search" id="glossary-search" placeholder="Ex.: token, RAG, agent" autocomplete="off" aria-describedby="glossary-count">',
    '  </div>',
    '  <fieldset class="chips">',
    '    <legend>Categoria</legend>',
    indent(chips.join('\n'), 4),
    '  </fieldset>',
    '</div>',
    `<p class="results-count" id="glossary-count" data-total="${terms.length}">${terms.length} termos</p>`,
    '<dl class="glossary" id="glossary-list">',
    indent(items.join('\n'), 2),
    '</dl>',
    '<p class="empty" id="glossary-empty" hidden>Nenhum termo encontrado. Tente outra palavra ou escolha “Todos”.</p>',
  ].join('\n'), 6);
}

// --- install guides --------------------------------------------------------
const INSTALL_GUIDES = {
  claude: {
    title: 'Claude Code',
    prereq: 'Node.js 22.20 ou mais recente, Git e o Claude Code instalado (o comando <code>claude</code> precisa estar no PATH para registrar os MCPs).',
    where: [
      ['Skills', '<code>~/.claude/skills/</code> (atalho para a cópia em <code>~/.agents/skills/</code>)'],
      ['Agents', '<code>~/.claude/agents/</code>'],
      ['MCPs', '<code>~/.claude.json</code> (via <code>claude mcp add --scope user</code>)'],
    ],
    verify: 'Abra uma nova sessão do Claude Code: <code>/agents</code> lista os agents, <code>/mcp</code> mostra os MCPs e você pode perguntar “quais skills você tem?”.',
    extra: 'No app do Claude (claude.ai), as skills podem ser enviadas como .zip em Configurações → Capabilities → Skills.',
  },
  cursor: {
    title: 'Cursor',
    prereq: 'Node.js 22.20 ou mais recente, Git e o Cursor instalado.',
    where: [
      ['Skills', '<code>~/.agents/skills/</code> (pasta compartilhada que o Cursor lê direto)'],
      ['Agents', '<code>~/.cursor/agents/</code>'],
      ['MCPs', '<code>~/.cursor/mcp.json</code>'],
    ],
    verify: 'Reinicie o Cursor e abra <strong>Cursor Settings → MCP</strong> para ver os servidores. As skills e os agents aparecem no chat do agent.',
  },
  codex: {
    title: 'Codex',
    prereq: 'Node.js 22.20 ou mais recente, Git e o OpenAI Codex (CLI, app ou extensão).',
    where: [
      ['Skills', '<code>~/.agents/skills/</code> (pasta compartilhada que o Codex lê direto)'],
      ['Agents', '<code>~/.codex/agents/*.toml</code> (convertidos automaticamente de Markdown para TOML)'],
      ['MCPs', '<code>~/.codex/config.toml</code>'],
    ],
    verify: 'Rode <code>codex mcp list</code> para ver os MCPs e, numa nova sessão, peça ao Codex para listar as skills disponíveis.',
  },
  copilot: {
    title: 'VS Code + Copilot',
    prereq: 'Node.js 22.20 ou mais recente, Git, VS Code e a extensão do GitHub Copilot.',
    where: [
      ['Skills', '<code>~/.agents/skills/</code> (pasta compartilhada que o Copilot lê direto)'],
      ['Agents', '<code>~/.copilot/agents/*.agent.md</code>'],
      ['MCPs', '<code>~/.copilot/mcp-config.json</code>'],
    ],
    verify: 'Recarregue o VS Code. No Chat, abra o seletor de agents para ver os agents; o comando <strong>MCP: List Servers</strong> mostra os MCPs.',
  },
};

function renderInstall() {
  const tabs = Object.entries(INSTALL_GUIDES).map(([id, g], i) =>
    `<button type="button" class="tabs__tab" role="tab" id="tab-${id}" aria-controls="painel-${id}" aria-selected="${i === 0}" tabindex="${i === 0 ? 0 : -1}">${esc(g.title)}</button>`);
  const panels = Object.entries(INSTALL_GUIDES).map(([id, g]) => {
    const cmds = hubInstallCommands(catalog, `--target ${id}`);
    return [
      `<section class="tab-panel" id="painel-${id}" aria-labelledby="tab-${id} painel-${id}-titulo">`,
      `  <h3 class="tab-panel__title" id="painel-${id}-titulo">${esc(g.title)}</h3>`,
      `  <p><strong>Pré-requisitos:</strong> ${g.prereq}</p>`,
      indent(commandBlock('macOS e Linux', cmds.unix, `para ${g.title} no macOS e Linux`), 2),
      indent(commandBlock('Windows (PowerShell)', cmds.windows, `para ${g.title} no Windows`), 2),
      '  <h4>Onde cada item é instalado</h4>',
      '  <dl>',
      ...g.where.map(([k, v]) => `    <dt>${esc(k)}</dt><dd>${v}</dd>`),
      '  </dl>',
      `  <p><strong>Como conferir:</strong> ${g.verify}</p>`,
      g.extra ? `  <p class="note">${esc(g.extra)}</p>` : null,
      '</section>',
    ].filter(Boolean).join('\n');
  });
  return indent([
    '<div class="tabs" data-tabs>',
    '  <div class="tabs__list" role="tablist" aria-label="Ferramenta" hidden>',
    indent(tabs.join('\n'), 4),
    '  </div>',
    indent(panels.join('\n'), 2),
    '</div>',
    '<p class="note">Opções úteis: <code>--level 1</code>, <code>--type mcp</code>, <code>--only own</code>, <code>--id grill-me</code>, <code>--scope project</code> (instala só na pasta atual), <code>--dry-run</code> e <code>--yes</code>. Para MCPs de terceiros, o instalador sempre lista os comandos e URLs antes de registrar.</p>',
  ].join('\n'), 6);
}

// --- catalog ---------------------------------------------------------------
function renderCard(item) {
  const titleId = `item-${item.id}`;
  const link = sourceUrl(item);
  const parts = [
    `<li class="card-item" data-type="${item.type}" data-origin="${item.origin}" data-search="${searchText(item.name, item.id, item.description_pt, item.author, item.tags, TYPE_LABEL[item.type])}">`,
    `  <article class="card" aria-labelledby="${titleId}">`,
    '    <div class="card__meta">',
    `      <span class="badge">${TYPE_LABEL[item.type]}</span>`,
    item.origin === 'own' ? '      <span class="badge badge--own">Meu item</span>' : null,
    '    </div>',
    `    <h5 class="card__title" id="${titleId}">${esc(item.name)}</h5>`,
    `    <p class="card__desc">${inline(item.description_pt)}</p>`,
    `    <p class="card__author">Autor: ${esc(item.author)}${item.license ? ` · Licença: ${esc(item.license)}` : ''}</p>`,
    isNonCommercial(item.license) ? '    <p class="note">Licença não comercial: o uso em trabalho remunerado ou produto comercial depende de autorização do autor.</p>' : null,
    indent(commandBlock(item.type === 'mcp' ? 'Instalar no Claude Code' : 'Instalar', item.install.command, `comando de instalação de ${item.name}`), 4),
  ];

  if (item.type === 'mcp') {
    const s = mcpSnippets(item.install.server);
    parts.push(
      '    <details>',
      '      <summary>Comandos para outras ferramentas</summary>',
      indent(commandBlock('Codex', s.codex, `para ${item.name} no Codex`), 6),
      indent(commandBlock('VS Code + Copilot', s.copilot, `para ${item.name} no VS Code`), 6),
      indent(commandBlock('Cursor (~/.cursor/mcp.json)', s.cursor, `para ${item.name} no Cursor`), 6),
      item.install.server.auth ? `      <p class="card__author">API key opcional: defina a variável de ambiente <code>${esc(item.install.server.auth.env)}</code> antes de rodar o instalador do hub.</p>` : null,
      '    </details>',
    );
  } else if (item.type === 'agent') {
    parts.push(
      '    <details>',
      '      <summary>Comando para Windows</summary>',
      indent(commandBlock('Windows (PowerShell)', hubInstallCommands(catalog, `--id ${item.id}`).windows, `de ${item.name} no Windows`), 6),
      '    </details>',
    );
  }
  if (item.requires?.length) parts.push(`    <p class="card__author">Instala junto: ${item.requires.map(esc).join(', ')}</p>`);
  if (link) parts.push(`    <a class="card__link" href="${esc(link)}">Ver fonte<span class="visually-hidden"> de ${esc(item.name)}</span></a>`);
  parts.push('  </article>', '</li>');
  return parts.filter((p) => p !== null).join('\n');
}

function renderGroup(level, origin, items) {
  const id = `nivel-${level.id}-${origin === 'own' ? 'meus' : 'recomendados'}`;
  const title = origin === 'own' ? 'Meus itens' : 'Recomendações';
  const emptyText = origin === 'own'
    ? 'Em breve: ainda não há itens próprios neste nível.'
    : 'Em breve: ainda não há recomendações neste nível.';
  return [
    '<div class="group" data-group>',
    `  <h4 id="${id}">${title} <span class="results-count" data-group-count>(${items.length})</span></h4>`,
    items.length
      ? `  <ul class="cards" role="list">\n${indent(items.map(renderCard).join('\n'), 4)}\n  </ul>`
      : `  <p class="empty">${emptyText}</p>`,
    items.length ? '  <p class="empty" data-filter-empty hidden>Nenhum item deste grupo corresponde aos filtros.</p>' : null,
    '</div>',
  ].filter(Boolean).join('\n');
}

function renderCatalog() {
  const total = catalog.items.length;
  const chips = [
    '<button type="button" class="chip" data-catalog-type="" aria-pressed="true">Todos</button>',
    ...['skill', 'agent', 'mcp'].map((t) => `<button type="button" class="chip" data-catalog-type="${t}" aria-pressed="false">${TYPE_PLURAL[t]}</button>`),
  ];
  const levels = catalog.levels.map((level) => {
    const items = catalog.items.filter((i) => i.level === level.id);
    return [
      `<section class="level" id="nivel-${level.id}" aria-labelledby="nivel-${level.id}-titulo">`,
      '  <div class="level__header">',
      `    <span class="level__number" aria-hidden="true">${level.id}</span>`,
      `    <h3 id="nivel-${level.id}-titulo">Nível ${level.id}: ${esc(level.name_pt)}</h3>`,
      '  </div>',
      `  <p class="section__lead">${esc(level.description_pt)}</p>`,
      indent(renderGroup(level, 'own', items.filter((i) => i.origin === 'own')), 2),
      indent(renderGroup(level, 'recommended', items.filter((i) => i.origin === 'recommended')), 2),
      '</section>',
    ].join('\n');
  });
  return indent([
    '<nav aria-label="Níveis do catálogo">',
    '  <ul class="level__nav">',
    ...catalog.levels.map((l) => `    <li><a href="#nivel-${l.id}">Nível ${l.id}: ${esc(l.name_pt)}</a></li>`),
    '  </ul>',
    '</nav>',
    '<div class="toolbar" data-catalog-toolbar hidden>',
    '  <div class="field">',
    '    <label for="catalog-search">Buscar no catálogo</label>',
    '    <input type="search" id="catalog-search" placeholder="Ex.: angular, testes, planejamento" autocomplete="off" aria-describedby="catalog-count">',
    '  </div>',
    '  <fieldset class="chips">',
    '    <legend>Tipo</legend>',
    indent(chips.join('\n'), 4),
    '  </fieldset>',
    '</div>',
    `<p class="results-count" id="catalog-count" data-total="${total}">${total} itens</p>`,
    ...levels,
  ].join('\n'), 6);
}

// --- credits ---------------------------------------------------------------
function renderCredits() {
  const authors = new Map();
  for (const item of catalog.items.filter((i) => i.origin === 'recommended')) {
    const key = `${item.author}|${item.source.repo}`;
    if (!authors.has(key)) authors.set(key, { author: item.author, repo: item.source.repo, license: item.license, items: [] });
    authors.get(key).items.push(item.name);
  }
  const rows = [...authors.values()].sort((a, b) => a.repo.localeCompare(b.repo))
    .map((a) => `  <li><a href="${esc(a.repo)}">${esc(new URL(a.repo).pathname.slice(1))}</a> (${esc(a.license ?? 'ver repositório')})</li>`);
  const owner = repoOwner(catalog);
  return indent([
    '<ul class="credits">', ...rows, '</ul>',
    `<p>Feito por <a href="https://github.com/${esc(owner)}">${esc(owner)}</a> · <a href="${esc(catalog.repository)}">Código-fonte no GitHub</a></p>`,
  ].join('\n'), 4);
}

// --- URLs in the static template -------------------------------------------
// Tags marked with data-url="<key>" get their href/content from catalog.json,
// so the repository and site URLs are defined in a single place.
function syncUrls(html) {
  const urls = {
    site: catalog.site,
    repository: catalog.repository,
    'readme-install': `${catalog.repository}#install-guides`,
  };
  return html.replace(/<(a|link|meta)\b[^>]*\bdata-url="([^"]+)"[^>]*>/g, (tag, _name, key) => {
    if (!(key in urls)) throw new Error(`Unknown data-url key "${key}" in site/index.html.`);
    return tag.replace(/\b(href|content)="[^"]*"/, `$1="${esc(urls[key])}"`);
  });
}

// --- data.json -------------------------------------------------------------
function buildData() {
  return {
    repository: catalog.repository,
    site: catalog.site,
    install: hub,
    targets: Object.fromEntries(Object.entries(TARGETS).map(([k, v]) => [k, v.label])),
    levels: catalog.levels.map((l) => ({
      id: l.id, slug: l.slug, name: l.name_pt, description: l.description_pt,
      items: catalog.items.filter((i) => i.level === l.id).map((i) => ({
        id: i.id, type: i.type, origin: i.origin, name: i.name, description: i.description_pt,
        author: i.author, license: i.license ?? null, url: sourceUrl(i), command: i.install.command,
        tags: i.tags, requires: i.requires ?? [],
        ...(i.type === 'mcp' ? { commands: mcpSnippets(i.install.server) } : {}),
      })),
    })),
    glossary,
  };
}

// --- write -----------------------------------------------------------------
let html = readFileSync(INDEX, 'utf8');
html = replaceBetween(html, 'QUICKSTART', renderQuickstart());
html = replaceBetween(html, 'GLOSSARY', renderGlossary());
html = replaceBetween(html, 'INSTALL', renderInstall());
html = replaceBetween(html, 'CATALOG', renderCatalog());
html = replaceBetween(html, 'CREDITS', renderCredits());
html = syncUrls(html);

const results = [
  [INDEX, html],
  [DATA, stringifyJson(buildData())],
];
for (const [file, content] of results) {
  let current = null;
  try { current = readFileSync(file, 'utf8'); } catch { /* new file */ }
  if (current === content) {
    console.log(`${file.slice(ROOT.length + 1)} is up to date.`);
  } else {
    writeFileSync(file, content);
    console.log(`${file.slice(ROOT.length + 1)} updated.`);
  }
}
