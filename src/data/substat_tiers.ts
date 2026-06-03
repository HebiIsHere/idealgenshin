/**
 * 副词条档位表 + 分解函数 + 初始词条数推断。
 *
 * 每条副词条由「初始档位 + 若干次强化档位」组成。
 * 每个档位有 4 个可能值（70% / 80% / 90% / 100%）。
 * 通过贪心分解逆推强化次数，进一步推断该圣遗物初始是 3 词条还是 4 词条。
 */

/** 百分比类型的档位值（十进制）。70%/80%/90%/100% 相对于最高值。 */
const PERCENT_TIERS = [0.7, 0.8, 0.9, 1.0];

/** 每条副词条的最高值（max roll = 100% 档位）。百分比类型为小数，固定值为整数。 */
const SUBSTAT_MAX_ROLL: Record<string, number> = {
  CRIT_RATE: 0.039,
  CRIT_DMG: 0.078,
  ATK_PERCENT: 0.058,
  HP_PERCENT: 0.058,
  DEF_PERCENT: 0.073,
  ENERGY_RECHARGE: 0.065,
  ELEMENTAL_MASTERY: 23,
  ATK_FLAT: 19,
  HP_FLAT: 299,
  DEF_FLAT: 23,
};

/** 数值容差 — 覆盖 Enka 浮点误差。 */
const TOLERANCE = 0.0002;

/** 档位值缓存：maxRoll × tier，避免重复计算。 */
function getCachedTiers(maxRoll: number): number[] {
  return PERCENT_TIERS.map((t) => {
    const raw = maxRoll * t;
    // 固定值类型取整
    return raw > 10 ? Math.round(raw) : Number(raw.toFixed(4));
  });
}

/**
 * 对一条副词条的最终数值做贪心分解，返回总的强化次数（初始 1 条 + 强化 N 次）。
 *
 * @param type   - 副词条类型
 * @param value  - 最终面板数值（Enka 返回的原始值，百分比为小数，固定值为整数）
 * @returns 总 roll 数（整数）。无法分解时返回 1（保守）。
 */
export function decomposeSubstat(type: string, value: number): number {
  if (value <= 0) return 0;

  const maxRoll = SUBSTAT_MAX_ROLL[type];
  if (maxRoll === undefined) return 1; // 未知类型，保守给 1

  const tiers = getCachedTiers(maxRoll).sort((a, b) => b - a); // 从大到小贪心
  let remaining = value;
  let count = 0;

  for (const tier of tiers) {
    while (remaining + TOLERANCE >= tier) {
      remaining -= tier;
      count += 1;
    }
  }

  // 如果有无法分解的残余（数值异常），保守返回至少 1
  if (count === 0 && value > 0) return 1;

  return count;
}

/**
 * 推断一件圣遗物的初始词条数。
 *
 * 原理：一件 +20 圣遗物有 4 条互不重复的副词条。
 * - 初始 4 词条 → 4 初始 + 5 强化 = 9 个槽位
 * - 初始 3 词条 → 3 初始 + 1 补词条 + 4 强化 = 8 个槽位
 *
 * 因此，4 条词的 roll 数之和：
 * - = 9 → 初始 4 词条
 * - = 8 → 初始 3 词条
 *
 * 如果由于歧义词条落入了「3 条高值 ≈ 4 条低值」的区间，
 * 某个词条的 roll 数可能有 ±1 的歧义。
 * 此时用 4 条词的总和做交叉验证：
 * 若存在一种排列使总和 = 9 而另一种 = 8，保守取 4。
 *
 * @param substats - 4 条副属性 [{type, value}]（value 为最终面板值）
 * @returns 3 或 4
 */
export function inferInitialCount(
  substats: { type: string; value: number }[],
): 3 | 4 {
  if (substats.length < 4) return 3; // 未满级（<4 条）→ 初始 3 词条

  let totalRolls = 0;

  // 先贪心分解，检测每条词条是否有歧义
  const rolls: number[] = [];
  const ambiguities: number[][] = []; // 每条词条可能的 [低roll, 高roll]

  for (const sub of substats) {
    const r = decomposeSubstat(sub.type, sub.value);
    rolls.push(r);
    totalRolls += r;

    // 检测歧义：该词条是否可能多 1 或少 1 条
    const maxRoll = SUBSTAT_MAX_ROLL[sub.type];
    if (maxRoll === undefined) {
      ambiguities.push([r]);
      continue;
    }

    const tiers = getCachedTiers(maxRoll);
    // 最小档位和最大档位的差值
    const minTier = Math.min(...tiers);
    const maxTier = Math.max(...tiers);

    const lower = r * minTier;
    const upper = r * maxTier;
    const actual = sub.value;

    // 如果实际值在 (lower - tol) ~ (lower + spread/2) 之间，可能少算了 1 条
    // 如果实际值在 (upper - spread/2) ~ (upper + tol) 之间，可能多算了 1 条
    const spread = upper - lower;
    const candidates = new Set([r]);
    if (r > 1 && actual < lower + spread * 0.3 + TOLERANCE) {
      candidates.add(r - 1);
    }
    if (actual > upper - spread * 0.3 - TOLERANCE && r < 9) {
      candidates.add(r + 1);
    }
    ambiguities.push(Array.from(candidates).sort());
  }

  // 无歧义：直接根据总 roll 判断
  if (ambiguities.every((a) => a.length === 1)) {
    return totalRolls <= 8 ? 3 : 4;
  }

  // 有歧义：穷举所有组合，看能否凑出 8 或 9
  const canBe8 = searchSum(ambiguities, 8);
  const canBe9 = searchSum(ambiguities, 9);

  if (canBe8 && !canBe9) return 3;
  if (canBe9 && !canBe8) return 4;
  // 都能或都不能 → 保守取 4
  return 4;
}

/** 穷举 ambiguities 各取一个候选值，检查和能否等于 target。 */
function searchSum(ambiguities: number[][], target: number): boolean {
  let currentSums = new Set<number>([0]);
  for (const cands of ambiguities) {
    const next = new Set<number>();
    for (const s of currentSums) {
      for (const c of cands) {
        // 剪枝：如果当前和 + 最小可能剩余 > target + 4，跳过
        // （剩余最多 3 条各最多 +1 = +3；最少 3 条各最多 -1 = -3）
        if (s > target + 4) continue;
        next.add(s + c);
      }
    }
    currentSums = next;
  }
  return currentSums.has(target);
}

/**
 * 副词条中值表（仅暴露给优化器使用，与 SUBSTAT_MID_VALUES 保持一致）。
 */
export { SUBSTAT_MAX_ROLL };

/** 单个槽位的词条数范围（按最值换算）。 */
export const SLOT_MIN_ROLLS = 0.7 / 0.85;   // ~0.824
export const SLOT_MAX_ROLLS = 1.0 / 0.85;   // ~1.176

/** 理想模板约束常量（用槽位数表示，优化器内部换算为中值词条）。 */
export const IDEAL_MAX_TOTAL_ROLLS = 53;       // 5×9槽位×最高档(1.176)≈52.92→53
export const IDEAL_MAX_ROLLS_PER_TYPE = 35;    // 5×6×1.176≈35.28→35
export const REDISTRIBUTE_SLOTS_PER_ARTIFACT = 9;  // 初始4词条: 4初始+5强化
export const REDISTRIBUTE_INITIAL_SLOTS_3 = 8;     // 初始3词条
