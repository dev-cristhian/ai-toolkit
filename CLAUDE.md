# CLAUDE.md

Context for AI agents working in this repository. Read it before changing anything.

## What this is

`ai-toolkit` (https://github.com/dev-cristhian/ai-toolkit) is a **personal hub** of AI skills, agents and MCP servers:

- **Own items** live here: `skills/`, `agents/`, `mcps/`.
- **Recommended items** are third-party and stored **only as references** in `catalog.json`. Never copy their files into this repo (validation rejects local copies).
- A one-command installer puts everything into **Claude Code, Cursor, OpenAI Codex and VS Code + GitHub Copilot**.
- A **pt-BR** GitHub Pages site (`site/`) is the main entry point for the Brazilian audience: https://dev-cristhian.github.io/ai-toolkit/

The user usually writes in Portuguese.

## Hard rules

- **No community contributions.** Never add CONTRIBUTING files, PR/issue templates for third parties, or "how to contribute" sections. The README ends with a one-line note saying contributions are not accepted.
- **Language:** README, code, comments, logs, workflows, `catalog.json` technical fields and own skill/agent files are **en-US**. Everything the site renders is **pt-BR** (`description_pt`, `glossary.json` explanations, UI strings in `site/` and `scripts/build-site.mjs`).
- **Glossary:** term names stay in **English** (as the community uses them); explanations are pt-BR. In pt-BR text, don't translate established AI terms (prompt, token, agent, skill, MCP, RAG, LLM, fine-tuning...).
- **Never hand-edit generated content:**
  - `site/data.json`
  - README sections between `<!-- CATALOG -->`, `<!-- CREDITS -->` and `<!-- CONTRAST -->` markers
  - `site/index.html` sections between `<!-- QUICKSTART|GLOSSARY|INSTALL|CATALOG|CREDITS -->` markers
  - own-item entries and every `install.command` in `catalog.json`

  Change the source, then run `npm run build`.
- **Zero runtime dependencies.** Scripts and the installer are plain Node.js ESM (Node 22.20+, the minimum required by the pinned `skills` CLI). Do not add npm packages to the repo. Put test tooling (Playwright, axe, Lighthouse) in a scratch folder, not in `package.json`.
- Commit or push only when the user asks.
- Shell scripts (`*.sh`) must be stored with **LF** line endings; `npm run validate` checks the Git index. There is no `.gitattributes`, by the user's choice.

## Commands

```bash
npm run build          # build:catalog → build:readme → build:site → validate (must end green)
npm run validate       # schema, ids, sync of own items, glossary, en-US heuristic, WCAG contrast
npm run check:links    # every recommended URL and SKILL.md path is reachable
npm run serve          # preview site/ at http://localhost:4173
node bin/ai-toolkit.mjs --help
node bin/ai-toolkit.mjs --dry-run    # installer plan, changes nothing
```

The build is idempotent: running it twice must produce no diff. Keep it that way, with stable ordering and no timestamps.

## Where things live

| Path | Role |
| --- | --- |
| `catalog.json` | Single source of truth. Recommended entries are hand-edited; own entries are generated |
| `catalog.schema.json` | JSON Schema, enforced by `scripts/lib/jsonschema.mjs` (tiny in-house validator) |
| `glossary.json` | Glossary categories and terms. `scripts/validate.mjs` lists the required term ids |
| `lib/catalog.mjs` | Constants (`TARGETS`, pinned `SKILLS_CLI`), own-item discovery, command builders, normalization |
| `lib/targets.mjs` | **Tool-specific knowledge**: agent paths and formats, MCP config formats per tool |
| `lib/installer.mjs` | Selection (+ `requires` deps), plan, confirmation, execution, backups |
| `scripts/lib/` | Build-only helpers (`markers`, `jsonschema`, `contrast`); kept out of `lib/` so the npm package ships only runtime code |
| `bin/ai-toolkit.mjs` | CLI entry point, shared by the wrappers and the future npm package |
| `install.sh` / `install.ps1` | Thin wrappers: check Node, use the local clone or download the repo, forward args |
| `scripts/` | `build-*`, `validate`, `check-links`, `serve` |
| `site/index.html` | Template with inline CSS (design tokens) and generated sections. Tags with `data-url="site|repository|readme-install"` get their URL from `catalog.json` at build time; never hardcode the repo or site URL there |
| `site/data.json` | Generated public JSON of the catalog and glossary (not read by the page, which is pre-rendered) |
| `site/assets/app.js` | Progressive enhancement only: accordion, theme, copy, tabs, filters |

## Adding items

**Own skill:** `skills/<name>/SKILL.md`, with frontmatter `name` equal to the folder name. **Own agent:** `agents/<name>.md` (Claude-style Markdown). Editorial fields go in frontmatter `metadata`, all as **strings**:

```yaml
metadata:
  hub-level: "2"                       # 1 Methodology, 2 Development, 3 QA & Business
  hub-description-pt: "Descrição pt-BR exibida no site."
  hub-tags: "frontend, testing"        # optional
  hub-requires: "other-item-id"        # optional; the installer adds dependencies
```

**Own MCP:** `mcps/<id>.json` (see `mcps/README.md`).

**Recommendation:** add an `items[]` entry with `origin: "recommended"`, pointing to the author's repo. `install.method` is `npx-skills` (`repo` + `skill`) or `mcp-config` (`server`). `ref: null` means the default branch; versions are not pinned. Before adding, verify on the web that the repo and path exist, and show the link to the user. Write `description_en` and `description_pt` from the item's real `SKILL.md` or docs.

Always finish with `npm run build`.

## Installer facts (verified November 2026; re-check official docs before changing them)

- **Skills:** `npx -y skills@1.7.6 add <repo> --skill … --agent claude-code|cursor|codex|github-copilot [--global] --yes`. The CLI keeps the canonical copy in `~/.agents/skills/` (read directly by Cursor, Codex and Copilot) and symlinks it into `~/.claude/skills/`.
- **Agents:**
  - Claude: `~/.claude/agents/*.md`
  - Cursor: `~/.cursor/agents/*.md`
  - Codex: `~/.codex/agents/*.toml`, auto-converted to `name`, `description`, `developer_instructions`
  - Copilot: `~/.copilot/agents/*.agent.md`
  - The hub `metadata` block is stripped from copies.
- **MCPs:**
  - Claude: `claude mcp add --scope user`
  - Cursor: `~/.cursor/mcp.json` (`mcpServers`, `${env:VAR}`)
  - Codex: `~/.codex/config.toml` (`[mcp_servers.x]`, `bearer_token_env_var`)
  - Copilot: `~/.copilot/mcp-config.json` (`mcpServers`, `${VAR}`)
  - Project scope uses `.mcp.json`, `.cursor/mcp.json`, `.codex/config.toml` and `.vscode/mcp.json` (`servers`).
- **Safety:** existing servers with the same name are skipped, never overwritten. Each changed config file gets one `.ai-toolkit.bak` per run. Third-party MCP commands and URLs are always listed before confirming. Without a TTY, `--yes` is required.
- **Context7:** installs without a key; when `CONTEXT7_API_KEY` is set, the header references the variable instead of storing the secret (Claude Code is the exception and stores the value).
- **Testing real installs:** never against the user's profile. Point `USERPROFILE`/`HOME` at a scratch dir, and leave the `claude` target out (`claude mcp add` would write the real `~/.claude.json`).
- **npm:** publishing as `@dev-cristhian/ai-toolkit` is planned for later. Keep all logic in `bin/` + `lib/`. `package.json` has `"private": true` until the user decides to publish.

## Site rules

- Plain HTML/CSS/JS, no framework, no external requests. CSS is inline in `site/index.html`, and content is pre-rendered by `scripts/build-site.mjs`; the page must work without JS.
- **WCAG 2.2 AA** is mandatory:
  - semantic landmarks, one `h1`, ordered headings
  - full keyboard support and visible focus
  - `aria-live` feedback
  - `prefers-reduced-motion`
  - no horizontal scroll at 320px
- Target Lighthouse ≥ 95 in all categories; it currently scores 100.
- **Palette tokens** (`:root`): `--bg-color #FFFFFF`, `--primary-color #477A91`, `--accent-color #D6AA58`, `--surface-color #E1EBF0`, `--border-color #A9CDD4`, plus added tones.
  - `#477A91` fails on `#E1EBF0`, so links use `--link-color #365E70`.
  - `#D6AA58` is never small text on white; use it for backgrounds with dark text, or decoration.
- Any new text/background token pair goes into `CONTRAST_PAIRS` in `scripts/lib/contrast.mjs`. Validation reads the tokens straight from the CSS.
- **Theme:** light by default. Dark mode is only a button, stored in `localStorage` under `ai-toolkit:theme`.
- **Accordion:** the Glossário, Como instalar and Catálogo sections set their default with `data-accordion="open|closed"` (the glossary is closed). The panel wrappers sit outside the generated markers. In-page links open the section that contains their target.

## Workflows (`.github/workflows/`)

- `validate.yml`: validate on push and PR. On PRs it also checks generated files are in sync, and runs the installer dry-run on Ubuntu, macOS and Windows.
- `update-generated.yml`: on push to `main`, runs the build and commits as `github-actions[bot]` with `chore: update generated files`. It skips bot runs; `GITHUB_TOKEN` commits do not retrigger.
- `pages.yml`: `workflow_run` after the update, deploys `site/`.
- `links.yml`: weekly `check:links`; opens or updates an issue.
- Actions are pinned to commit SHAs with a version comment, and each job declares minimal `permissions`.
