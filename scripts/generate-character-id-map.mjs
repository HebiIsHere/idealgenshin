// Generate CHARACTER_ID_NAME_MAP from genshin-db
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const genshindb = require('genshin-db');
import * as fs from 'fs';

const allNames = genshindb.characters('names', { matchCategories: true });
const entries = [];

for (const name of allNames) {
  const en = genshindb.characters(name, { resultLanguage: 'English' });
  const zh = genshindb.characters(name, { resultLanguage: 'ChineseSimplified' });
  if (en?.id) {
    entries.push([String(en.id), zh?.name || name]);
  }
}

// Sort by ID
entries.sort(([a], [b]) => parseInt(a) - parseInt(b));

let output = 'export const CHARACTER_ID_NAME_MAP: Record<string, string> = {\n';
for (const [id, name] of entries) {
  output += `  '${id}': '${name}',\n`;
}
output += '};\n';

const outPath = new URL('../src/data/character_id_name_map.ts', import.meta.url).pathname.replace(/^\//, '');
fs.writeFileSync(outPath, output);
console.log(`Generated ${entries.length} entries`);
entries.slice(0, 10).forEach(([id, name]) => console.log(`  ${id}: ${name}`));
