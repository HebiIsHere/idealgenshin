// Generate constellation reference data from genshin-db
// Outputs: src/data/constellations/ref.json
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const genshindb = require('genshin-db');
import * as fs from 'fs';
import * as path from 'path';

function formatId(name) {
  return name.toLowerCase().replace(/[\s']+/g, '_').replace(/[^a-z0-9_]/g, '');
}

function stripHtml(text) {
  if (!text) return '';
  return text
    .replace(/<color=[^>]+>/g, '')
    .replace(/<\/color>/g, '')
    .replace(/<i>/g, '')
    .replace(/<\/i>/g, '')
    .replace(/<br>/g, '\n')
    .replace(/\{[^}]+\}([^{]*)\{\/[^}]+\}/g, '$1')
    .replace(/<[^>]+>/g, '')
    .trim();
}

const allChars = genshindb.characters('names', { matchCategories: true });
const avatarMap = JSON.parse(
  fs.readFileSync(
    path.resolve(import.meta.dirname, '..', 'src', 'data', 'avatar_to_character.json'),
    'utf-8'
  )
);

const projectToAvatar = {};
for (const [avatarId, info] of Object.entries(avatarMap)) {
  projectToAvatar[info.projectId] = Number(avatarId);
}

const result = {};
let matched = 0;

for (const name of allChars) {
  const zh = genshindb.characters(name, { resultLanguage: 'ChineseSimplified' });
  if (!zh?.name) continue;

  const projectId = formatId(name);
  if (!projectToAvatar[projectId]) continue;

  const cons = genshindb.constellations(name, { resultLanguage: 'ChineseSimplified' });
  if (!cons) continue;

  const entries = [];
  for (let i = 1; i <= 6; i++) {
    const c = cons['c' + i];
    if (!c || !c.name) continue;
    entries.push({
      index: i,
      name: c.name,
      description: stripHtml(c.descriptionRaw || c.description || ''),
    });
  }

  if (entries.length > 0) {
    result[projectId] = {
      characterName: zh.name,
      constellations: entries,
    };
    matched++;
  }
}

console.log(`Matched: ${matched} characters`);
const outDir = path.resolve(import.meta.dirname, '..', 'src', 'data', 'constellations');
fs.mkdirSync(outDir, { recursive: true });
const outPath = path.join(outDir, 'ref.json');
fs.writeFileSync(outPath, JSON.stringify(result, null, 2));
console.log(`Written ${Object.keys(result).length} entries to ${outPath}`);
