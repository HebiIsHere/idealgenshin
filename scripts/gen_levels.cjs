const fs = require('fs');
const path = require('path');
const genshin = require('genshin-db');

const projectRoot = path.resolve(__dirname, '..');
const charsDir = path.join(projectRoot, 'src', 'data', 'characters');
const outputPath = path.join(charsDir, '_all.json');

const files = fs.readdirSync(charsDir).filter(f => f.endsWith('.json') && f !== '_all.json');
const characters = [];

for (const file of files) {
  const data = JSON.parse(fs.readFileSync(path.join(charsDir, file), 'utf8'));
  if (!data.id) continue;

  // Fetch per-level stats from genshin-db
  const statsByLevel = {};
  const dbChar = genshin.characters(data.id);
  if (dbChar) {
    for (let lv = 1; lv <= 100; lv++) {
      const stats = dbChar.stats(String(lv));
      if (stats) {
        statsByLevel[String(lv)] = {
          hp: stats.hp,
          atk: stats.attack,
          def: stats.defense,
          critRate: 0.05,
          critDmg: 0.5,
          em: 0,
          er: 1,
        };
      }
    }
    // Use level 90 for the legacy baseStats field
    const s90 = statsByLevel['90'] || data.baseStats;
    data.baseStats = {
      hp: s90.hp,
      atk: s90.atk,
      def: s90.def,
      critRate: 0.05,
      critDmg: 0.5,
      em: 0,
      er: 1,
    };
  }
  data.statsByLevel = statsByLevel;
  characters.push(data);
}

fs.writeFileSync(outputPath, JSON.stringify(characters));
console.log(`Generated _all.json with ${characters.length} characters, each with 1-100 level stats`);
