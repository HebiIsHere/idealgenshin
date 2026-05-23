// Generate talent reference data from genshin-db
// Outputs: src/data/talents/ref.json
// Includes: clean text description + parameter labels with level-10 values
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const genshindb = require('genshin-db');
import * as fs from 'fs';
import * as path from 'path';

function formatId(name) {
  return name.toLowerCase().replace(/[\s']+/g, '_').replace(/[^a-z0-9_]/g, '');
}

/** Strip HTML tags and Genshin color/link tags from text. */
function stripHtml(text) {
  if (!text) return '';
  return text
    .replace(/<color=[^>]+>/g, '')
    .replace(/<\/color>/g, '')
    .replace(/<i>/g, '')
    .replace(/<\/i>/g, '')
    .replace(/<br>/g, '\n')
    .replace(/\{LINK#[^}]+\}([^{]*)\{\/LINK\}/g, '$1')
    .replace(/<[^>]+>/g, '')
    .trim();
}

/** Format a parameter value. */
function formatParam(label, value) {
  // Check if label suggests percentage (ends with P or contains 百分比/提高/伤害/加成)
  const isPercent = label.includes('提高') || label.includes('伤害') || 
    label.match(/\{param\d+:P\}/) || label.match(/\{param\d+:F\dP\}/);
  
  if (typeof value !== 'number') return String(value);
  
  // F1P = percentage with 1 decimal; P = percentage; F2P = percentage with 2 decimals
  if (label.includes(':P}') || label.includes('F1P') || label.includes('F2P')) {
    return (value * 100).toFixed(1) + '%';
  }
  // F1 = float 1 decimal; F2 = float 2 decimals
  if (label.includes(':F1}') || label.includes(':F2}')) {
    return value.toFixed(label.includes(':F2}') ? 2 : 1);
  }
  // I = integer
  if (label.includes(':I}')) {
    return String(Math.round(value));
  }
  return String(value);
}

/** Format a label like "攻击力提高|{param2:F2P}生命值上限" to "攻击力提高=X%生命值上限" */
function formatLabel(label, parameters, levelIndex) {
  // levelIndex = 9 for level 10 (0-indexed)
  return label.replace(/\{param(\d+):([^}]+)\}/g, (match, paramNum, format) => {
    const paramKey = 'param' + paramNum;
    const values = parameters[paramKey];
    if (!values || !values[levelIndex]) return match;
    const rawValue = values[levelIndex];
    
    // Format the value based on the format specifier
    if (format === 'P') return (rawValue * 100).toFixed(0) + '%';
    if (format.startsWith('F1P')) return (rawValue * 100).toFixed(1) + '%';
    if (format.startsWith('F2P')) return (rawValue * 100).toFixed(2) + '%';
    if (format.startsWith('F1')) return rawValue.toFixed(1);
    if (format.startsWith('F2')) return rawValue.toFixed(2);
    if (format === 'I') return String(Math.round(rawValue));
    return String(rawValue);
  });
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

  const talents = genshindb.talents(name, { resultLanguage: 'ChineseSimplified' });
  if (!talents) continue;

  const talentEntries = [];
  for (const key of ['combat2', 'combat3', 'passive1', 'passive2']) {
    const t = talents[key];
    if (!t || !t.name) continue;
    
    // Clean text from descriptionRaw (strip HTML)
    const cleanDesc = stripHtml(t.descriptionRaw || '');
    
    // Format parameter labels with level-10 values
    const params = t.attributes?.parameters;
    const labels = t.attributes?.labels;
    const levelIndex = 9; // Level 10 (0-indexed)
    
    let paramLines = [];
    if (labels && params) {
      paramLines = labels.map(label => formatLabel(label, params, levelIndex));
    }
    
    talentEntries.push({
      key,
      name: t.name,
      description: cleanDesc,
      params: paramLines,
    });
  }

  if (talentEntries.length > 0) {
    result[projectId] = {
      characterName: zh.name,
      talents: talentEntries,
    };
    matched++;
  }
}

console.log(`Matched: ${matched} characters`);
const outPath = path.resolve(import.meta.dirname, '..', 'src', 'data', 'talents', 'ref.json');
fs.writeFileSync(outPath, JSON.stringify(result, null, 2));
console.log(`Written ${Object.keys(result).length} entries to ${outPath}`);

// Show a sample
console.log('\n=== Sample: Hu Tao ===');
const sample = result['hu_tao'];
if (sample) {
  for (const t of sample.talents) {
    console.log(`[${t.key}] ${t.name}`);
    console.log('  desc:', t.description.slice(0, 150));
    console.log('  params:', t.params.slice(0, 3).join(' | '));
  }
}
