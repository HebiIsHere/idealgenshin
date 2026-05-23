// Extract all artifact set data from genshin-db, write as beautified CSV with Chinese headers
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const genshindb = require('genshin-db');
import * as fs from 'fs';
import * as path from 'path';

const allNames = genshindb.artifacts('names', { matchCategories: true });
const rows = [];

for (const name of allNames) {
  const zh = genshindb.artifacts(name, { resultLanguage: 'ChineseSimplified' });
  if (!zh || !zh.name) continue;
  
  const id = name.toLowerCase().replace(/[\s']+/g, '_').replace(/[^a-z0-9_]/g, '');
  
  rows.push({
    id,
    nameZh: zh.name,
    rarity: (zh.rarityList || []).join('/'),
    twoPcEffect: (zh.effect2Pc || '').replace(/\n/g, ' '),
    fourPcEffect: (zh.effect4Pc || '').replace(/\n/g, ' '),
    // 2件套
    atk_2: '',
    hp_2: '',
    def_2: '',
    dmg_2: '',
    cr_2: '',
    cd_2: '',
    em_2: '',
    er_2: '',
    react_2: '',
    ampReact_2: '',
    moonReact_2: '',
    // 4件套
    atk_4: '',
    hp_4: '',
    def_4: '',
    dmg_4: '',
    cr_4: '',
    cd_4: '',
    em_4: '',
    er_4: '',
    react_4: '',
    ampReact_4: '',
    moonReact_4: '',
    shred_4: '',
    defIgn_4: '',
    indep_4: '',
    // 备注
    other_2: '',
    other_4: '',
    notes: '',
  });
}

rows.sort((a, b) => {
  const ra = Math.max(...(a.rarity.split('/').map(Number)));
  const rb = Math.max(...(b.rarity.split('/').map(Number)));
  if (rb !== ra) return rb - ra;
  return a.nameZh.localeCompare(b.nameZh, 'zh-CN');
});

// Beautified output with Chinese headers
const out = [];
out.push('套装ID,套装名称,稀有度,2件套描述,4件套描述,,,,,,,2件套加成,,,,,,,,4件套加成,,,,,,,,,,,,,,备注');
out.push(',,,,,攻击力%,生命值%,防御力%,增伤%,暴击率%,暴击伤害%,精通,充能%,反应伤害%,增幅反应%,月曜反应%,其他,攻击力%,生命值%,防御力%,增伤%,暴击率%,暴击伤害%,精通,充能%,反应伤害%,增幅反应%,月曜反应%,减抗%,无视防御%,独立乘区%,其他,近似规则');
out.push(''); // blank separator

function esc(s) { return String(s ?? ''); }

for (const row of rows) {
  out.push([
    esc(row.id),
    esc(row.nameZh),
    esc(row.rarity),
    esc(row.twoPcEffect),
    esc(row.fourPcEffect),
    '', // spacer
    esc(row.atk_2), esc(row.hp_2), esc(row.def_2), esc(row.dmg_2),
    esc(row.cr_2), esc(row.cd_2), esc(row.em_2), esc(row.er_2),
    esc(row.react_2), esc(row.ampReact_2), esc(row.moonReact_2), esc(row.other_2),
    esc(row.atk_4), esc(row.hp_4), esc(row.def_4), esc(row.dmg_4),
    esc(row.cr_4), esc(row.cd_4), esc(row.em_4), esc(row.er_4),
    esc(row.react_4), esc(row.ampReact_4), esc(row.moonReact_4), esc(row.shred_4), esc(row.defIgn_4), esc(row.indep_4),
    esc(row.other_4),
    esc(row.notes),
  ].join(','));
}

const outPath = path.resolve(import.meta.dirname, '..', 'src', 'data', 'artifact_sets_template.csv');
fs.writeFileSync(outPath, '\uFEFF' + out.join('\n'));
console.log('Written ' + rows.length + ' sets');
