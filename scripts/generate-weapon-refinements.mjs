// Generate weapon refinement data from genshin-db
// Outputs: src/data/weapons/refinements.json
// Matches by Chinese name → project weapon database ID
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const genshindb = require('genshin-db');
import * as fs from 'fs';
import * as path from 'path';

// Load project weapon database
const allWeapons = JSON.parse(
  fs.readFileSync(
    path.resolve(import.meta.dirname, '..', 'src', 'data', 'weapons', '_all.json'),
    'utf-8'
  )
);

// Build zhName → projectId index
const zhToId = new Map();
for (const w of allWeapons) {
  if (w?.nameZh) zhToId.set(w.nameZh, w.id);
}

// Get all weapons from genshin-db
const allNames = genshindb.weapons('names', { matchCategories: true });

const result = {};
let matched = 0;
const unmatched = [];

for (const name of allNames) {
  const zh = genshindb.weapons(name, { resultLanguage: 'ChineseSimplified' });
  if (!zh || !zh.name) continue;

  let projectId = zhToId.get(zh.name);

  // If exact match fails, try case-insensitive
  if (!projectId) {
    for (const [dbZh, dbId] of zhToId) {
      if (dbZh.toLowerCase() === zh.name.toLowerCase()) {
        projectId = dbId;
        break;
      }
    }
  }

  if (!projectId) {
    unmatched.push(zh.name);
    continue;
  }

  const refinements = [];
  for (let i = 1; i <= 5; i++) {
    const ref = zh[`r${i}`];
    refinements.push({
      description: ref?.description || '',
      values: ref?.values || [],
    });
  }

  result[projectId] = {
    effectName: zh.effectName || '',
    refinements,
  };
  matched++;
}

console.log(`Matched: ${matched}, Unmatched: ${unmatched.length}`);
if (unmatched.length > 0) {
  console.log('Unmatched weapons:', unmatched.slice(0, 10));
}

const outPath = path.resolve(import.meta.dirname, '..', 'src', 'data', 'weapons', 'refinements.json');
fs.writeFileSync(outPath, JSON.stringify(result, null, 2));
console.log(`Written ${Object.keys(result).length} entries to ${outPath}`);
