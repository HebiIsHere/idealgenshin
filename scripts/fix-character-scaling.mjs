// Fix character stat scaling and relevant substats after import-genshin-data.mjs reset them.
import * as fs from 'fs';
import * as path from 'path';

const CHAR_DIR = path.resolve(import.meta.dirname, '..', 'src', 'data', 'characters');

// Stat scaling overrides
const SCALING_OVERRIDES = {
  // HP scalers
  hu_tao: { atkRatio: 0, hpRatio: 1, defRatio: 0, emRatio: 0 },
  yelan: { atkRatio: 0, hpRatio: 1, defRatio: 0, emRatio: 0 },
  neuvillette: { atkRatio: 0, hpRatio: 1, defRatio: 0, emRatio: 0 },
  nilou: { atkRatio: 0, hpRatio: 1, defRatio: 0, emRatio: 0 },
  sangonomiya_kokomi: { atkRatio: 0, hpRatio: 1, defRatio: 0, emRatio: 0 },
  furina: { atkRatio: 0, hpRatio: 1, defRatio: 0, emRatio: 0 },
  mualani: { atkRatio: 0, hpRatio: 1, defRatio: 0, emRatio: 0 },
  sigewinne: { atkRatio: 0, hpRatio: 1, defRatio: 0, emRatio: 0 },
  barbara: { atkRatio: 0, hpRatio: 1, defRatio: 0, emRatio: 0 },
  candace: { atkRatio: 0, hpRatio: 1, defRatio: 0, emRatio: 0 },
  zhongli: { atkRatio: 0, hpRatio: 1, defRatio: 0, emRatio: 0 },
  layla: { atkRatio: 0, hpRatio: 1, defRatio: 0, emRatio: 0 },
  diona: { atkRatio: 0, hpRatio: 1, defRatio: 0, emRatio: 0 },
  kuki_shinobu: { atkRatio: 0, hpRatio: 1, defRatio: 0, emRatio: 0 },
  baizhu: { atkRatio: 0, hpRatio: 1, defRatio: 0, emRatio: 0 },
  
  // DEF scalers  
  albedo: { atkRatio: 0, hpRatio: 0, defRatio: 1, emRatio: 0 },
  arataki_itto: { atkRatio: 0, hpRatio: 0, defRatio: 1, emRatio: 0 },
  chiori: { atkRatio: 0, hpRatio: 0, defRatio: 1, emRatio: 0 },
  xilonen: { atkRatio: 0, hpRatio: 0, defRatio: 1, emRatio: 0 },
  noelle: { atkRatio: 0, hpRatio: 0, defRatio: 1, emRatio: 0 },
  yun_jin: { atkRatio: 0, hpRatio: 0, defRatio: 1, emRatio: 0 },
  gorou: { atkRatio: 0, hpRatio: 0, defRatio: 1, emRatio: 0 },
  
  // Mixed/EM scalers
  nahida: { atkRatio: 0.4, hpRatio: 0, defRatio: 0, emRatio: 0.6 },
  alhaitham: { atkRatio: 0.5, hpRatio: 0, defRatio: 0, emRatio: 0.5 },
  cyno: { atkRatio: 0.5, hpRatio: 0, defRatio: 0, emRatio: 0.5 },
  yae_miko: { atkRatio: 0.4, hpRatio: 0, defRatio: 0, emRatio: 0.6 },
  tighnari: { atkRatio: 0.5, hpRatio: 0, defRatio: 0, emRatio: 0.5 },
};

// Relevant substats overrides (in priority order)
const SUBSTAT_OVERRIDES = {
  hu_tao: ['HP_PERCENT', 'CRIT_RATE', 'CRIT_DMG', 'ELEMENTAL_MASTERY', 'ATK_PERCENT'],
  yelan: ['HP_PERCENT', 'CRIT_RATE', 'CRIT_DMG', 'ENERGY_RECHARGE', 'ELEMENTAL_MASTERY'],
  neuvillette: ['HP_PERCENT', 'CRIT_RATE', 'CRIT_DMG', 'ENERGY_RECHARGE', 'ELEMENTAL_MASTERY'],
  nilou: ['HP_PERCENT', 'ELEMENTAL_MASTERY', 'ENERGY_RECHARGE', 'CRIT_RATE', 'CRIT_DMG'],
  sangonomiya_kokomi: ['HP_PERCENT', 'ENERGY_RECHARGE', 'ELEMENTAL_MASTERY', 'ATK_PERCENT'],
  furina: ['HP_PERCENT', 'CRIT_RATE', 'CRIT_DMG', 'ENERGY_RECHARGE', 'ELEMENTAL_MASTERY'],
  albedo: ['DEF_PERCENT', 'CRIT_RATE', 'CRIT_DMG', 'ATK_PERCENT', 'ELEMENTAL_MASTERY'],
  arataki_itto: ['DEF_PERCENT', 'CRIT_RATE', 'CRIT_DMG', 'ENERGY_RECHARGE', 'ATK_PERCENT'],
  nahida: ['ELEMENTAL_MASTERY', 'CRIT_RATE', 'CRIT_DMG', 'ATK_PERCENT', 'ENERGY_RECHARGE'],
  alhaitham: ['ELEMENTAL_MASTERY', 'CRIT_RATE', 'CRIT_DMG', 'ATK_PERCENT', 'ENERGY_RECHARGE'],
};

let fixed = 0;
const allFiles = fs.readdirSync(CHAR_DIR).filter(f => f.endsWith('.json') && f !== '_all.json');

for (const file of allFiles) {
  const id = file.replace('.json', '');
  const filePath = path.join(CHAR_DIR, file);
  const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  let changed = false;

  if (SCALING_OVERRIDES[id]) {
    data.defaultStatScaling = SCALING_OVERRIDES[id];
    changed = true;
  }

  if (SUBSTAT_OVERRIDES[id]) {
    data.relevantSubstats = SUBSTAT_OVERRIDES[id];
    changed = true;
  }

  if (changed) {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    console.log(`Fixed: ${id} → ${data.nameZh}`);
    fixed++;
  }
}

console.log(`\nFixed ${fixed} characters.`);
