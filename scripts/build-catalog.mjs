// Discovers own items (skills/, agents/, mcps/) and syncs them into
// catalog.json. Recommended entries are kept as edited by hand; every item
// is normalized (stable key order, generated install.command).
import { readFileSync, writeFileSync } from 'node:fs';
import { CATALOG_PATH, loadCatalog, discoverOwnItems, normalizeItem, sortItems, stringifyJson } from '../lib/catalog.mjs';

const catalog = loadCatalog();
const { items: own, problems } = discoverOwnItems(catalog);
for (const p of problems) console.warn(`warning: ${p}`);

const recommended = catalog.items.filter((i) => i.origin !== 'own');
const next = {
  ...catalog,
  items: sortItems([...own, ...recommended]).map((item) => normalizeItem(catalog, item)),
};

const output = stringifyJson(next);
if (output === readFileSync(CATALOG_PATH, 'utf8')) {
  console.log(`catalog.json is up to date (${next.items.length} items, ${own.length} own).`);
} else {
  writeFileSync(CATALOG_PATH, output);
  console.log(`catalog.json updated (${next.items.length} items, ${own.length} own).`);
}
