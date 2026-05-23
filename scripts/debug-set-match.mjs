// Debug: test artifact set name resolution from Enka icon
const genshindb = require('genshin-db');

// Simulate what Enka returns in the icon field
const iconExamples = [
  'UI_RelicIcon_15017_4', // Blizzard Strayer
  'UI_RelicIcon_15014_4', // Crimson Witch
  'UI_RelicIcon_15038_4', // Unknown set ID
  'UI_RelicIcon_15021_4', // Emblem
];

console.log('=== Fuzzy matching test ===\n');

for (const icon of iconExamples) {
  // Extract the set ID from icon
  const match = icon.match(/UI_RelicIcon_(\d+)_/);
  const setId = match ? parseInt(match[1]) : 0;
  console.log(`Icon: ${icon} → SetID: ${setId}`);
  
  // Find the set in genshin-db by ID
  const allSets = genshindb.artifacts('names', { matchCategories: true });
  let found = null;
  for (const s of allSets) {
    const d = genshindb.artifacts(s, { resultLanguage: 'English' });
    if (d.id === setId) {
      const dzh = genshindb.artifacts(s, { resultLanguage: 'ChineseSimplified' });
      found = dzh?.name || d.name;
      break;
    }
  }
  console.log(`  → Matched: ${found || 'NOT FOUND'}\n`);
}
