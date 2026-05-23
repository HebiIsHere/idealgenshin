# 增量 PRD：5路径伤害引擎重构

## 变更概述

将现有2路径（增幅/剧变）伤害计算引擎重构为5路径（直伤/增幅/剧变/激化/月曜），同时扩展防御区公式和多属性缩放支持，以覆盖原神全版本伤害体系。

---

## 用户故事

| # | 用户故事 |
|---|---------|
| US1 | 作为角色输出计算用户，我想看到无反应纯直伤角色的完整伤害（如钟离、一斗），以便评估非反应队伍的词条优先级 |
| US2 | 作为增幅反应玩家，我想看到蒸发/融化路径独立展示且公式不变，以便与旧版结果对齐验证 |
| US3 | 作为草体系玩家，我想计算超激化/蔓激化的伤害，以便正确评估草系角色的词条收益（激化加成走全乘区） |
| US4 | 作为剧变反应玩家，我想看到更新后的5.2版本倍率（超载2.75等），以便获得准确的剧变伤害数值 |
| US5 | 作为6.x版本玩家，我想计算月曜反应（月绽放/月感电/月结晶）的伤害，以便评估月曜体系的词条价值（可暴击+无视防御+独立擢升区） |
| US6 | 作为纳西妲等多属性缩放角色用户，我想同时输入ATK%和EM%的技能倍率，以便准确计算混合缩放角色的伤害 |
| US7 | 作为防御减益场景用户，我想输入多个防御削减/无视来源，以便计算超导+雷泽C4等叠加情况下的实际伤害 |

---

## 需求池

### P0 — Must Have

| ID | 需求 | 说明 |
|----|------|------|
| P0-1 | 5路径公式引擎 | 实现直伤/增幅/剧变/激化/月曜5条独立计算路径 |
| P0-2 | 剧变5.2倍率更新 | 更新超载(2.75)/感电(2.0)/超导(1.5)/碎冰(3.0)的倍率值 |
| P0-3 | 激化路径实现 | 超激化(1.15)/蔓激化(1.25)加成叠加到基础伤害后走全乘区 |
| P0-4 | 防御区公式扩展 | 支持 DefReduction（相加）和 DefIgnore（与Reduction相乘） |
| P0-5 | 多属性缩放 | Base = ATK×ATK% + HP×HP% + DEF×DEF% + EM×EM% |
| P0-6 | 默认参数更新 | 怪物等级默认值从90改为100 |
| P0-7 | 增幅路径对齐 | 确保增幅路径公式与现有实现一致，无回归 |

### P1 — Should Have

| ID | 需求 | 说明 |
|----|------|------|
| P1-1 | 月曜路径实现 | 月绽放/月感电/月结晶完整公式（可暴击+无视防御+无增伤+擢升区） |
| P1-2 | 月曜擢升区 | 独立擢升乘区实现，支持擢升加成%输入 |
| P1-3 | 反应月曜加权 | 触发角色队伍加权的反应月曜计算（反应月感电1.8/反应月结晶0.96） |
| P1-4 | 路径自动路由 | 根据角色+元素组合自动选择计算路径 |

### P2 — Nice to Have

| ID | 需求 | 说明 |
|----|------|------|
| P2-1 | 路径对比视图 | 同一配置下多条路径伤害并排对比 |
| P2-2 | 乘区贡献分解 | 可视化各乘区对总伤害的贡献百分比 |
| P2-3 | 历史版本倍率切换 | 允许切换5.2之前旧倍率进行对比 |

---

## 各路径公式定义

### 路径1：无反应直伤

**公式**

```
Damage = Base × Scaling × Bonus × Crit × Resistance × Defense
```

**参数表**

| 参数 | 含义 | 来源 |
|------|------|------|
| Base | 基础伤害 | ATK×ATK% + HP×HP% + DEF×DEF% + EM×EM% |
| Scaling | 技能倍率 | 角色技能数据 |
| Bonus | 增伤区 | 1 + 各增伤之和 |
| Crit | 暴击区 | 1 + CritRate×CritDMG |
| Resistance | 抗性区 | 见抗性公式 |
| Defense | 防御区 | 见扩展防御公式 |

**伪代码**

```typescript
function calcDirectDamage(ctx: DamageContext): number {
  const base = calcMultiStatBase(ctx);     // ATK×ATK% + HP×HP% + DEF×DEF% + EM×EM%
  const scaling = ctx.skillMultiplier;
  const bonus = 1 + sum(ctx.bonusStats);   // 增伤区
  const crit = calcCrit(ctx.critRate, ctx.critDmg);
  const resist = calcResistance(ctx.enemyRes, ctx.resReduction);
  const defense = calcDefense(ctx.charLv, ctx.enemyLv, ctx.defReduction, ctx.defIgnore);
  return base * scaling * bonus * crit * resist * defense;
}
```

---

### 路径2：增幅反应（蒸发/融化）

**公式**

```
Damage = Base × Scaling × Bonus × Crit × Resistance × Defense × [ReactionMultiplier × (1 + EM_Bonus)]
```

**参数表**

| 参数 | 含义 | 值 |
|------|------|-----|
| ReactionMultiplier | 反应倍率 | 见下表 |
| EM_Bonus | EM加成 | 2.78 × EM / (EM + 1400) |

**反应倍率表**

| 反应 | 倍率 |
|------|------|
| 水打火（蒸发） | 2.0 |
| 火打水（蒸发） | 1.5 |
| 火打冰（融化） | 2.0 |
| 冰打火（融化） | 1.5 |

**伪代码**

```typescript
function calcAmplifyingDamage(ctx: DamageContext): number {
  const base = calcMultiStatBase(ctx);
  const scaling = ctx.skillMultiplier;
  const bonus = 1 + sum(ctx.bonusStats);
  const crit = calcCrit(ctx.critRate, ctx.critDmg);
  const resist = calcResistance(ctx.enemyRes, ctx.resReduction);
  const defense = calcDefense(ctx.charLv, ctx.enemyLv, ctx.defReduction, ctx.defIgnore);

  // 增幅反应区
  const reactionMult = AMPLIFY_RATES[ctx.reactionType]; // 1.5 或 2.0
  const emBonus = 2.78 * ctx.elementMastery / (ctx.elementMastery + 1400);
  const reactionFactor = reactionMult * (1 + emBonus);

  return base * scaling * bonus * crit * resist * defense * reactionFactor;
}
```

---

### 路径3：剧变反应

**公式**

```
Damage = LevelBaseDamage × (1 + EM_Bonus) × Resistance
```

**关键约束**：跳过暴击区、增伤区、防御区、技能倍率

**参数表**

| 参数 | 含义 | 值 |
|------|------|-----|
| EM_Bonus | EM加成 | 16 × EM / (EM + 2000) |
| LevelBaseDamage | 等级基础伤害 | 反应倍率 × 等级乘数 |
| 等级乘数(lv90) | — | 1446.85 |
| 等级乘数(lv100) | — | 1674.81 |

**5.2版本反应倍率表**

| 反应 | 5.2倍率 | 旧倍率 | 变更 |
|------|---------|--------|------|
| 超载 | **2.75** | 2.0 | ⚠️ 变更 |
| 感电 | **2.0** | 1.2 | ⚠️ 变更 |
| 超导 | **1.5** | 0.5 | ⚠️ 变更 |
| 扩散 | 0.6 | 0.6 | 不变 |
| 碎冰 | **3.0** | 1.5 | ⚠️ 变更 |
| 绽放 | 2.0 | 2.0 | 不变 |
| 超绽放 | 3.0 | 3.0 | 不变 |
| 烈绽放 | 3.0 | 3.0 | 不变 |

**伪代码**

```typescript
// 5.2版本倍率常量
const TRANSFORM_RATES_V52: Record<string, number> = {
  overload:     2.75,
  electroCharged: 2.0,
  superConduct: 1.5,
  swirl:        0.6,
  shatter:      3.0,
  bloom:        2.0,
  hyperBloom:   3.0,
  burgeon:      3.0,
};

function calcTransformativeDamage(ctx: DamageContext): number {
  const levelMultiplier = getLevelMultiplier(ctx.charLv); // lv90=1446.85, lv100=1674.81
  const reactionRate = TRANSFORM_RATES_V52[ctx.reactionType];
  const levelBaseDamage = reactionRate * levelMultiplier;

  const emBonus = 16 * ctx.elementMastery / (ctx.elementMastery + 2000);
  const resist = calcResistance(ctx.enemyRes, ctx.resReduction);

  return levelBaseDamage * (1 + emBonus) * resist;
}
```

---

### 路径4：激化反应（超激化/蔓激化）

**公式**

```
Damage = (Base + AggravationBonus) × Scaling × Bonus × Crit × Resistance × Defense
```

其中：

```
AggravationBonus = AggravationBaseRate × LevelMultiplier × (1 + EM_Bonus)
```

**关键架构**：激化加成叠加到基础伤害中，然后走全部乘区（增伤/暴击/抗性/防御）

**参数表**

| 参数 | 含义 | 值 |
|------|------|-----|
| AggravationBaseRate | 激化基础倍率 | 超激化=1.15，蔓激化=1.25 |
| EM_Bonus | EM加成 | 5 × EM / (EM + 1200) |
| LevelMultiplier | 等级乘数 | lv90=1446.85, lv100=1674.81 |

**伪代码**

```typescript
const AGGRAVATION_BASE_RATES: Record<string, number> = {
  aggravation: 1.15,  // 超激化
  spread:      1.25,  // 蔓激化
};

function calcAggravationDamage(ctx: DamageContext): number {
  const base = calcMultiStatBase(ctx);
  const scaling = ctx.skillMultiplier;

  // 激化加成 — 叠加到基础伤害
  const aggRate = AGGRAVATION_BASE_RATES[ctx.reactionType];
  const levelMultiplier = getLevelMultiplier(ctx.charLv);
  const emBonus = 5 * ctx.elementMastery / (ctx.elementMastery + 1200);
  const aggravationBonus = aggRate * levelMultiplier * (1 + emBonus);

  const effectiveBase = base + aggravationBonus; // 关键：加到基础伤害里

  const bonus = 1 + sum(ctx.bonusStats);
  const crit = calcCrit(ctx.critRate, ctx.critDmg);
  const resist = calcResistance(ctx.enemyRes, ctx.resReduction);
  const defense = calcDefense(ctx.charLv, ctx.enemyLv, ctx.defReduction, ctx.defIgnore);

  return effectiveBase * scaling * bonus * crit * resist * defense;
}
```

---

### 路径5：月曜反应（6.x新体系）

**公式**

```
Damage = MoonBaseDamage × Crit × Resistance × Elevation
```

其中：

```
MoonBaseDamage = MoonRate × LevelMultiplier × (1 + EM_Bonus)
```

**关键约束**：可暴击 + 无视防御 + 不吃增伤 + 独立擢升区

**参数表**

| 参数 | 含义 | 值 |
|------|------|-----|
| MoonRate | 月曜基础倍率 | 见下表 |
| EM_Bonus | EM加成 | 6 × EM / (EM + 2000) |
| Crit | 暴击区 | ✅ 正常计算 |
| Resistance | 抗性区 | ✅ 正常计算 |
| Defense | 防御区 | ❌ 不计算（跳过） |
| Bonus | 增伤区 | ❌ 不计算（跳过） |
| Elevation | 擢升区 | 1 + 擢升加成%（独立乘区） |

**月曜倍率表**

| 反应 | 基础倍率 |
|------|----------|
| 月绽放 | 1.0 |
| 月感电 | 3.0 |
| 月结晶 | 1.6 |

**反应月曜倍率表（触发角色队伍加权）**

| 反应 | 倍率 |
|------|------|
| 反应月感电 | 1.8 |
| 反应月结晶 | 0.96 |

**伪代码**

```typescript
const MOON_RATES: Record<string, number> = {
  moonBloom:    1.0,
  moonElectro:  3.0,
  moonCrystal:  1.6,
  reactionMoonElectro: 1.8,
  reactionMoonCrystal: 0.96,
};

function calcMoonDamage(ctx: DamageContext): number {
  const levelMultiplier = getLevelMultiplier(ctx.charLv);
  const moonRate = MOON_RATES[ctx.reactionType];

  const emBonus = 6 * ctx.elementMastery / (ctx.elementMastery + 2000);
  const moonBaseDamage = moonRate * levelMultiplier * (1 + emBonus);

  const crit = calcCrit(ctx.critRate, ctx.critDmg);           // ✅ 可暴击
  const resist = calcResistance(ctx.enemyRes, ctx.resReduction); // ✅ 抗性区
  const elevation = 1 + ctx.elevationBonus;                     // 独立擢升区

  // ❌ 无防御区、无增伤区
  return moonBaseDamage * crit * resist * elevation;
}
```

---

## 公共子系统

### 扩展防御区公式

**当前公式**

```
DefMult = (CharLv + 100) / [(CharLv + 100) + (EnemyLv + 100)]
```

**扩展公式**

```
EffectiveEnemyDef = (EnemyLv + 100) × (1 - DefReduction_Sum) × (1 - DefIgnore)
DefMult = (CharLv + 100) / [(CharLv + 100) + EffectiveEnemyDef]
```

**规则**

- 多个 DefReduction 来源**相加**（如超导40% + 雷泽C4 15% = 55%）
- DefReduction 上限为100%，不可为负
- DefIgnore 与 DefReduction **相乘**（独立计算）
- 默认 DefReduction = 0，DefIgnore = 0

**伪代码**

```typescript
function calcDefense(
  charLv: number,
  enemyLv: number,
  defReductions: number[],  // 多个来源，相加
  defIgnore: number = 0
): number {
  const charTerm = charLv + 100;
  const enemyTerm = enemyLv + 100;
  const defReductionSum = Math.min(1, Math.max(0, sum(defReductions)));
  const effectiveEnemyDef = enemyTerm * (1 - defReductionSum) * (1 - defIgnore);
  return charTerm / (charTerm + effectiveEnemyDef);
}
```

### 多属性缩放

**当前**

```typescript
Base = SkillMultiplier × (ATK | HP | DEF)  // 单一属性
```

**扩展**

```typescript
Base = ATK × ATK% + HP × HP% + DEF × DEF% + EM × EM%
```

**伪代码**

```typescript
interface MultiStatScaling {
  atkRatio?: number;  // 攻击力倍率%，如纳西妲技能的ATK%
  hpRatio?: number;   // 生命值倍率%
  defRatio?: number;  // 防御力倍率%
  emRatio?: number;   // 精通倍率%，如纳西妲技能的EM%
}

function calcMultiStatBase(stats: CharacterStats, scaling: MultiStatScaling): number {
  return (stats.atk * (scaling.atkRatio ?? 0))
       + (stats.hp  * (scaling.hpRatio  ?? 0))
       + (stats.def * (scaling.defRatio ?? 0))
       + (stats.em  * (scaling.emRatio  ?? 0));
}
```

### 抗性区（不变，供参考）

```
if Res < 0:    ResistMult = 1 - Res/2
if 0 ≤ Res < 0.75: ResistMult = 1 - Res
if Res ≥ 0.75:  ResistMult = 1 / (4×Res + 1)
```

---

## 默认参数变更

| 参数 | 旧值 | 新值 |
|------|------|------|
| DEFAULT_ENEMY_LEVEL | 90 | **100** |
| DEFAULT_ENEMY_RES | 0.1 | 0.1（不变） |
| DEFAULT_CHAR_LEVEL | 90 | 90（不变） |

---

## 路径路由逻辑

```
输入：角色元素 + 反应类型 + 技能
↓
无反应类型？→ 直伤路径
增幅反应（蒸发/融化）？→ 增幅路径
剧变反应（超载/感电/超导/扩散/碎冰/绽放/超绽放/烈绽放）？→ 剧变路径
激化反应（超激化/蔓激化）？→ 激化路径
月曜反应（月绽放/月感电/月结晶）？→ 月曜路径
```

---

## 待确认问题

| # | 问题 | 影响 | 建议默认处理 |
|---|------|------|-------------|
| Q1 | 月曜反应的擢升区加成来源有哪些？当前6.x版本已知擢升来源清单是否完整？ | 月曜路径数值精度 | 先按单一擢升加成%字段实现，预留多来源累加扩展 |
| Q2 | 反应月曜（反应月感电1.8/反应月结晶0.96）的"触发角色队伍加权"具体机制？触发角色属性如何影响最终倍率？ | 反应月曜计算准确性 | 先按固定倍率实现，待版本更新后补充加权逻辑 |
| Q3 | 多属性缩放中，各属性的"倍率%"是独立于技能倍率(Scaling)的参数，还是替换了原技能倍率？ | Base计算架构 | 建议ATK%/HP%/DEF%/EM%替代原Scaling，作为新的基础伤害输入 |
| Q4 | DefIgnore 当前是否有已知来源？如无，是否只需预留字段？ | 防御区实现范围 | 预留字段 + 接口，默认值为0 |
| Q5 | 剧变5.2倍率更新后，是否需要保留旧倍率的兼容模式？ | 向后兼容 | P2需求，首版可不支持 |
| Q6 | 月曜反应中暴击的期望计算方式是否与直伤一致（CritRate×CritDMG）？ | 月曜暴击区 | 按一致处理，如有差异后续更新 |
