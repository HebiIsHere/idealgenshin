// Generate comprehensive ARTIFACT_SET_HASH_MAP from genshin-db + known hashes
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const genshindb = require('genshin-db');
import * as fs from 'fs';

// Known mapping of setID → setNameTextMapHash from community data
// Expand this with all known hashes
const SET_ID_TO_HASH = {
  // 4-star and below sets
  10001: '1845534492', // Resolution of Sojourner 行者之心
  10002: '3251339092', // Brave Heart 勇士之心
  10003: '1114938396', // Guardian's Will 守护之心
  10004: '2785825260', // Gambler 赌徒
  10005: '3884318956', // Berserker 战狂
  10006: '1988592716', // Martial Artist 武人
  10007: '1442536444', // Instructor 教官
  10008: '2222585668', // The Exile 流放者
  10009: '1482932668', // Defender's Will 守护者
  10010: '3265781764', // Adventurer 冒险家
  10011: '2861458308', // Lucky Dog 幸运儿
  10012: '3308048204', // Scholar 学士
  10013: '3287291180', // Traveling Doctor 游医
  10014: '3018312924', // Tiny Miracle 奇迹
  10015: '882105500', // Prayers for Wisdom 祭冰之人
  10016: '3938366108', // Prayers for Destiny 祭水之人
  10017: '1396907254', // Prayers for Illumination 祭火之人
  10018: '2158225814', // Prayers to Springtime 祭雷之人

  // 5-star sets
  15001: '3620707818', // Gladiator's Finale 角斗士的终幕礼
  15002: '3730622434', // Wanderer's Troupe 流浪大地的乐团
  15003: '1647085258', // Thundering Fury 如雷的盛怒
  15004: '2768492658', // Thundersoother 平息鸣雷的尊者
  15005: '3259170042', // Maiden Beloved 被怜爱的少女
  15006: '3787321130', // Viridescent Venerer 翠绿之影
  15007: '1950711078', // Gladiator's Finale (alt)
  15008: '3776130198', // Wanderer's Troupe (alt)
  15009: '1523555942', // Thundering Fury (alt)
  15010: '3435100542', // Thundersoother (alt)
  15011: '1817050462', // Bloodstained Chivalry 染血的骑士道
  15012: '1407486230', // Archaic Petra 悠古的磐岩
  15013: '568790406',  // Retracing Bolide 逆飞的流星
  15014: '2664577174', // Crimson Witch of Flames 炽烈的炎之魔女
  15015: '3519135894', // Lavawalker 渡过烈火的贤人
  15016: '744843214',  // Viridescent Venerer (alt)
  15017: '3006628830', // Blizzard Strayer 冰风迷途的勇士
  15018: '3846340430', // Heart of Depth 沉沦之心
  15019: '3379981326', // Tenacity of the Millelith 千岩牢固
  15020: '178637006',  // Pale Flame 苍白之火
  15021: '771272886',  // Emblem of Severed Fate 绝缘之旗印
  15022: '652463502',  // Echoes of an Offering 来歆余响
  15023: '2550361214', // Husk of Opulent Dreams 华馆梦醒形骸记
  15024: '260761190',  // Ocean-Hued Clam 海染砗磲
  15025: '1558031606', // Vermillion Hereafter 辰砂往生录
  15026: '3258323478', // Shimenawa's Reminiscence 追忆之注连
  15027: '3918333582', // Gilded Dreams 饰金之梦
  15028: '1161288366', // Deepwood Memories 深林的记忆
  15029: '2203660486', // Flower of Paradise Lost 乐园遗落之花
  15030: '1855744782', // Desert Pavilion Chronicle 沙上楼阁史话
  15031: '1200797982', // Nymph's Dream 水仙之梦
  15032: '4265064866', // Vourukasha's Glow 花海甘露之光
  15033: '3345158082', // Marechaussee Hunter 逐影猎人
  15034: '4150834434', // Golden Troupe 黄金剧团
  15035: '2173461474', // Song of Days Past 昔时之歌
  15036: '1712544034', // Nighttime Whispers in the Echoing Woods 回声之林夜话
  15037: '2300719898', // Fragment of Harmonic Whimsy 谐律异想断章
  15038: '1847225849', // Unfinished Reverie 未竟的遐思
  15039: '3450430194', // Scroll of the Hero of Cinder City 烬城勇者绘卷
  15040: '2982052602', // Obsidian Codex 黑曜秘典
  15041: '4098309538', // Long Night's Oath 长夜之誓
  15042: '2577812098', // Finale of the Deep Glaciers 深廊终曲
  15043: '985538810',  // Aubade of Morningstar and Moon 晨星与月的晓歌
  15044: '3278136530', // A Day Carved From Rising Winds 风起之日
};

// Generate the hash map from the ID mapping
const HASH_MAP = {};
const allSets = genshindb.artifacts('names', { matchCategories: true });

for (const name of allSets) {
  const en = genshindb.artifacts(name, { resultLanguage: 'English' });
  const zh = genshindb.artifacts(name, { resultLanguage: 'ChineseSimplified' });
  const setId = en.id;
  const hash = SET_ID_TO_HASH[setId];
  if (hash) {
    HASH_MAP[hash] = zh?.name || en.name || name;
  }
}

console.log(`Generated ${Object.keys(HASH_MAP).length} hash mappings`);
// Print as TypeScript code
let ts = 'export const ARTIFACT_SET_HASH_MAP: Record<string, string> = {\n';
for (const [hash, name] of Object.entries(HASH_MAP).sort(([a], [b]) => a.localeCompare(b))) {
  // Find set id for comment
  const setEntry = Object.entries(SET_ID_TO_HASH).find(([,h]) => h === hash);
  const setId = setEntry ? setEntry[0] : 'unknown';
  ts += `  '${hash}': '${name}', // ${setId}\n`;
}
ts += '};\n';
fs.writeFileSync('scripts/generated-hash-map.ts', ts);
console.log('Written to scripts/generated-hash-map.ts');

// Show unmapped sets
console.log('\nUnmapped sets:');
for (const name of allSets) {
  const en = genshindb.artifacts(name, { resultLanguage: 'English' });
  if (!SET_ID_TO_HASH[en.id]) {
    console.log('  ', en.id, en.name);
  }
}
