/**
 * Tests for the Optimizer modules — validates correctness of
 * redistribution and ideal template optimization.
 *
 * Key properties to verify:
 * - Total roll count is conserved (before/after optimization)
 * - Optimized damage >= original damage (or equal if already optimal)
 * - Ideal template produces a valid, non-zero result
 * - Search space enumeration is complete and valid
 */
import { describe, it, expect } from 'vitest';
import { RedistributeOptimizer } from '../optimizer/redistribute';
import { IdealTemplateOptimizer } from '../optimizer/ideal';
import { SearchSpaceExplorer } from '../optimizer/search';
import {
  SubstatType,
  ElementType,
  WeaponType,
  ReactionType,
} from '../types';
import { MAX_TOTAL_ROLLS } from '../data/constants';
import type {
  CharacterData,
  CharacterBuild,
  WeaponData,
  WeaponConfig,
  ConstellationConfig,
  TalentConfig,
  ArtifactInstance,
  SubstatAllocation,
  IdealRequest,
  StatScaling,
} from '../types';
import { DEFAULT_WEAPON } from '../data/weapons/index';
import { MAIN_STAT_MAX_VALUES, SUBSTAT_MID_VALUES } from '../data/constants';

// ============================================================
// Fixtures
// ============================================================
const HP_SCALING: StatScaling = { atkRatio: 0, hpRatio: 1, defRatio: 0, emRatio: 0 };
const ATK_SCALING: StatScaling = { atkRatio: 1, hpRatio: 0, defRatio: 0, emRatio: 0 };

const huTao: CharacterData = {
  id: 'hu_tao',
  name: 'Hu Tao',
  nameZh: '胡桃',
  element: ElementType.PYRO,
  weaponType: WeaponType.POLEARM,
  baseStats: {
    hp: 15552,
    atk: 106,
    def: 698,
    critRate: 0.05,
    critDmg: 0.50,
    em: 0,
    er: 1.0,
  },
  ascensionStat: {
    type: SubstatType.CRIT_DMG,
    values: [0, 0, 0.096, 0.192, 0.288, 0.384, 0.48, 0.576, 0.624],
  },
  relevantSubstats: [
    SubstatType.CRIT_RATE,
    SubstatType.CRIT_DMG,
    SubstatType.HP_PERCENT,
    SubstatType.ELEMENTAL_MASTERY,
    SubstatType.ATK_PERCENT,
  ],
  defaultStatScaling: HP_SCALING,
};

const raiden: CharacterData = {
  id: 'raiden_shogun',
  name: 'Raiden Shogun',
  nameZh: '雷电将军',
  element: ElementType.ELECTRO,
  weaponType: WeaponType.POLEARM,
  baseStats: {
    hp: 12707,
    atk: 341,
    def: 799,
    critRate: 0.05,
    critDmg: 0.50,
    em: 0,
    er: 1.0,
  },
  ascensionStat: {
    type: SubstatType.ENERGY_RECHARGE,
    values: [0, 0, 0.08, 0.16, 0.24, 0.32, 0.40, 0.48, 0.533],
  },
  relevantSubstats: [
    SubstatType.CRIT_RATE,
    SubstatType.CRIT_DMG,
    SubstatType.ATK_PERCENT,
    SubstatType.ENERGY_RECHARGE,
    SubstatType.ELEMENTAL_MASTERY,
  ],
  defaultStatScaling: ATK_SCALING,
};

function makeStandardArtifacts(): ArtifactInstance[] {
  return [
    {
      id: 'flower',
      slot: 'FLOWER' as any,
      mainStatType: SubstatType.HP_FLAT,
      mainStatValue: MAIN_STAT_MAX_VALUES[SubstatType.HP_FLAT],
      subStats: [],
      setName: 'test',
    },
    {
      id: 'feather',
      slot: 'FEATHER' as any,
      mainStatType: SubstatType.ATK_FLAT,
      mainStatValue: MAIN_STAT_MAX_VALUES[SubstatType.ATK_FLAT],
      subStats: [],
      setName: 'test',
    },
    {
      id: 'sands',
      slot: 'SANDS' as any,
      mainStatType: SubstatType.HP_PERCENT,
      mainStatValue: MAIN_STAT_MAX_VALUES[SubstatType.HP_PERCENT],
      subStats: [],
      setName: 'test',
    },
    {
      id: 'goblet',
      slot: 'GOBLET' as any,
      mainStatType: SubstatType.PYRO_DMG_BONUS,
      mainStatValue: MAIN_STAT_MAX_VALUES[SubstatType.PYRO_DMG_BONUS],
      subStats: [],
      setName: 'test',
    },
    {
      id: 'circlet',
      slot: 'CIRCLET' as any,
      mainStatType: SubstatType.CRIT_RATE,
      mainStatValue: MAIN_STAT_MAX_VALUES[SubstatType.CRIT_RATE],
      subStats: [],
      setName: 'test',
    },
  ];
}

// ============================================================
// SearchSpaceExplorer Tests
// ============================================================
describe('SearchSpaceExplorer', () => {
  it('enumerates all distributions for 5 rolls across 2 types', () => {
    const types = [SubstatType.CRIT_RATE, SubstatType.CRIT_DMG];
    const results = SearchSpaceExplorer.enumerate(5, types);

    // With 2 types, max 6 per type, total 5:
    // (0,5), (1,4), (2,3), (3,2), (4,1), (5,0) = 6 distributions
    expect(results.length).toBe(6);

    // Verify each distribution sums to 5
    for (const dist of results) {
      const totalRolls = dist.reduce((s, a) => s + a.rolls, 0);
      expect(totalRolls).toBe(5);
    }
  });

  it('respects max rolls per type (6)', () => {
    const types = [SubstatType.CRIT_RATE, SubstatType.CRIT_DMG];
    const results = SearchSpaceExplorer.enumerate(10, types);

    for (const dist of results) {
      for (const alloc of dist) {
        expect(alloc.rolls).toBeLessThanOrEqual(6);
      }
      const totalRolls = dist.reduce((s, a) => s + a.rolls, 0);
      expect(totalRolls).toBe(10);
    }
  });

  it('returns [[]] for zero rolls', () => {
    const types = [SubstatType.CRIT_RATE];
    const results = SearchSpaceExplorer.enumerate(0, types);
    expect(results.length).toBe(1);
    expect(results[0].length).toBe(0);
  });

  it('all distributions sum to total', () => {
    const types = [SubstatType.CRIT_RATE, SubstatType.CRIT_DMG, SubstatType.ATK_PERCENT];
    const totalRolls = 8;
    const results = SearchSpaceExplorer.enumerate(totalRolls, types);

    for (const dist of results) {
      const sum = dist.reduce((s, a) => s + a.rolls, 0);
      expect(sum).toBe(totalRolls);
    }
  });

  // ============================================================
  // enumerateAndEvaluate Tests (new pruned search)
  // ============================================================
  describe('enumerateAndEvaluate', () => {
    it('returns same best result as enumerate for 2 types', () => {
      const types = [SubstatType.CRIT_RATE, SubstatType.CRIT_DMG];
      const totalRolls = 5;
      const evalFn = (alloc: SubstatAllocation[]) =>
        alloc.reduce((s, a) => s + a.rolls * (SUBSTAT_MID_VALUES[a.type] ?? 0), 0);

      // Brute-force
      const allAllocs = SearchSpaceExplorer.enumerate(totalRolls, types);
      let bestBrute = -Infinity;
      for (const alloc of allAllocs) {
        const dmg = evalFn(alloc);
        if (dmg > bestBrute) bestBrute = dmg;
      }

      // Pruned
      const { bestDamage } = SearchSpaceExplorer.enumerateAndEvaluate(
        totalRolls, types,
        (alloc) => evalFn(alloc),
      );

      expect(bestDamage).toBeCloseTo(bestBrute, 10);
    });

    it('returns same best result as enumerate for 5 types, 25 rolls', () => {
      const types = [
        SubstatType.CRIT_RATE, SubstatType.CRIT_DMG,
        SubstatType.HP_PERCENT, SubstatType.ELEMENTAL_MASTERY,
        SubstatType.ATK_PERCENT,
      ];
      const totalRolls = 25;
      const evalFn = (alloc: SubstatAllocation[]) =>
        alloc.reduce((s, a) => s + a.rolls * (SUBSTAT_MID_VALUES[a.type] ?? 0), 0);

      const allAllocs = SearchSpaceExplorer.enumerate(totalRolls, types);
      let bestBrute = -Infinity;
      for (const alloc of allAllocs) {
        const dmg = evalFn(alloc);
        if (dmg > bestBrute) bestBrute = dmg;
      }

      const { bestDamage } = SearchSpaceExplorer.enumerateAndEvaluate(
        totalRolls, types,
        (alloc) => evalFn(alloc),
      );

      expect(bestDamage).toBeCloseTo(bestBrute, 10);
    });

    it('conerves total rolls in result', () => {
      const types = [
        SubstatType.CRIT_RATE, SubstatType.CRIT_DMG,
        SubstatType.HP_PERCENT, SubstatType.ELEMENTAL_MASTERY,
        SubstatType.ATK_PERCENT,
      ];
      const totalRolls = 25;

      const { bestAllocation } = SearchSpaceExplorer.enumerateAndEvaluate(
        totalRolls, types,
        (alloc) => alloc.reduce((s, a) => s + a.rolls * (SUBSTAT_MID_VALUES[a.type] ?? 0), 0),
      );

      const totalInResult = bestAllocation.reduce((s, a) => s + a.rolls, 0);
      expect(totalInResult).toBe(totalRolls);
    });

    it('respects max rolls per type in result', () => {
      const types = [
        SubstatType.CRIT_RATE, SubstatType.CRIT_DMG,
        SubstatType.HP_PERCENT, SubstatType.ELEMENTAL_MASTERY,
        SubstatType.ATK_PERCENT,
      ];
      const totalRolls = 25;

      const { bestAllocation } = SearchSpaceExplorer.enumerateAndEvaluate(
        totalRolls, types,
        (alloc) => alloc.reduce((s, a) => s + a.rolls * (SUBSTAT_MID_VALUES[a.type] ?? 0), 0),
      );

      for (const alloc of bestAllocation) {
        expect(alloc.rolls).toBeLessThanOrEqual(6);
      }
    });

    it('handles zero rolls', () => {
      const types = [SubstatType.CRIT_RATE, SubstatType.CRIT_DMG];
      const { bestAllocation, bestDamage } = SearchSpaceExplorer.enumerateAndEvaluate(
        0, types,
        () => 0,
      );
      expect(bestAllocation.length).toBe(0);
      expect(bestDamage).toBe(0);
    });

    it('handles empty types', () => {
      const { bestAllocation, bestDamage } = SearchSpaceExplorer.enumerateAndEvaluate(
        5, [],
        () => 42,
      );
      expect(bestAllocation.length).toBe(0);
    });

    it('calls progress callback', () => {
      const types = [SubstatType.CRIT_RATE, SubstatType.CRIT_DMG, SubstatType.ATK_PERCENT];
      const progressCalls: number[] = [];
      SearchSpaceExplorer.enumerateAndEvaluate(
        10, types,
        (alloc) => alloc.reduce((s, a) => s + a.rolls * (SUBSTAT_MID_VALUES[a.type] ?? 0), 0),
        (progress) => { progressCalls.push(progress); },
      );
      // Should have at least one progress call (final 1.0)
      expect(progressCalls.length).toBeGreaterThan(0);
      expect(progressCalls[progressCalls.length - 1]).toBe(1);
    });

    it('returns correct result for single type', () => {
      const types = [SubstatType.CRIT_DMG];
      const totalRolls = 6;

      const { bestAllocation, bestDamage } = SearchSpaceExplorer.enumerateAndEvaluate(
        totalRolls, types,
        (alloc) => alloc.reduce((s, a) => s + a.rolls * (SUBSTAT_MID_VALUES[a.type] ?? 0), 0),
      );

      expect(bestAllocation.length).toBe(1);
      expect(bestAllocation[0].type).toBe(SubstatType.CRIT_DMG);
      expect(bestAllocation[0].rolls).toBe(6);
    });
  });
});

// ============================================================
// RedistributeOptimizer Tests
// ============================================================
describe('RedistributeOptimizer', () => {
  it('total rolls are conserved after optimization', () => {
    const weapon: WeaponData = {
      id: 'staff_of_homa',
      name: 'Staff of Homa',
      nameZh: '护摩之杖',
      rarity: 5,
      weaponType: WeaponType.POLEARM,
      baseAtk: 608,
      substatType: SubstatType.CRIT_DMG,
      substatValue: 0.662,
      passiveName: '无工之剑',
      passiveDesc: '',
    };
    const weaponConfig: WeaponConfig = {
      weaponData: weapon,
      weaponLevel: 90,
      refinement: 1,
      passiveBonus: {},
    };
    const constellationConfig: ConstellationConfig = {
      level: 0,
      bonus: {},
    };
    const build: CharacterBuild = {
      character: huTao,
      weaponConfig,
      artifacts: makeStandardArtifacts(),
      characterLevel: 90,
      skillMultiplier: 2.5,
      reactionType: ReactionType.VAPORIZE,
      teamBuffs: [],
      constellationConfig,
      talentConfig: { bonus: {} },
      setBonus: {},
    };

    const currentAllocations: SubstatAllocation[] = [
      { type: SubstatType.CRIT_RATE, rolls: 5 },
      { type: SubstatType.CRIT_DMG, rolls: 5 },
      { type: SubstatType.HP_PERCENT, rolls: 5 },
      { type: SubstatType.ELEMENTAL_MASTERY, rolls: 5 },
      { type: SubstatType.ATK_PERCENT, rolls: 5 },
    ];
    const totalRollsBefore = currentAllocations.reduce((s, a) => s + a.rolls, 0);

    const result = RedistributeOptimizer.optimize({ build, currentAllocations });
    const totalRollsAfter = result.optimizedAllocations.reduce((s, a) => s + a.rolls, 0);

    // V4.4: hill climbing allows fractional rolls — check approximate conservation
    expect(totalRollsAfter).toBeCloseTo(totalRollsBefore, 0);
  });

  it('optimized damage >= original damage', () => {
    const weapon: WeaponData = {
      id: 'staff_of_homa',
      name: 'Staff of Homa',
      nameZh: '护摩之杖',
      rarity: 5,
      weaponType: WeaponType.POLEARM,
      baseAtk: 608,
      substatType: SubstatType.CRIT_DMG,
      substatValue: 0.662,
      passiveName: '无工之剑',
      passiveDesc: '',
    };
    const weaponConfig: WeaponConfig = {
      weaponData: weapon,
      weaponLevel: 90,
      refinement: 1,
      passiveBonus: {},
    };
    const constellationConfig: ConstellationConfig = {
      level: 0,
      bonus: {},
    };
    const build: CharacterBuild = {
      character: huTao,
      weaponConfig,
      artifacts: makeStandardArtifacts(),
      characterLevel: 90,
      skillMultiplier: 2.5,
      reactionType: ReactionType.NONE,
      teamBuffs: [],
      constellationConfig,
      talentConfig: { bonus: {} },
      setBonus: {},
    };

    // Deliberately suboptimal allocation: all into ATK_PERCENT (HP scaler doesn't benefit much)
    const currentAllocations: SubstatAllocation[] = [
      { type: SubstatType.ATK_PERCENT, rolls: 20 },
      { type: SubstatType.CRIT_RATE, rolls: 2 },
      { type: SubstatType.CRIT_DMG, rolls: 2 },
      { type: SubstatType.HP_PERCENT, rolls: 2 },
      { type: SubstatType.ELEMENTAL_MASTERY, rolls: 2 },
    ];

    const result = RedistributeOptimizer.optimize({ build, currentAllocations });
    expect(result.optimizedDamage).toBeGreaterThanOrEqual(result.originalDamage);
  });

  it('zero rolls returns same damage', () => {
    const weaponConfig: WeaponConfig = {
      weaponData: DEFAULT_WEAPON,
      weaponLevel: 90,
      refinement: 1,
      passiveBonus: {},
    };
    const constellationConfig: ConstellationConfig = {
      level: 0,
      bonus: {},
    };
    const build: CharacterBuild = {
      character: huTao,
      weaponConfig,
      artifacts: makeStandardArtifacts(),
      characterLevel: 90,
      skillMultiplier: 2.5,
      reactionType: ReactionType.NONE,
      teamBuffs: [],
      constellationConfig,
      talentConfig: { bonus: {} },
      setBonus: {},
    };

    const currentAllocations: SubstatAllocation[] = [
      { type: SubstatType.CRIT_RATE, rolls: 0 },
      { type: SubstatType.CRIT_DMG, rolls: 0 },
    ];

    const result = RedistributeOptimizer.optimize({ build, currentAllocations });
    expect(result.optimizedDamage).toBe(result.originalDamage);
    expect(result.improvementPercent).toBe(0);
  });
});

// ============================================================
// IdealTemplateOptimizer Tests
// ============================================================
describe('IdealTemplateOptimizer', () => {
  it('returns non-zero theoretical damage for valid input', () => {
    const req: IdealRequest = {
      character: huTao,
      totalRolls: 20,
      skillMultiplier: 2.5,
      reactionType: ReactionType.NONE,
    };

    const result = IdealTemplateOptimizer.generate(req);
    expect(result.theoreticalDamage).toBeGreaterThan(0);
  });

  it('ideal allocation roll count matches totalRolls', () => {
    const req: IdealRequest = {
      character: huTao,
      totalRolls: 20,
      skillMultiplier: 2.5,
      reactionType: ReactionType.NONE,
    };

    const result = IdealTemplateOptimizer.generate(req);
    const totalAllocated = result.idealAllocations.reduce((s, a) => s + a.rolls, 0);
    expect(totalAllocated).toBe(20);
  });

  it('zero totalRolls returns non-zero damage (default build with weapon)', () => {
    const req: IdealRequest = {
      character: huTao,
      totalRolls: 0,
      skillMultiplier: 2.5,
      reactionType: ReactionType.NONE,
    };

    // V4.4: zero totalRolls still creates a default build with weapon + artifact main stats,
    // which produces non-zero base damage.
    const result = IdealTemplateOptimizer.generate(req);
    expect(result.theoreticalDamage).toBeGreaterThan(0);
  });

  it('ideal template for ATK scaler (Raiden) returns non-zero damage', () => {
    const req: IdealRequest = {
      character: raiden,
      totalRolls: 15,
      skillMultiplier: 5.0,
      reactionType: ReactionType.NONE,
    };

    const result = IdealTemplateOptimizer.generate(req);
    expect(result.theoreticalDamage).toBeGreaterThan(0);
    const totalAllocated = result.idealAllocations.reduce((s, a) => s + a.rolls, 0);
    expect(totalAllocated).toBe(15);
  });

  it('each allocation roll does not exceed MAX_TOTAL_ROLLS', () => {
    const req: IdealRequest = {
      character: huTao,
      totalRolls: 25,
      skillMultiplier: 2.5,
      reactionType: ReactionType.NONE,
    };

    const result = IdealTemplateOptimizer.generate(req);
    for (const alloc of result.idealAllocations) {
      expect(alloc.rolls).toBeLessThanOrEqual(MAX_TOTAL_ROLLS);
    }
  });
});
