#!/usr/bin/env node
// scripts/import-artifact-sets.mjs
// Import all artifact set data from genshin-db
import * as fs from 'fs';
import * as path from 'path';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const genshindb = require('genshin-db');

const OUT_DIR = path.resolve(import.meta.dirname, '..', 'src', 'data', 'artifacts');
fs.mkdirSync(OUT_DIR, { recursive: true });

const allSets = genshindb.artifacts('names', { matchCategories: true });
console.log(`Total artifact sets: ${allSets.length}`);

const sets = [];
for (const name of allSets) {
  const en = genshindb.artifacts(name, { resultLanguage: 'English' });
  const zh = genshindb.artifacts(name, { resultLanguage: 'ChineseSimplified' });
  if (!en || !en.effect2Pc) continue;
  
  const id = name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/_+$/g, '');
  
  sets.push({
    id,
    name: en.name,
    nameZh: zh?.name || name,
    twoPcEffect: zh?.effect2Pc || en.effect2Pc || '',
    fourPcEffect: zh?.effect4Pc || en.effect4Pc || '',
    // Minimal parsed bonuses for auto-application (ignoring conditions as requested)
    // These will be applied unconditionally when set is selected
  });
}

// Write individual files + aggregate
for (const s of sets) {
  fs.writeFileSync(path.join(OUT_DIR, `${s.id}.json`), JSON.stringify(s, null, 2));
}
fs.writeFileSync(path.join(OUT_DIR, '_all.json'), JSON.stringify(sets));

console.log(`Imported ${sets.length} artifact sets`);
