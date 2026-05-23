/**
 * Tests for StatCalculator — validates stat accumulation logic.
 *
 * Key properties to verify:
 * - Percentage stats stored as decimals (0.466 not 46.6)
 * - Total = Base × (1 + % bonuses) + flat bonuses
 * - Crit rate capped at 1.0
 * - All additive stats accumulate correctly
 */
import { describe, it, expect } from 'vitest';
import { StatCalculator } from '../engine/stats';
import {
  SubstatType,
  ElementType,
  WeaponType,
} from '../types';
import type { CharacterBuild, CharacterData, WeaponData, StatScaling, WeaponConfig, ConstellationConfig, TalentConfig } from '../types';

// ============================================================
// Fixtures
// ============================================================
const ATK_SCALING: StatScaling = { atkRatio: 1, hpRatio: 0, defRatio: 0, emRatio: 0 };

function makeCharacter(overrides: Partial<CharacterData> = {}): CharacterData {
  return {
    id: 'test_char',
    name: 'Test Character',
    nameZh: '测试角色',
    element: ElementType.PYRO,
    weaponType: WeaponType.SWORD,
    baseStats: {
      hp: 10000,
      atk: 200,
      def: 500,
      critRate: 0.05,
      critDmg: 0.50,
      em: 0,
      er: 1.0,
    },
    ascensionStat: {
      type: SubstatType.CRIT_DMG,
      values: [0, 0, 0.096, 0.192, 0.288, 0.384, 0.48, 0.576, 0.624],
    },
    relevantSubstats: [SubstatType.CRIT_RATE, SubstatType.CRIT_DMG, SubstatType.ATK_PERCENT],
    defaultStatScaling: ATK_SCALING,
    ...overrides,
  };
}

const defaultWeapon: WeaponData = {
  id: 'test_weapon',
  name: 'Test Weapon',
  nameZh: '测试武器',
  rarity: 5,
  weaponType: WeaponType.SWORD,
  baseAtk: 500,
  substatType: SubstatType.CRIT_DMG,
  substatValue: 0.20,
  passiveName: '',
  passiveDesc: '',
};

const defaultWeaponConfig: WeaponConfig = {
  weaponData: defaultWeapon,
  weaponLevel: 90,
  refinement: 1,
  passiveBonus: {},
};

const defaultConstellationConfig: ConstellationConfig = {
  level: 0,
  bonus: {},
};

const defaultTalentConfig: TalentConfig = {
  bonus: {},
};

function makeBuild(overrides: Partial<CharacterBuild> = {}): CharacterBuild {
  return {
    character: makeCharacter(),
    weaponConfig: defaultWeaponConfig,
    artifacts: [],
    characterLevel: 90,
    skillMultiplier: 2.0,
    reactionType: 'NONE' as any,
    teamBuffs: [],
    constellationConfig: defaultConstellationConfig,
    talentConfig: defaultTalentConfig,
    setBonus: {},
    ...overrides,
  };
}

// ============================================================
// Tests
// ============================================================
describe('StatCalculator', () => {
  it('base stats only (no artifacts, no buffs)', () => {
    const build = makeBuild();
    const result = StatCalculator.compute(build);

    // base ATK=200, weapon baseAtk=500, ATK%=0
    // totalAtk = (200 + 500) * (1 + 0) = 700
    // Weapon substat is CRIT_DMG 0.20, so critDmgBonus += 0.20
    // Ascension: last value of CRIT_DMG values = 0.624, so critDmgBonus += 0.624
    // Total critDmg = base.critDmg + 0.20 + 0.624 = 0.50 + 0.824 = 1.324
    expect(result.totalAtk).toBeCloseTo(700, 2);
    expect(result.critDmg).toBeCloseTo(1.324, 3);

    // HP: base=10000, no % bonus, no flat bonus (no flower)
    expect(result.totalHp).toBeCloseTo(10000, 2);

    // CR: base=0.05, no bonus
    expect(result.critRate).toBeCloseTo(0.05, 3);
  });

  it('percentage stats stored as decimals', () => {
    const build = makeBuild({
      artifacts: [{
        id: 'circlet',
        slot: 'CIRCLET' as any,
        mainStatType: SubstatType.CRIT_RATE,
        mainStatValue: 0.311, // 31.1% stored as 0.311
        subStats: [],
        setName: 'test',
      }],
    });
    const result = StatCalculator.compute(build);
    // critRate = base(0.05) + asc(0 for CR since asc is CD) + weapon(0 for CR) + circlet(0.311)
    expect(result.critRate).toBeCloseTo(0.05 + 0.311, 3);
  });

  it('total = base × (1 + %bonus) + flat — HP example', () => {
    // Flower gives HP_FLAT main stat
    const build = makeBuild({
      artifacts: [
        {
          id: 'flower',
          slot: 'FLOWER' as any,
          mainStatType: SubstatType.HP_FLAT,
          mainStatValue: 4780,
          subStats: [
            { type: SubstatType.HP_PERCENT, value: 0.05 }, // 5% HP substat
          ],
          setName: 'test',
        },
      ],
    });
    const result = StatCalculator.compute(build);
    // totalHp = baseHp * (1 + hpPercentBonus) + hpFlatBonus
    // hpFlatBonus = 4780 (flower main)
    // hpPercentBonus = 0.05 (substat)
    // totalHp = 10000 * 1.05 + 4780 = 10500 + 4780 = 15280
    expect(result.totalHp).toBeCloseTo(15280, 2);
  });

  it('crit rate capped at 1.0', () => {
    const build = makeBuild({
      artifacts: [
        {
          id: 'circlet',
          slot: 'CIRCLET' as any,
          mainStatType: SubstatType.CRIT_RATE,
          mainStatValue: 0.311,
          subStats: [
            { type: SubstatType.CRIT_RATE, value: 0.35 }, // 35% CR substat
          ],
          setName: 'test',
        },
      ],
    });
    const result = StatCalculator.compute(build);
    // critRate = 0.05 (base) + 0.311 (main) + 0.35 (sub) = 0.711
    expect(result.critRate).toBeLessThanOrEqual(1.0);
  });

  it('crit rate capped at 1.0 with extreme values', () => {
    const build = makeBuild({
      artifacts: [
        {
          id: 'circlet',
          slot: 'CIRCLET' as any,
          mainStatType: SubstatType.CRIT_RATE,
          mainStatValue: 0.311,
          subStats: [
            { type: SubstatType.CRIT_RATE, value: 0.80 }, // extremely high
          ],
          setName: 'test',
        },
      ],
    });
    const result = StatCalculator.compute(build);
    // critRate = 0.05 + 0.311 + 0.80 = 1.161 => capped at 1.0
    expect(result.critRate).toBeCloseTo(1.0, 3);
  });

  it('ATK with weapon baseAtk and % bonus — weapon ATK merged into base', () => {
    const build = makeBuild({
      artifacts: [
        {
          id: 'sands',
          slot: 'SANDS' as any,
          mainStatType: SubstatType.ATK_PERCENT,
          mainStatValue: 0.466,
          subStats: [],
          setName: 'test',
        },
      ],
    });
    const result = StatCalculator.compute(build);
    // Correct formula: totalAtk = (base.atk + weapon.baseAtk) * (1 + ATK%)
    // totalAtk = (200 + 500) * (1 + 0.466) = 700 * 1.466 = 1026.2
    expect(result.totalAtk).toBeCloseTo(1026.2, 1);
  });

  it('EM is purely additive', () => {
    const build = makeBuild({
      artifacts: [
        {
          id: 'goblet',
          slot: 'GOBLET' as any,
          mainStatType: SubstatType.ELEMENTAL_MASTERY,
          mainStatValue: 186.5,
          subStats: [
            { type: SubstatType.ELEMENTAL_MASTERY, value: 40 },
          ],
          setName: 'test',
        },
      ],
    });
    const result = StatCalculator.compute(build);
    // em = base(0) + asc(0) + weapon(0) + goblet(186.5) + sub(40) = 226.5
    expect(result.em).toBeCloseTo(226.5, 2);
  });

  it('team buffs are accumulated', () => {
    const build = makeBuild({
      teamBuffs: [
        { name: 'Bennett Q', statType: SubstatType.ATK_PERCENT, value: 0.20 },
        { name: 'Noblesse', statType: SubstatType.ATK_PERCENT, value: 0.20 },
      ],
    });
    const result = StatCalculator.compute(build);
    // atkPercentBonus = 0.20 + 0.20 = 0.40
    // totalAtk = (200 + 500) * (1 + 0.40) = 700 * 1.40 = 980
    expect(result.totalAtk).toBeCloseTo(980, 2);
  });

  it('elemental damage bonus from goblet goes to dmgBonus', () => {
    const build = makeBuild({
      artifacts: [
        {
          id: 'goblet',
          slot: 'GOBLET' as any,
          mainStatType: SubstatType.PYRO_DMG_BONUS,
          mainStatValue: 0.466,
          subStats: [],
          setName: 'test',
        },
      ],
    });
    const result = StatCalculator.compute(build);
    // For PYRO character, PYRO_DMG_BONUS from goblet should go to dmgBonus
    expect(result.dmgBonus).toBeCloseTo(0.466, 3);
  });

  it('ascension stat accumulates correctly', () => {
    const char = makeCharacter({
      ascensionStat: {
        type: SubstatType.HP_PERCENT,
        values: [0, 0, 0.06, 0.12, 0.18, 0.24, 0.24, 0.30, 0.30],
      },
    });
    const build = makeBuild({ character: char });
    const result = StatCalculator.compute(build);
    // Last value in array = 0.30
    // totalHp = 10000 * (1 + 0.30) + 0 = 13000
    expect(result.totalHp).toBeCloseTo(13000, 2);
  });
});
