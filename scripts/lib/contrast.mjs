// WCAG 2.2 contrast checks for the site's color tokens. Tokens are read
// straight from the CSS custom properties in site/index.html so the check
// can never drift from what is actually shipped.

/** [foreground token, background token, minimum ratio, usage] */
const CONTRAST_PAIRS = [
  ['--text-color', '--bg-color', 4.5, 'Body text on page background'],
  ['--text-color', '--surface-color', 4.5, 'Body text on section surface'],
  ['--text-muted', '--bg-color', 4.5, 'Secondary text on page background'],
  ['--text-muted', '--surface-color', 4.5, 'Secondary text on section surface'],
  ['--link-color', '--bg-color', 4.5, 'Links and primary text on page background'],
  ['--link-color', '--surface-color', 4.5, 'Links on section surface'],
  ['--link-color', '--code-bg', 4.5, 'Links next to code blocks'],
  ['--text-color', '--code-bg', 4.5, 'Code on code background'],
  ['--on-primary', '--primary-color', 4.5, 'Button text on primary button'],
  ['--on-primary', '--primary-strong', 4.5, 'Button text on hovered primary button'],
  ['--on-accent', '--accent-color', 4.5, 'Text on accent badge/button'],
  ['--badge-text', '--badge-bg', 4.5, 'Type badge text'],
  ['--focus-color', '--bg-color', 3, 'Focus outline vs. page background (non-text, 3:1)'],
  ['--focus-color', '--surface-color', 3, 'Focus outline vs. section surface (non-text, 3:1)'],
  ['--border-strong', '--bg-color', 3, 'Form field borders (non-text, 3:1)'],
];

function toRgb(hex) {
  const h = hex.replace('#', '');
  const full = h.length === 3 ? [...h].map((x) => x + x).join('') : h;
  return [0, 2, 4].map((i) => parseInt(full.slice(i, i + 2), 16) / 255);
}

function luminance(hex) {
  const [r, g, b] = toRgb(hex).map((v) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function ratio(fg, bg) {
  const [a, b] = [luminance(fg), luminance(bg)].sort((x, y) => y - x);
  return (a + 0.05) / (b + 0.05);
}

function readTokens(block) {
  const tokens = {};
  for (const m of block.matchAll(/(--[a-z0-9-]+)\s*:\s*(#[0-9a-fA-F]{3,6})\s*;/g)) tokens[m[1]] = m[2];
  return tokens;
}

/** Extract { light, dark } token maps from the page CSS. */
function extractThemes(html) {
  const light = html.match(/:root\s*\{([^}]*)\}/);
  const dark = html.match(/:root\[data-theme="dark"\]\s*\{([^}]*)\}/);
  const lightTokens = light ? readTokens(light[1]) : {};
  return {
    light: lightTokens,
    dark: dark ? { ...lightTokens, ...readTokens(dark[1]) } : null,
  };
}

export function contrastReport(html) {
  const themes = extractThemes(html);
  const rows = [];
  for (const [theme, tokens] of Object.entries(themes)) {
    if (!tokens) continue;
    for (const [fg, bg, min, usage] of CONTRAST_PAIRS) {
      if (!tokens[fg] || !tokens[bg]) { rows.push({ theme, fg, bg, min, usage, missing: true }); continue; }
      const value = ratio(tokens[fg], tokens[bg]);
      rows.push({ theme, fg, bg, fgHex: tokens[fg], bgHex: tokens[bg], min, usage, ratio: value, pass: value >= min });
    }
  }
  return rows;
}

export function checkContrast(html) {
  const rows = contrastReport(html);
  const failures = rows
    .filter((r) => r.missing || !r.pass)
    .map((r) => (r.missing
      ? `${r.theme}: token ${r.fg} or ${r.bg} is not defined`
      : `${r.theme}: ${r.fg} (${r.fgHex}) on ${r.bg} (${r.bgHex}) is ${r.ratio.toFixed(2)}:1, needs ${r.min}:1`));
  return { checked: rows.length, failures, rows };
}
