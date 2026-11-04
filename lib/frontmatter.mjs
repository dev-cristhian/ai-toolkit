// Minimal YAML frontmatter parser (no dependencies).
// Supports the subset used by SKILL.md / agent files:
//   key: value | "quoted" | 'quoted' | [inline, list]
//   key: >- / > / | / |-  (block scalars)
//   key:            (nested map or "- item" list, by indentation)

const FRONTMATTER_RE = /^﻿?---\r?\n([\s\S]*?)\r?\n---[ \t]*(?:\r?\n|$)/;

function splitFrontmatter(text) {
  const match = text.match(FRONTMATTER_RE);
  if (!match) return { raw: null, body: text };
  return { raw: match[1], body: text.slice(match[0].length) };
}

export function parseFrontmatter(text) {
  const { raw, body } = splitFrontmatter(text);
  if (raw === null) return { data: null, body };
  const lines = raw.split(/\r?\n/);
  const [data] = parseBlock(lines, 0, 0);
  return { data, body };
}

function indentOf(line) {
  return line.match(/^ */)[0].length;
}

function isBlank(line) {
  return line.trim() === '' || line.trim().startsWith('#');
}

function parseBlock(lines, start, indent) {
  // Decide between a list and a map by the first meaningful line.
  let i = start;
  while (i < lines.length && isBlank(lines[i])) i++;
  if (i < lines.length && lines[i].trim().startsWith('- ')) return parseList(lines, i, indent);
  return parseMap(lines, i, indent);
}

function parseList(lines, start, indent) {
  const out = [];
  let i = start;
  while (i < lines.length) {
    const line = lines[i];
    if (isBlank(line)) { i++; continue; }
    if (indentOf(line) < indent || !line.trim().startsWith('- ')) break;
    out.push(parseScalar(line.trim().slice(2).trim()));
    i++;
  }
  return [out, i];
}

function parseMap(lines, start, indent) {
  const out = {};
  let i = start;
  while (i < lines.length) {
    const line = lines[i];
    if (isBlank(line)) { i++; continue; }
    const lineIndent = indentOf(line);
    if (lineIndent < indent) break;
    const m = line.slice(lineIndent).match(/^([A-Za-z0-9_.-]+)\s*:(?:\s+(.*))?$/);
    if (!m) throw new Error(`Unsupported frontmatter line: "${line.trim()}"`);
    const key = m[1];
    const rest = (m[2] ?? '').trim();
    i++;
    if (/^[>|][+-]?$/.test(rest)) {
      const folded = rest.startsWith('>');
      const collected = [];
      let blockIndent = null;
      while (i < lines.length) {
        const l = lines[i];
        if (l.trim() === '') { collected.push(''); i++; continue; }
        const li = indentOf(l);
        if (li <= lineIndent) break;
        if (blockIndent === null) blockIndent = li;
        collected.push(l.slice(blockIndent));
        i++;
      }
      while (collected.length && collected[collected.length - 1] === '') collected.pop();
      out[key] = folded
        ? collected.join('\n').replace(/([^\n])\n(?=[^\n])/g, '$1 ')
        : collected.join('\n');
    } else if (rest === '') {
      let j = i;
      while (j < lines.length && isBlank(lines[j])) j++;
      if (j < lines.length && indentOf(lines[j]) > lineIndent) {
        const [value, next] = parseBlock(lines, j, indentOf(lines[j]));
        out[key] = value;
        i = next;
      } else {
        out[key] = null;
      }
    } else {
      out[key] = parseScalar(rest);
    }
  }
  return [out, i];
}

function parseScalar(value) {
  if (value.startsWith('"') && value.endsWith('"') && value.length >= 2) {
    try { return JSON.parse(value); } catch { return value.slice(1, -1); }
  }
  if (value.startsWith("'") && value.endsWith("'") && value.length >= 2) {
    return value.slice(1, -1).replace(/''/g, "'");
  }
  if (value.startsWith('[') && value.endsWith(']')) {
    const inner = value.slice(1, -1).trim();
    return inner === '' ? [] : inner.split(',').map((v) => parseScalar(v.trim()));
  }
  if (value === 'true') return true;
  if (value === 'false') return false;
  if (value === 'null' || value === '~') return null;
  if (/^-?\d+(\.\d+)?$/.test(value)) return Number(value);
  return value.replace(/\s+#.*$/, '');
}

/** Remove a top-level key (and its nested block) from raw frontmatter text. */
export function stripFrontmatterKey(text, key) {
  const { raw, body } = splitFrontmatter(text);
  if (raw === null) return text;
  const lines = raw.split(/\r?\n/);
  const kept = [];
  let skipping = false;
  for (const line of lines) {
    if (indentOf(line) === 0 && line.trim() !== '') {
      skipping = line.startsWith(`${key}:`);
    }
    if (!skipping) kept.push(line);
  }
  return `---\n${kept.join('\n')}\n---\n${body}`;
}
