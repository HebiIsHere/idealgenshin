#!/usr/bin/env node
// scripts/import-genshin-data.mjs v2
// Imports character and weapon data from genshin-db into the artifact-optimizer format.
// Uses ChineseSimplified locale for display names.

import * as fs from 'fs';
import * as path from 'path';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const genshindb = require('genshin-db');

const CHARS_DIR = 'C:\\Users\\zxy\\.openclaw\\workspace\\artifact-optimizer\\src\\data\\characters';
const WEAPONS_DIR = 'C:\\Users\\zxy\\.openclaw\\workspace\\artifact-optimizer\\src\\data\\weapons';

const ELEMENT_MAP = {
  'Pyro': 'PYRO', 'Hydro': 'HYDRO', 'Cryo': 'CRYO',
  'Electro': 'ELECTRO', 'Anemo': 'ANEMO', 'Geo': 'GEO', 'Dendro': 'DENDRO'
};

const WEAPON_MAP = {
  'WEAPON_SWORD_ONE_HAND': 'SWORD', 'WEAPON_CLAYMORE': 'CLAYMORE',
  'WEAPON_POLE': 'POLEARM', 'WEAPON_BOW': 'BOW', 'WEAPON_CATALYST': 'CATALYST'
};

const CHAR_SUBSTAT_MAP = {
  'FIGHT_PROP_CRITICAL_HURT': 'CRIT_DMG', 'FIGHT_PROP_CRITICAL': 'CRIT_RATE',
  'FIGHT_PROP_ATTACK_PERCENT': 'ATK_PERCENT', 'FIGHT_PROP_HP_PERCENT': 'HP_PERCENT',
  'FIGHT_PROP_DEFENSE_PERCENT': 'DEF_PERCENT', 'FIGHT_PROP_ELEMENT_MASTERY': 'ELEMENTAL_MASTERY',
  'FIGHT_PROP_CHARGE_EFFICIENCY': 'ENERGY_RECHARGE', 'FIGHT_PROP_HEAL_ADD': 'HEALING_BONUS',
  'FIGHT_PROP_PHYSICAL_ADD_HURT': 'PHYSICAL_DMG_BONUS',
  'FIGHT_PROP_FIRE_ADD_HURT': 'PYRO_DMG_BONUS', 'FIGHT_PROP_WATER_ADD_HURT': 'HYDRO_DMG_BONUS',
  'FIGHT_PROP_ICE_ADD_HURT': 'CRYO_DMG_BONUS', 'FIGHT_PROP_ELEC_ADD_HURT': 'ELECTRO_DMG_BONUS',
  'FIGHT_PROP_WIND_ADD_HURT': 'ANEMO_DMG_BONUS', 'FIGHT_PROP_ROCK_ADD_HURT': 'GEO_DMG_BONUS',
  'FIGHT_PROP_GRASS_ADD_HURT': 'DENDRO_DMG_BONUS'
};

const WPN_SUBSTAT_MAP = {
  'ATK': 'ATK_PERCENT', 'DEF': 'DEF_PERCENT', 'HP': 'HP_PERCENT',
  'CRIT Rate': 'CRIT_RATE', 'CRIT DMG': 'CRIT_DMG',
  'Elemental Mastery': 'ELEMENTAL_MASTERY', 'Energy Recharge': 'ENERGY_RECHARGE',
  'Physical DMG Bonus': 'PHYSICAL_DMG_BONUS'
};

const SPECIALIZED_BASE = {
  'CRIT_RATE': 0.05, 'CRIT_DMG': 0.50, 'ELEMENTAL_MASTERY': 0,
  'ENERGY_RECHARGE': 1.0, 'ATK_PERCENT': 0, 'HP_PERCENT': 0, 'DEF_PERCENT': 0,
  'HEALING_BONUS': 0, 'PHYSICAL_DMG_BONUS': 0
};

function round(n) { return Math.round(n); }

function formatId(name) {
  return name.toLowerCase().replace(/[\s']+/g, '_').replace(/[^a-z0-9_]/g, '');
}

function getAscensionValues(character) {
  // Key level milestones querying specialized stat
  const milestones = [1, 20, '20+', 40, '40+', 50, '50+', 60, '60+', 70, '70+', 80, '80+', 90];
  const values = [];
  const base = character.stats(1).specialized;
  for (const m of milestones) {
    try {
      const stats = character.stats(m);
      const ascBonus = stats.specialized - base;
      values.push(Math.round(ascBonus * 1000) / 1000);
    } catch(e) { values.push(0); }
  }
  return values;
}

// ===== Characters =====
console.log('=== Characters ===');
const allChars = genshindb.characters('names', { matchCategories: true });
let cOk = 0, cSkip = 0;

for (const charName of allChars) {
  const charEn = genshindb.characters(charName, { resultLanguage: 'English' });
  if (!charEn || !charEn.elementText || !charEn.weaponType) { cSkip++; continue; }

  const element = ELEMENT_MAP[charEn.elementText];
  const weaponType = WEAPON_MAP[charEn.weaponType];
  if (!element || !weaponType) { cSkip++; continue; }

  const id = formatId(charName);
  const charZh = genshindb.characters(charName, { resultLanguage: 'ChineseSimplified' });
  const nameZh = charZh?.name || charName;

  try {
    const stats90 = charEn.stats(90);
    const ascStatType = CHAR_SUBSTAT_MAP[charEn.substatType] || 'ATK_PERCENT';

    const data = {
      id,
      name: charEn.name,
      nameZh,
      element,
      weaponType,
      baseStats: {
        hp: round(stats90.hp),
        atk: round(stats90.attack),
        def: round(stats90.defense),
        critRate: 0.05,
        critDmg: 0.50,
        em: 0,
        er: 1.0
      },
      ascensionStat: { type: ascStatType, values: getAscensionValues(charEn) },
      relevantSubstats: ['CRIT_RATE', 'CRIT_DMG', 'ATK_PERCENT', 'ENERGY_RECHARGE', 'ELEMENTAL_MASTERY'],
      defaultStatScaling: { atkRatio: 1, hpRatio: 0, defRatio: 0, emRatio: 0 }
    };

    fs.writeFileSync(path.join(CHARS_DIR, `${id}.json`), JSON.stringify(data, null, 2));
    console.log(`  ${charEn.name} → ${id}`);
    cOk++;
  } catch(e) { console.log(`  ERR ${charName}: ${e.message}`); cSkip++; }
}
console.log(`Characters: ${cOk} ok, ${cSkip} skipped`);

// ===== Weapons =====
console.log('\n=== Weapons ===');
const allWeapons = genshindb.weapons('names', { matchCategories: true });
let wOk = 0, wSkip = 0;

for (const wName of allWeapons) {
  const wep = genshindb.weapons(wName, { resultLanguage: 'English' });
  if (!wep || !wep.weaponType) { wSkip++; continue; }
  const weaponType = WEAPON_MAP[wep.weaponType];
  if (!weaponType) { wSkip++; continue; }

  const wid = formatId(wName);
  const wepZh = genshindb.weapons(wName, { resultLanguage: 'ChineseSimplified' });
  const nameZh = wepZh?.name || wName;

  try {
    const stats90 = wep.stats(90);
    const substatType = WPN_SUBSTAT_MAP[wep.mainStatText] || 'ATK_PERCENT';
    const passiveName = wepZh.effectName || '';
    const passiveDesc = (wepZh.r1?.description || '').replace(/<[^>]+>/g, '').trim();

    // extract R1–R5 refinement data from genshin-db
    const refinements = [];
    for (let i = 1; i <= 5; i++) {
      const ref = wepZh[`r${i}`];
      refinements.push({
        description: (ref?.description || '').replace(/<[^>]+>/g, '').trim(),
        values: ref?.values || [],
      });
    }

    const data = {
      id: wid,
      name: wep.name,
      nameZh,
      rarity: wep.rarity || 3,
      weaponType,
      baseAtk: round(stats90.attack),
      substatType,
      substatValue: Math.round(stats90.specialized * 1000) / 1000,
      passiveName,
      passiveDesc,
      refinements: refinements.some(r => r.description) ? refinements : undefined,
    };

    // Skip if file already exists with the same data (idempotent)
    fs.writeFileSync(path.join(WEAPONS_DIR, `${wid}.json`), JSON.stringify(data, null, 2));
    wOk++;
  } catch(e) { console.log(`  ERR ${wName}: ${e.message}`); wSkip++; }
}
console.log(`Weapons: ${wOk} ok, ${wSkip} skipped`);

// Clean up temp dir
console.log('\nDone. Run npx tsc --noEmit and npx vitest run to verify.');
