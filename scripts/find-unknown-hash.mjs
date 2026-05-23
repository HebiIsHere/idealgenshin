// Check what set hash 3626267699 might be
// Try to find it by checking known patterns
const genshindb = require('genshin-db');

// This hash might correspond to a set not in our database
// Let me check if it's a known hash from community data
const knownHashes = {
  '3626267699': '???', // Unknown - user reported
};

// Check if any genshin-db set matches a pattern
const all = genshindb.artifacts('names', { matchCategories: true });
console.log('All sets:', all.length);

// Check for newer sets that might have this hash
for (const n of all) {
  const en = genshindb.artifacts(n, { resultLanguage: 'English' });
  const zh = genshindb.artifacts(n, { resultLanguage: 'ChineseSimplified' });
  console.log(en.id, zh.name);
}
