// Fill artifact set structured bonuses - cleaner CSV output
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const genshindb = require('genshin-db');
import * as fs from 'fs';
import * as path from 'path';

const allNames = genshindb.artifacts('names', { matchCategories: true });

// All values as PERCENTAGES (e.g., 15 = 15%)
const B = {
  crimson_witch: { dmg_2: 15, react_4: 40, ampReact_4: 15, notes: '仅火系角色; 叠层2件套效果未计入' },
  emblem_of_severed_fate: { er_2: 20, notes: '4件套效果依赖充能值，未结构化' },
  noblesse_oblige: { dmg_2: 20, atk_4: 20, notes: '4件套仅对队伍生效' },
  marechaussee_hunter: { dmg_2: 15, cr_4: 36, notes: '假设满3层' },
  blizzard_strayer: { dmg_2: 15, cr_4: 40, notes: '假设冻结状态' },

  pale_flame: { dmg_2: 25, atk_4: 18, notes: '2件套满层翻倍已计入dmg_2; 假设叠满2层' },
  heart_of_depth: { dmg_2: 15, dmg_4: 30, notes: '水元素伤害; 4件套为普攻/重击伤害' },
  vermillion_hereafter: { atk_2: 18, atk_4: 48, notes: '假设叠满4层' },
  echoes_of_an_offering: { atk_2: 18, notes: '4件套概率触发普攻加成36%，未结构化' },
  husk_of_opulent_dreams: { def_2: 30, def_4: 24, dmg_4: 24, notes: '假设叠满4层; 岩伤' },
  ocean_hued_clam: { notes: '治疗套，无直接伤害加成' },
  lavawalker: { dmg_4: 35, notes: '仅对火附着敌人; 2件套为火抗无伤害' },
  thundering_fury: { dmg_2: 15, react_4: 40, other_4: '超激化+20%', notes: '雷元素伤害; 超激化加成未结构化' },
  thundersoother: { dmg_4: 35, notes: '仅对雷附着敌人; 2件套为雷抗无伤害' },
  viridescent_venerer: { dmg_2: 15, react_4: 60, shred_4: 40, notes: '扩散伤害+60%; 减抗40%仅对应扩散元素' },
  gladiators_finale: { atk_2: 18, dmg_4: 35, notes: '普攻加成仅单手剑/大剑/长柄武器' },
  wanderers_troupe: { em_2: 80, dmg_4: 35, notes: '重击加成仅法器/弓' },
  bloodstained_chivalry: { dmg_2: 25, dmg_4: 50, notes: '物伤; 4件套需击败敌人后' },
  archaic_petra: { dmg_2: 15, dmg_4: 35, notes: '岩伤; 4件套需拾取结晶且仅对应元素' },
  retracing_bolide: { dmg_4: 40, notes: '需护盾庇护下; 2件套为护盾强效无伤害' },
  shimenawas_reminiscence: { atk_2: 18, dmg_4: 50, notes: '普攻/重击/下落伤害' },
  tenacity_of_the_millelith: { hp_2: 20, atk_4: 20, notes: '4件套仅对队伍生效' },
  deepwood_memories: { dmg_2: 15, shred_4: 30, notes: '草元素伤害; 减草抗' },
  gilded_dreams: { em_2: 80, em_4: 150, atk_4: 14, notes: '精通往满配(3异色+队外)约150; ATK约14%' },
  desert_pavilion_chronicle: { dmg_2: 15, dmg_4: 40, notes: '风伤; 普攻/重击/下落伤害' },
  flower_of_paradise_lost: { em_2: 80, react_4: 80, notes: '假设叠满4层' },
  golden_troupe: { other_2: '战技伤害+20%(非通用增伤)', dmg_4: 45, notes: '4件套基础25%+后台25%=50%战技伤害; 取后台满值' },
  song_of_days_past: { notes: '治疗套，无直接伤害加成' },
  nighttime_whispers_in_the_echoing_woods: { atk_2: 18, dmg_4: 20, notes: '岩伤; 晶片盾下额外20%已含' },
  vourukashas_glow: { hp_2: 20, dmg_4: 80, notes: '假设叠满5层; 仅战技/爆发伤害' },
  nymphs_dream: { dmg_2: 15, atk_4: 25, other_4: '水伤+15%', notes: '假设叠满3层; 2件套为水伤' },
  harmonic_whimsy: { atk_2: 18, dmg_4: 54, notes: '假设叠满3层' },
  unfinished_reverie: { atk_2: 18, dmg_4: 50, notes: '假设叠满; 4件套仅对燃烧附近敌人' },
  scroll_of_the_hero_of_cinder_city: { dmg_4: 40, notes: '需触发夜魂; 2件套为回能无伤害' },
  obsidian_codex: { dmg_2: 15, cr_4: 40, notes: '假设消耗夜魂后' },

  instructor: { em_2: 80, other_4: '全队+120精通', notes: '触发反应后' },
  the_exile: { er_2: 20, notes: '4件套为队伍回能' },
  berserker: { cr_2: 12, cr_4: 24, notes: '假设血量低于70%' },
  martial_artist: { dmg_2: 15, dmg_4: 25, notes: '使用战技后; 普攻/重击伤害' },
  resolution_of_sojourner: { atk_2: 18, cr_4: 30, notes: '仅重击暴击率' },
  brave_heart: { atk_2: 18, dmg_4: 30, notes: '仅对生命>50%敌人' },
  gambler: { dmg_2: 20, notes: '仅战技伤害' },
  defenders_will: { notes: '防御套，无直接伤害加成' },
  tiny_miracle: { notes: '抗性套，无直接伤害加成' },
  traveling_doctor: { notes: '治疗套，无直接伤害加成' },
  lucky_dog: { notes: '纯防御/回血，无直接伤害加成' },
  adventurer: { notes: '纯生存，无直接伤害加成' },
  prayes_for_destiny: { notes: '受治疗加成，无直接伤害' },
  prayes_for_illumination: { notes: '火抗，无直接伤害' },
  prayes_for_wisdom: { notes: '雷抗，无直接伤害' },
  prayers_to_springtime: { notes: '冰抗，无直接伤害' },
};

const HEADERS = [
  '套装ID', '套装名称', '稀有度',
  '2件套描述', '4件套描述',
  '2攻%', '2生%', '2防%', '2增伤%', '2暴率%', '2暴伤%', '2精通', '2充能%',
  '2剧变%', '2增幅%', '2月曜%', '2其他',
  '4攻%', '4生%', '4防%', '4增伤%', '4暴率%', '4暴伤%', '4精通', '4充能%',
  '4剧变%', '4增幅%', '4月曜%', '4减抗%', '4无视防%', '4独立%', '4其他',
  '备注',
];

function esc(s) { return String(s ?? ''); }

const rows = [];
for (const name of allNames) {
  const zh = genshindb.artifacts(name, { resultLanguage: 'ChineseSimplified' });
  if (!zh || !zh.name) continue;
  const id = name.toLowerCase().replace(/[\s']+/g, '_').replace(/[^a-z0-9_]/g, '');
  const b = B[id] || {};
  rows.push({
    id, nameZh: zh.name, rarity: (zh.rarityList || []).join('/'),
    t2: (zh.effect2Pc || '').replace(/\n/g, ' '),
    t4: (zh.effect4Pc || '').replace(/\n/g, ' '),
    a2: b.atk_2 ?? '', h2: b.hp_2 ?? '', d2: b.def_2 ?? '', dm2: b.dmg_2 ?? '',
    c2: b.cr_2 ?? '', cd2: b.cd_2 ?? '', e2: b.em_2 ?? '', er2: b.er_2 ?? '',
    r2: b.react_2 ?? '', ar2: b.ampReact_2 ?? '', mr2: b.moonReact_2 ?? '', o2: b.other_2 ?? '',
    a4: b.atk_4 ?? '', h4: b.hp_4 ?? '', d4: b.def_4 ?? '', dm4: b.dmg_4 ?? '',
    c4: b.cr_4 ?? '', cd4: b.cd_4 ?? '', e4: b.em_4 ?? '', er4: b.er_4 ?? '',
    r4: b.react_4 ?? '', ar4: b.ampReact_4 ?? '', mr4: b.moonReact_4 ?? '',
    s4: b.shred_4 ?? '', di4: b.defIgn_4 ?? '', i4: b.indep_4 ?? '', o4: b.other_4 ?? '',
    notes: b.notes ?? '',
  });
}

rows.sort((a, b) => {
  const ra = Math.max(...(a.rarity.split('/').map(Number)));
  const rb = Math.max(...(b.rarity.split('/').map(Number)));
  if (rb !== ra) return rb - ra;
  return a.nameZh.localeCompare(b.nameZh, 'zh-CN');
});

let csv = '\uFEFF' + HEADERS.join(',') + '\n';
for (const r of rows) {
  csv += [
    esc(r.id), esc(r.nameZh), esc(r.rarity), esc(r.t2), esc(r.t4),
    esc(r.a2), esc(r.h2), esc(r.d2), esc(r.dm2),
    esc(r.c2), esc(r.cd2), esc(r.e2), esc(r.er2),
    esc(r.r2), esc(r.ar2), esc(r.mr2), esc(r.o2),
    esc(r.a4), esc(r.h4), esc(r.d4), esc(r.dm4),
    esc(r.c4), esc(r.cd4), esc(r.e4), esc(r.er4),
    esc(r.r4), esc(r.ar4), esc(r.mr4),
    esc(r.s4), esc(r.di4), esc(r.i4), esc(r.o4),
    esc(r.notes),
  ].join(',') + '\n';
}

const outPath = path.resolve(import.meta.dirname, '..', 'src', 'data', 'artifact_sets_filled.csv');
if (fs.existsSync(outPath)) {
  try { fs.unlinkSync(outPath); } catch(e) { /* locked by Excel */ }
}
// Write to temp file if original is locked
let finalPath = outPath;
try {
  fs.writeFileSync(outPath, csv);
} catch(e) {
  finalPath = outPath.replace('.csv', '_v2.csv');
  fs.writeFileSync(finalPath, csv);
}
console.log('Written ' + rows.length + ' sets to ' + finalPath);
