#!/usr/bin/env node
// scripts/generate-avatar-map.mjs
// Generates Enka avatarId → project characterId mapping
import * as fs from 'fs';
import * as path from 'path';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const genshindb = require('genshin-db');

function formatId(name) {
  return name.toLowerCase().replace(/[\s']+/g, '_').replace(/[^a-z0-9_]/g, '');
}

const allNames = genshindb.characters('names', { matchCategories: true });
const avatarMap = {};

for (const name of allNames) {
  const en = genshindb.characters(name, { resultLanguage: 'English' });
  const zh = genshindb.characters(name, { resultLanguage: 'ChineseSimplified' });
  if (!en?.id) continue;
  const projectId = formatId(name);
  const zhName = zh?.name || name;
  
  avatarMap[en.id] = { projectId, zhName };
  // Also map Aether/Lumine variants
  // Traveler has special handling
}

console.log(`Generated ${Object.keys(avatarMap).length} avatarId mappings`);

// Show a sample
const sample = Object.entries(avatarMap).slice(0, 5);
for (const [aid, info] of sample) {
  console.log(`  ${aid} → ${info.projectId} (${info.zhName})`);
}

// Check if our project's existing characters all have mappings
const ourChars = fs.readdirSync(
  path.resolve(import.meta.dirname, '..', 'src', 'data', 'characters')
).filter(f => f.endsWith('.json') && f !== '_all.json').map(f => f.replace('.json', ''));

let missing = 0;
for (const cid of ourChars) {
  const found = Object.values(avatarMap).find(m => m.projectId === cid);
  if (!found) {
    console.log(`  MISSING mapping for project character: ${cid}`);
    missing++;
  }
}
console.log(`Missing mappings: ${missing}`);

// Write the mapping
const outPath = path.resolve(import.meta.dirname, '..', 'src', 'data', 'avatar_to_character.json');
fs.writeFileSync(outPath, JSON.stringify(avatarMap, null, 2));
console.log(`Written to ${outPath}`);
