# ai-toolkit

[![Validate](https://github.com/dev-cristhian/ai-toolkit/actions/workflows/validate.yml/badge.svg)](https://github.com/dev-cristhian/ai-toolkit/actions/workflows/validate.yml)
[![Pages](https://github.com/dev-cristhian/ai-toolkit/actions/workflows/pages.yml/badge.svg)](https://dev-cristhian.github.io/ai-toolkit/)
[![License: MIT](https://img.shields.io/badge/license-MIT-477A91.svg)](./LICENSE)

A personal hub of the **skills**, **agents** and **MCP servers** I use and recommend for working with AI, installable with **one command** into **Claude Code**, **Cursor**, **OpenAI Codex** and **VS Code + GitHub Copilot**.

🌐 **Website (pt-BR):** <https://dev-cristhian.github.io/ai-toolkit/>. It includes an AI glossary written for a Brazilian audience.

---

## Table of contents

- [What is this?](#what-is-this)
- [Quick start](#quick-start)
- [Installer options](#installer-options)
- [Install guides](#install-guides)
  - [Claude Code](#claude-code)
  - [Cursor](#cursor)
  - [OpenAI Codex](#openai-codex)
  - [VS Code + GitHub Copilot](#vs-code--github-copilot)
  - [Tool support matrix](#tool-support-matrix)
- [Catalog](#catalog)
- [How it works](#how-it-works)
- [Project structure](#project-structure)
- [Accessibility](#accessibility)
- [Credits & licenses](#credits--licenses)

## What is this?

The hub has two kinds of items, both described in a single source of truth, [`catalog.json`](./catalog.json):

1. **Own items.** Skills, agents and MCP definitions that I write and maintain in this repository ([`skills/`](./skills), [`agents/`](./agents), [`mcps/`](./mcps)).
2. **Recommended items.** A curated wall of third-party items. The repository stores **only a reference** (link and metadata). Nothing is copied; each one installs straight from its author's repository.

Items are organized in three levels:

| Level | Focus |
| --- | --- |
| 1. Methodology | General ways of working with AI: clarifying, brainstorming, planning |
| 2. Development | Frameworks, up-to-date docs, performance, UI quality |
| 3. QA & Business | Testing, product discovery, requirements, specs, tickets |

The README tables, the website data (`site/data.json`, a public JSON of the catalog and glossary) and the website content are **generated** from `catalog.json` and [`glossary.json`](./glossary.json).

## Quick start

Requirements: [Node.js](https://nodejs.org) 22.20+ (required by the `skills` CLI) and [Git](https://git-scm.com). The installer always prints its plan and asks for confirmation before changing anything.

**macOS / Linux**

```bash
curl -fsSL https://raw.githubusercontent.com/dev-cristhian/ai-toolkit/main/install.sh | bash
```

**Windows (PowerShell)**

```powershell
irm https://raw.githubusercontent.com/dev-cristhian/ai-toolkit/main/install.ps1 | iex
```

Preview first, without changing anything:

```bash
curl -fsSL https://raw.githubusercontent.com/dev-cristhian/ai-toolkit/main/install.sh | bash -s -- --dry-run
```

```powershell
& ([scriptblock]::Create((irm https://raw.githubusercontent.com/dev-cristhian/ai-toolkit/main/install.ps1))) --dry-run
```

From a local clone:

```bash
git clone https://github.com/dev-cristhian/ai-toolkit.git
cd ai-toolkit
./install.sh --dry-run          # macOS / Linux
.\install.ps1 --dry-run         # Windows
node bin/ai-toolkit.mjs --help  # any OS
```

By default everything is installed **globally** (your user profile) for **all four tools**.

## Installer options

| Option | Description |
| --- | --- |
| `--only own\|recommended` | Only own items, or only recommendations |
| `--level 1,2,3` | Filter by level |
| `--type skill,agent,mcp` | Filter by item type |
| `--id <id>[,<id>]` | Install specific items (ids are listed in the [catalog](#catalog) or with `list`) |
| `--target claude,cursor,codex,copilot` | Tools to install into (default: all) |
| `--scope global\|project` | User profile (default) or the current directory |
| `--local` | Install own skills from the local checkout instead of GitHub |
| `--dry-run` | Print the plan without changing anything |
| `-y`, `--yes` | Skip the confirmation prompt (required in non-interactive shells) |
| `list` | List catalog items (accepts the same filters) |

Examples:

```bash
./install.sh --level 1 --target claude,cursor   # methodology items for Claude Code and Cursor
./install.sh --type mcp --scope project         # MCP servers for the current project only
./install.sh --id grill-me,context7-mcp --yes   # two specific items, no prompt
./install.sh list --level 3                     # what is in level 3?
```

How each type is installed:

- **Skills** (own and recommended) use the [`skills` CLI](https://github.com/vercel-labs/skills) (`npx skills add <repo> --skill <name>`), pinned to a tested version (1.7.6). The CLI keeps one canonical copy in `~/.agents/skills/` that Cursor, Codex and Copilot read directly, and symlinks it into `~/.claude/skills/` for Claude Code. Own skills point to this repository, and recommended skills point to the author's original repository.
- **Agents** are copied (and converted when needed) into each tool's agents folder.
- **MCP servers** are registered through each tool's CLI or config file. The installer **lists every third-party command and URL** before registering anything, never overwrites an existing server with the same name, and saves a `.ai-toolkit.bak` copy of any config file it changes.
- Items can declare dependencies (`requires`). For example, `web-pending-change-auditor` installs `web-design-guidelines` as well.

> **Context7 API key (optional).** Context7 works without a key, with lower rate limits. To use a key, set `CONTEXT7_API_KEY` before running the installer. Cursor, Copilot and Codex store a reference to the variable (`${env:...}`, `${...}`, `bearer_token_env_var`), never the key itself. Claude Code stores the header value in `~/.claude.json`.

## Install guides

Each guide shows the one-line install for that tool, where files go, and how to verify, update and remove items.

### Claude Code

**Prerequisites:** Node.js 22.20+, Git and [Claude Code](https://code.claude.com/docs) with the `claude` command on your `PATH` (the installer uses it to register MCP servers).

**Install**

```bash
curl -fsSL https://raw.githubusercontent.com/dev-cristhian/ai-toolkit/main/install.sh | bash -s -- --target claude
```

```powershell
& ([scriptblock]::Create((irm https://raw.githubusercontent.com/dev-cristhian/ai-toolkit/main/install.ps1))) --target claude
```

| Type | Global location | Project location (`--scope project`) |
| --- | --- | --- |
| Skills | `~/.claude/skills/` (symlink to the shared `~/.agents/skills/` copy) | `.claude/skills/` |
| Agents | `~/.claude/agents/<id>.md` | `.claude/agents/<id>.md` |
| MCP servers | `~/.claude.json` via `claude mcp add --scope user` | `.mcp.json` via `claude mcp add --scope project` |

Manual equivalents:

```bash
npx skills add https://github.com/mattpocock/skills --skill grill-me --agent claude-code --global
claude mcp add --scope user playwright -- npx -y @playwright/mcp@latest
claude mcp add --scope user --transport http microsoft-learn https://learn.microsoft.com/api/mcp
```

**Verify:** start a new session and run `/agents` (agents), `/mcp` (MCP servers) and ask *"Which skills do you have available?"*. You can also run `claude mcp list`.

**Update:** run the installer again (agents are updated in place; skills with `npx skills update`). **Remove:** `npx skills remove <skill> --agent claude-code --global`, `claude mcp remove <name>`, and delete `~/.claude/agents/<id>.md`.

**Claude apps (claude.ai / desktop):** skills can also be used in the Claude apps by zipping a skill folder and uploading it under *Settings → Capabilities → Skills*. Agents and the CLI-registered MCP servers apply to Claude Code only.

### Cursor

**Prerequisites:** Node.js 22.20+, Git and [Cursor](https://cursor.com/docs).

**Install**

```bash
curl -fsSL https://raw.githubusercontent.com/dev-cristhian/ai-toolkit/main/install.sh | bash -s -- --target cursor
```

```powershell
& ([scriptblock]::Create((irm https://raw.githubusercontent.com/dev-cristhian/ai-toolkit/main/install.ps1))) --target cursor
```

| Type | Global location | Project location |
| --- | --- | --- |
| Skills | `~/.agents/skills/` (shared folder Cursor reads directly) | `.agents/skills/` |
| Agents | `~/.cursor/agents/<id>.md` | `.cursor/agents/<id>.md` |
| MCP servers | `~/.cursor/mcp.json` (`mcpServers`) | `.cursor/mcp.json` |

Manual MCP equivalent (`~/.cursor/mcp.json`):

```json
{
  "mcpServers": {
    "playwright": { "command": "npx", "args": ["-y", "@playwright/mcp@latest"] },
    "context7": { "url": "https://mcp.context7.com/mcp" }
  }
}
```

**Verify:** restart Cursor and open *Cursor Settings → MCP* to see the servers. Agents and skills are available to the agent in chat. Cursor also reads `~/.claude/agents/`; when names collide, `.cursor/` wins.

**Update:** run the installer again. **Remove:** `npx skills remove <skill> --agent cursor --global`, delete the server entry from `~/.cursor/mcp.json` and the agent file from `~/.cursor/agents/`.

### OpenAI Codex

**Prerequisites:** Node.js 22.20+, Git and [Codex](https://developers.openai.com/codex) (CLI, IDE extension or app).

**Install**

```bash
curl -fsSL https://raw.githubusercontent.com/dev-cristhian/ai-toolkit/main/install.sh | bash -s -- --target codex
```

```powershell
& ([scriptblock]::Create((irm https://raw.githubusercontent.com/dev-cristhian/ai-toolkit/main/install.ps1))) --target codex
```

| Type | Global location | Project location |
| --- | --- | --- |
| Skills | `~/.agents/skills/` (shared folder Codex reads directly) | `.agents/skills/` |
| Agents | `~/.codex/agents/<id>.toml` | `.codex/agents/<id>.toml` |
| MCP servers | `~/.codex/config.toml` (`[mcp_servers.<name>]`) | `.codex/config.toml` |

Codex custom agents are TOML files (`name`, `description`, `developer_instructions`). The installer **converts** the Markdown agents automatically. `CODEX_HOME` is respected.

Manual equivalents:

```bash
codex mcp add playwright -- npx -y @playwright/mcp@latest
codex mcp add context7 --url https://mcp.context7.com/mcp
```

**Verify:** `codex mcp list`, then ask Codex in a new session to list its available skills and agents.

**Update:** run the installer again. **Remove:** `npx skills remove <skill> --agent codex --global`, delete the `[mcp_servers.<name>]` table from `~/.codex/config.toml` and the agent file from `~/.codex/agents/`.

### VS Code + GitHub Copilot

**Prerequisites:** Node.js 22.20+, Git, [VS Code](https://code.visualstudio.com) and the GitHub Copilot extension.

**Install**

```bash
curl -fsSL https://raw.githubusercontent.com/dev-cristhian/ai-toolkit/main/install.sh | bash -s -- --target copilot
```

```powershell
& ([scriptblock]::Create((irm https://raw.githubusercontent.com/dev-cristhian/ai-toolkit/main/install.ps1))) --target copilot
```

| Type | Global location | Project location |
| --- | --- | --- |
| Skills | `~/.agents/skills/` (shared folder Copilot reads directly) | `.agents/skills/` |
| Agents | `~/.copilot/agents/<id>.agent.md` | `.github/agents/<id>.agent.md` |
| MCP servers | `~/.copilot/mcp-config.json` (portable Copilot format, `mcpServers`) | `.vscode/mcp.json` (VS Code format, `servers`) |

`COPILOT_HOME` is respected. If your `.vscode/mcp.json` has comments, the installer will not rewrite it; it prints the entry for you to paste instead.

Manual MCP equivalent (adds to your VS Code user profile):

```bash
code --add-mcp '{"name":"playwright","type":"stdio","command":"npx","args":["-y","@playwright/mcp@latest"]}'
```

**Verify:** reload VS Code, open Chat and check the agent picker. Run **MCP: List Servers** from the Command Palette.

**Update:** run the installer again. **Remove:** `npx skills remove <skill> --agent github-copilot --global`, delete the server entry from `~/.copilot/mcp-config.json` and the agent file from `~/.copilot/agents/`.

### Tool support matrix

Verified against the official documentation of each tool in November 2026.

| | Claude Code | Cursor | Codex | VS Code + Copilot |
| --- | --- | --- | --- | --- |
| Skills (`SKILL.md`) | ✅ | ✅ | ✅ | ✅ |
| Agents | ✅ Markdown | ✅ Markdown | ✅ TOML (auto-converted) | ✅ `.agent.md` |
| MCP (stdio) | ✅ CLI | ✅ `mcp.json` | ✅ `config.toml` | ✅ `mcp-config.json` |
| MCP (HTTP) | ✅ CLI | ✅ `mcp.json` | ✅ `config.toml` | ✅ `mcp-config.json` |
| MCP API key without storing the secret | ❌ value stored | ✅ `${env:VAR}` | ✅ `bearer_token_env_var` | ✅ `${VAR}` |

Not covered: Claude apps (claude.ai/desktop) are only supported for skills (manual upload). Cursor cloud agents use the MCP servers configured for your team at cursor.com.

## Catalog

<!-- CATALOG:START -->
_22 items (3 own, 19 recommended). Generated from `catalog.json`; do not edit this section by hand._

### Level 1: Methodology

General-purpose ways of working with AI: clarifying ideas, brainstorming and planning before writing code.

**Own**

| Name | Type | Description | Install |
| --- | --- | --- | --- |
| [portuguese-text-revision](./skills/portuguese-text-revision) | Skill | Corrects and improves Portuguese (pt-BR) text while preserving its meaning, information and intent. Use whenever the user asks to correct, proofread, revise, polish or improve a text written in Portuguese, or pastes Portuguese text and asks for it to be fixed, even if they do not say the word "skill". Returns only the revised text as plain text, with no explanations and no Markdown. | `npx skills add https://github.com/dev-cristhian/ai-toolkit --skill portuguese-text-revision` |

**Recommended**

| Name | Type | Author | Description | Install |
| --- | --- | --- | --- | --- |
| [brainstorming](https://github.com/obra/superpowers/tree/HEAD/skills/brainstorming) | Skill | obra | Turns rough ideas into a validated design through collaborative, one-question-at-a-time dialogue before implementation. | `npx skills add https://github.com/obra/superpowers --skill brainstorming` |
| [grill-me](https://github.com/mattpocock/skills/tree/HEAD/skills/productivity/grill-me) | Skill | mattpocock | Relentlessly interviews you about a plan or design until every branch of the decision tree is resolved. | `npx skills add https://github.com/mattpocock/skills --skill grill-me` |
| [writing-plans](https://github.com/obra/superpowers/tree/HEAD/skills/writing-plans) | Skill | obra | Writes detailed, step-by-step implementation plans that an agent (or a teammate) can execute with little context. | `npx skills add https://github.com/obra/superpowers --skill writing-plans` |

### Level 2: Development

Day-to-day software engineering: frameworks, up-to-date documentation, performance and UI quality.

**Own**

| Name | Type | Description | Install |
| --- | --- | --- | --- |
| [web-design-guidelines](./skills/web-design-guidelines) | Skill | Create, improve, or audit web interfaces and reusable UI components for accessibility, responsive design, UX, Lighthouse quality, and SEO. Use for Vanilla HTML/CSS/JavaScript, Node-based web tooling, Angular, React, or ASP.NET Core MVC/Razor Pages; do not use for backend-only tasks. | `npx skills add https://github.com/dev-cristhian/ai-toolkit --skill web-design-guidelines` |
| [web-pending-change-auditor](./agents/web-pending-change-auditor.md) | Agent | Read-only multi-stack code-review agent that audits pending Vanilla, Node, Angular, React, and ASP.NET MVC/Razor web changes in Git or TFVC/TFS against project guidelines. | `curl -fsSL https://raw.githubusercontent.com/dev-cristhian/ai-toolkit/main/install.sh \| bash -s -- --id web-pending-change-auditor` |

**Recommended**

| Name | Type | Author | Description | Install |
| --- | --- | --- | --- | --- |
| [analyzing-dotnet-performance](https://github.com/dotnet/skills/tree/HEAD/plugins/dotnet-diag/skills/analyzing-dotnet-performance) | Skill | dotnet | Scans .NET code for about 50 performance anti-patterns (async, memory, strings, LINQ, regex, serialization, I/O) with tiered severity. | `npx skills add https://github.com/dotnet/skills --skill analyzing-dotnet-performance` |
| [angular-developer](https://github.com/angular/skills/tree/HEAD/angular-developer) | Skill | angular | Official Angular team skill for writing modern Angular code (signals, standalone components, current APIs). | `npx skills add https://github.com/angular/skills --skill angular-developer` |
| [dotnet-webapi](https://github.com/dotnet/skills/tree/HEAD/plugins/dotnet-aspnetcore/skills/dotnet-webapi) | Skill | dotnet | Guides creating and changing ASP.NET Core Web API endpoints with correct HTTP semantics, OpenAPI metadata and error handling. | `npx skills add https://github.com/dotnet/skills --skill dotnet-webapi` |
| [frontend-design](https://github.com/anthropics/skills/tree/HEAD/skills/frontend-design) | Skill | anthropics | Guides distinctive, intentional visual design when building or reshaping a UI: aesthetic direction, typography and non-templated choices. | `npx skills add https://github.com/anthropics/skills --skill frontend-design` |
| [optimizing-ef-core-queries](https://github.com/dotnet/skills/tree/HEAD/plugins/dotnet-data/skills/optimizing-ef-core-queries) | Skill | dotnet | Reviews and optimizes Entity Framework Core data access: slow or memory-heavy queries, excessive round-trips and hidden SaveChanges. | `npx skills add https://github.com/dotnet/skills --skill optimizing-ef-core-queries` |
| [Angular CLI MCP Server](https://github.com/angular/angular-cli) | MCP | angular | Official Angular CLI MCP server: best practices, documentation search, examples and project-aware tools for Angular workspaces. | `claude mcp add --scope user angular-cli -- npx -y @angular/cli mcp` |
| [Context7 MCP Server](https://github.com/upstash/context7) | MCP | upstash | Injects up-to-date, version-specific library documentation and code examples into the prompt. Works without an API key; set CONTEXT7_API_KEY for higher limits. | `claude mcp add --scope user --transport http context7 https://mcp.context7.com/mcp` |
| [Microsoft Learn MCP Server](https://github.com/MicrosoftDocs/mcp) | MCP | microsoft | Remote MCP server that searches and fetches official, up-to-date Microsoft Learn documentation and code samples. No authentication required. | `claude mcp add --scope user --transport http microsoft-learn https://learn.microsoft.com/api/mcp` |

### Level 3: QA & Business

Testing, product discovery, requirements, specs and tickets.

**Own**

_Coming soon._

**Recommended**

| Name | Type | Author | Description | Install |
| --- | --- | --- | --- | --- |
| [discovery-process](https://github.com/deanpeters/Product-Manager-Skills/tree/HEAD/skills/discovery-process) | Skill | deanpeters | Guides an end-to-end product discovery process, from problem framing to validated opportunities. | `npx skills add https://github.com/deanpeters/Product-Manager-Skills --skill discovery-process` |
| [playwright-generate-test](https://github.com/github/awesome-copilot/tree/HEAD/skills/playwright-generate-test) | Skill | github | Generates Playwright tests from a scenario by exploring the app with the Playwright MCP first. | `npx skills add https://github.com/github/awesome-copilot --skill playwright-generate-test` |
| [prd-development](https://github.com/deanpeters/Product-Manager-Skills/tree/HEAD/skills/prd-development) | Skill | deanpeters | Helps write a structured Product Requirements Document (PRD). | `npx skills add https://github.com/deanpeters/Product-Manager-Skills --skill prd-development` |
| [to-spec](https://github.com/mattpocock/skills/tree/HEAD/skills/engineering/to-spec) | Skill | mattpocock | Turns the current conversation into a spec and publishes it to the project issue tracker, with no extra interview. | `npx skills add https://github.com/mattpocock/skills --skill to-spec` |
| [to-tickets](https://github.com/mattpocock/skills/tree/HEAD/skills/engineering/to-tickets) | Skill | mattpocock | Breaks a plan, spec or conversation into tracer-bullet tickets with their blocking dependencies, published to your tracker. | `npx skills add https://github.com/mattpocock/skills --skill to-tickets` |
| [user-story](https://github.com/deanpeters/Product-Manager-Skills/tree/HEAD/skills/user-story) | Skill | deanpeters | Writes user stories in Mike Cohn format with Gherkin acceptance criteria. | `npx skills add https://github.com/deanpeters/Product-Manager-Skills --skill user-story` |
| [user-story-mapping](https://github.com/deanpeters/Product-Manager-Skills/tree/HEAD/skills/user-story-mapping) | Skill | deanpeters | Builds a user story map to organize the backlog around the user journey and plan releases. | `npx skills add https://github.com/deanpeters/Product-Manager-Skills --skill user-story-mapping` |
| [Playwright MCP](https://github.com/microsoft/playwright-mcp) | MCP | microsoft | Lets the agent drive a real browser through Playwright using accessibility snapshots instead of screenshots. | `claude mcp add --scope user playwright -- npx -y @playwright/mcp@latest` |
<!-- CATALOG:END -->

## How it works

```text
skills/  agents/  mcps/          catalog.json (recommended, hand-edited)
        │                                │
        └──────► build:catalog ◄─────────┘   discovers own items, normalizes everything
                       │
                 catalog.json  ──► validate (schema + rules + glossary + contrast)
                       │
          ┌────────────┴─────────────┐
     build:readme               build:site
   README.md tables      site/data.json + site/index.html
                                     │
                             GitHub Pages (pt-BR)
```

### `catalog.json`

Validated by [`catalog.schema.json`](./catalog.schema.json) plus extra rules in `scripts/validate.mjs`. Every item has `id`, `type` (`skill` | `agent` | `mcp`), `level` (1–3), `origin` (`own` | `recommended`), `name`, `description_en` (README), `description_pt` (website), `author`, `source`, `install` and `tags`. Optional fields: `license`, `homepage`, `requires`.

`install.method` is one of:

- `npx-skills` with `repo` and `skill`
- `agent-file` with `path`
- `mcp-config` with `server` (`stdio`: `command` and `args`; `http`: `url` and optional `auth`)

`install.command` is **generated**; never edit it by hand.

### Adding an own item

Own items are discovered automatically. Editorial fields live in the file's frontmatter `metadata` (string values, as the Agent Skills spec requires):

```yaml
---
name: my-skill                      # must match the folder (skills) or file name (agents)
description: English description used in the README.
metadata:
  hub-level: "2"                    # 1, 2 or 3
  hub-description-pt: "Descrição em pt-BR exibida no site."
  hub-tags: "frontend, testing"     # optional, comma-separated
  hub-requires: "other-item-id"     # optional, comma-separated ids
---
```

- **Skill:** create `skills/<name>/SKILL.md` (plus optional `references/`, `scripts/`, `assets/`).
- **Agent:** create `agents/<name>.md` (Claude-style Markdown agent). The installer converts it for each tool and strips the `metadata` block.
- **MCP:** create `mcps/<id>.json` with `name`, `level`, `description_en`, `description_pt`, `tags` and `server` (same shape as `install.server`).

Then run `npm run build`. Commit only the source file; the workflow regenerates everything else.

### Adding a recommendation

Add an entry to `items` in `catalog.json` with `origin: "recommended"`, point `source` and `install` to the author's repository, and run `npm run build`. Never copy third-party files into this repository; validation rejects local copies.

### Scripts

| Command | What it does |
| --- | --- |
| `npm run validate` | Schema, ids, levels, dependencies, own files and frontmatter, catalog sync, glossary, en-US heuristic, WCAG contrast, LF line endings in `*.sh` |
| `npm run build:catalog` | Discovers own items and normalizes `catalog.json` |
| `npm run build:readme` | Regenerates the README sections between `<!-- CATALOG -->`, `<!-- CREDITS -->` and `<!-- CONTRAST -->` markers |
| `npm run build:site` | Generates `site/data.json` and pre-renders the website sections |
| `npm run build` | All of the above, in order, followed by `validate` |
| `npm run check:links` | Checks every recommended URL and `SKILL.md` path |
| `npm run install:dry-run` | Shows what the installer would do |
| `npm run serve` | Serves `site/` at <http://localhost:4173> |

All scripts are dependency-free Node.js (ESM) and idempotent: running them twice produces no diff.

### Workflows

| Workflow | Trigger | What it does |
| --- | --- | --- |
| [`validate.yml`](./.github/workflows/validate.yml) | push, pull request | `npm run validate`, checks generated files are in sync (PRs), installer dry-run on Ubuntu, macOS and Windows |
| [`update-generated.yml`](./.github/workflows/update-generated.yml) | push to `main`, manual | `npm run build` and commits `README.md`, `catalog.json` and `site/` changes as `github-actions[bot]` |
| [`pages.yml`](./.github/workflows/pages.yml) | after *Update generated files*, manual | Deploys `site/` to GitHub Pages |
| [`links.yml`](./.github/workflows/links.yml) | weekly, manual | `npm run check:links`, opens or updates an issue when links break |

Loop protection: commits made with the default `GITHUB_TOKEN` do not trigger new workflow runs, and the update job also skips runs started by `github-actions[bot]`. Pages runs through `workflow_run` once the generated files are committed. Actions are pinned to commit SHAs, and every job declares minimal `permissions`.

**One-time setup:** in *Settings → Pages*, set **Source** to **GitHub Actions**.

### Publishing to npm (future)

The installer logic lives once in [`bin/ai-toolkit.mjs`](./bin/ai-toolkit.mjs) and [`lib/`](./lib). `install.sh` and `install.ps1` are thin wrappers around it. `package.json` already declares the `bin` and `files`, so publishing only requires removing `"private": true` and running `npm publish --access public`. After that, `npx @dev-cristhian/ai-toolkit install` runs the exact same code.

## Project structure

```text
.
├── README.md                 # this file (catalog sections are generated)
├── CLAUDE.md                 # context and rules for AI agents working on this repo
├── LICENSE                   # MIT (own items)
├── catalog.json              # single source of truth
├── catalog.schema.json       # JSON Schema for the catalog
├── glossary.json             # AI glossary (English terms, pt-BR explanations)
├── package.json              # npm scripts and future npm package metadata
├── install.sh                # macOS/Linux wrapper
├── install.ps1               # Windows wrapper
├── bin/ai-toolkit.mjs        # installer CLI
├── lib/                      # runtime code shipped by the installer (catalog, targets, installer, frontmatter)
├── skills/                   # own skills
├── agents/                   # own agents
├── mcps/                     # own MCP definitions
├── scripts/                  # validate, build-*, check-links, serve
│   └── lib/                  # build-only helpers (markers, JSON Schema, contrast)
├── site/                     # GitHub Pages (pt-BR)
│   ├── index.html            # template + pre-rendered sections
│   ├── data.json             # generated
│   └── assets/               # app.js, favicon.svg
└── .github/workflows/        # validate, update-generated, pages, links
```

## Accessibility

The website targets **WCAG 2.2 AA**: semantic landmarks, a skip link, a single `h1` with an ordered heading hierarchy, full keyboard support (tabs follow the WAI-ARIA tabs pattern), visible focus, `aria-live` feedback for copy and filter actions, `prefers-reduced-motion`, and content that works without JavaScript. The light theme is the default; dark mode is opt-in through a button and remembered in `localStorage` (`ai-toolkit:theme`).

Palette tokens (CSS custom properties in `site/index.html`):

| Token | Light | Dark | Notes |
| --- | --- | --- | --- |
| `--bg-color` | `#FFFFFF` | `#0F1B20` | Author palette (light) |
| `--primary-color` | `#477A91` | `#8EC1D3` | Author palette; button background (4.71:1 with white text) |
| `--primary-strong` | `#365E70` | `#A9CDD4` | **Added**: hover and selected states |
| `--link-color` | `#365E70` | `#8EC1D3` | **Added**: `#477A91` only reaches 3.89:1 on `#E1EBF0`, so links use the darker tone |
| `--accent-color` | `#D6AA58` | `#D6AA58` | Author palette; **decorative or background only** (2.15:1 on white), always with dark text |
| `--surface-color` | `#E1EBF0` | `#16262D` | Author palette (light); section backgrounds |
| `--border-color` | `#A9CDD4` | `#2B4550` | Author palette (light); decorative borders and dividers |
| `--text-color` / `--text-muted` | `#1D2B31` / `#4B5B63` | `#E6EEF1` / `#A7BCC4` | **Added**: dark neutrals for text |

Verified contrast (generated by `npm run build:readme`, enforced by `npm run validate`):

<!-- CONTRAST:START -->
| Theme | Foreground | Background | Ratio | Required | Usage |
| --- | --- | --- | --- | --- | --- |
| light | `--text-color` #1D2B31 | `--bg-color` #FFFFFF | 14.56:1 ✅ | 4.5:1 | Body text on page background |
| light | `--text-color` #1D2B31 | `--surface-color` #E1EBF0 | 12.03:1 ✅ | 4.5:1 | Body text on section surface |
| light | `--text-muted` #4B5B63 | `--bg-color` #FFFFFF | 7.06:1 ✅ | 4.5:1 | Secondary text on page background |
| light | `--text-muted` #4B5B63 | `--surface-color` #E1EBF0 | 5.83:1 ✅ | 4.5:1 | Secondary text on section surface |
| light | `--link-color` #365E70 | `--bg-color` #FFFFFF | 7.02:1 ✅ | 4.5:1 | Links and primary text on page background |
| light | `--link-color` #365E70 | `--surface-color` #E1EBF0 | 5.80:1 ✅ | 4.5:1 | Links on section surface |
| light | `--link-color` #365E70 | `--code-bg` #F3F7F9 | 6.51:1 ✅ | 4.5:1 | Links next to code blocks |
| light | `--text-color` #1D2B31 | `--code-bg` #F3F7F9 | 13.51:1 ✅ | 4.5:1 | Code on code background |
| light | `--on-primary` #FFFFFF | `--primary-color` #477A91 | 4.71:1 ✅ | 4.5:1 | Button text on primary button |
| light | `--on-primary` #FFFFFF | `--primary-strong` #365E70 | 7.02:1 ✅ | 4.5:1 | Button text on hovered primary button |
| light | `--on-accent` #1D2B31 | `--accent-color` #D6AA58 | 6.76:1 ✅ | 4.5:1 | Text on accent badge/button |
| light | `--badge-text` #2F5566 | `--badge-bg` #E1EBF0 | 6.64:1 ✅ | 4.5:1 | Type badge text |
| light | `--focus-color` #365E70 | `--bg-color` #FFFFFF | 7.02:1 ✅ | 3:1 | Focus outline vs. page background (non-text, 3:1) |
| light | `--focus-color` #365E70 | `--surface-color` #E1EBF0 | 5.80:1 ✅ | 3:1 | Focus outline vs. section surface (non-text, 3:1) |
| light | `--border-strong` #5E7F8C | `--bg-color` #FFFFFF | 4.29:1 ✅ | 3:1 | Form field borders (non-text, 3:1) |
| dark | `--text-color` #E6EEF1 | `--bg-color` #0F1B20 | 14.91:1 ✅ | 4.5:1 | Body text on page background |
| dark | `--text-color` #E6EEF1 | `--surface-color` #16262D | 13.24:1 ✅ | 4.5:1 | Body text on section surface |
| dark | `--text-muted` #A7BCC4 | `--bg-color` #0F1B20 | 8.88:1 ✅ | 4.5:1 | Secondary text on page background |
| dark | `--text-muted` #A7BCC4 | `--surface-color` #16262D | 7.88:1 ✅ | 4.5:1 | Secondary text on section surface |
| dark | `--link-color` #8EC1D3 | `--bg-color` #0F1B20 | 8.95:1 ✅ | 4.5:1 | Links and primary text on page background |
| dark | `--link-color` #8EC1D3 | `--surface-color` #16262D | 7.94:1 ✅ | 4.5:1 | Links on section surface |
| dark | `--link-color` #8EC1D3 | `--code-bg` #0A1418 | 9.52:1 ✅ | 4.5:1 | Links next to code blocks |
| dark | `--text-color` #E6EEF1 | `--code-bg` #0A1418 | 15.86:1 ✅ | 4.5:1 | Code on code background |
| dark | `--on-primary` #0F1B20 | `--primary-color` #8EC1D3 | 8.95:1 ✅ | 4.5:1 | Button text on primary button |
| dark | `--on-primary` #0F1B20 | `--primary-strong` #A9CDD4 | 10.33:1 ✅ | 4.5:1 | Button text on hovered primary button |
| dark | `--on-accent` #1D2B31 | `--accent-color` #D6AA58 | 6.76:1 ✅ | 4.5:1 | Text on accent badge/button |
| dark | `--badge-text` #C4DEE6 | `--badge-bg` #1F3540 | 9.10:1 ✅ | 4.5:1 | Type badge text |
| dark | `--focus-color` #D6AA58 | `--bg-color` #0F1B20 | 8.14:1 ✅ | 3:1 | Focus outline vs. page background (non-text, 3:1) |
| dark | `--focus-color` #D6AA58 | `--surface-color` #16262D | 7.23:1 ✅ | 3:1 | Focus outline vs. section surface (non-text, 3:1) |
| dark | `--border-strong` #6E95A4 | `--bg-color` #0F1B20 | 5.42:1 ✅ | 3:1 | Form field borders (non-text, 3:1) |
<!-- CONTRAST:END -->

## Credits & licenses

Own items are released under the [MIT License](./LICENSE).

<!-- CREDITS:START -->
Recommended items are referenced, never copied. All rights belong to their authors, under the licenses of the original repositories:

| Repository | Author | License | Items |
| --- | --- | --- | --- |
| [angular/angular-cli](https://github.com/angular/angular-cli) | angular | MIT | Angular CLI MCP Server |
| [angular/skills](https://github.com/angular/skills) | angular | Not specified | angular-developer |
| [anthropics/skills](https://github.com/anthropics/skills) | anthropics | Apache-2.0 | frontend-design |
| [deanpeters/Product-Manager-Skills](https://github.com/deanpeters/Product-Manager-Skills) | deanpeters | CC-BY-NC-SA-4.0 | discovery-process, prd-development, user-story, user-story-mapping |
| [dotnet/skills](https://github.com/dotnet/skills) | dotnet | MIT | analyzing-dotnet-performance, dotnet-webapi, optimizing-ef-core-queries |
| [github/awesome-copilot](https://github.com/github/awesome-copilot) | github | MIT | playwright-generate-test |
| [mattpocock/skills](https://github.com/mattpocock/skills) | mattpocock | MIT | grill-me, to-spec, to-tickets |
| [microsoft/playwright-mcp](https://github.com/microsoft/playwright-mcp) | microsoft | Apache-2.0 | Playwright MCP |
| [MicrosoftDocs/mcp](https://github.com/MicrosoftDocs/mcp) | microsoft | CC-BY-4.0 | Microsoft Learn MCP Server |
| [obra/superpowers](https://github.com/obra/superpowers) | obra | MIT | brainstorming, writing-plans |
| [upstash/context7](https://github.com/upstash/context7) | upstash | MIT | Context7 MCP Server |

> **NonCommercial (NC) licenses:** those items may not be used for commercial purposes without the author's permission.
<!-- CREDITS:END -->

The repository layout was inspired by [kipperacademy/skillpper](https://github.com/kipperacademy/skillpper). Only ideas were reused; no code was copied.

---

This is a personal, curated project and does not accept external contributions.
