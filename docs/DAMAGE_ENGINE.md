# 原神伤害引擎 — 全链路公式详解

> **项目**：原神圣遗物词条优化器 V2  
> **更新日期**：2026-06-03（v4.3.0）  
> **对应源码**：`src/engine/` + `src/data/constants.ts`

---

## 目录

- [一、公式总览：五条伤害路径](#一公式总览五条伤害路径)
- [二、属性计算器 StatCalculator](#二属性计算器-statcalculator)
- [三、Direct 直伤路径](#三direct-直伤路径)
  - [3.1 基础伤害区 Base](#31-基础伤害区-base)
  - [3.2 增伤区 Bonus](#32-增伤区-bonus)
  - [3.3 暴击区 Crit](#33-暴击区-crit)
  - [3.4 抗性区 Resistance](#34-抗性区-resistance)
  - [3.5 防御区 Defense](#35-防御区-defense)
  - [3.6 独立乘区 Independent](#36-独立乘区-independent)
- [四、Amplifying 增幅路径](#四amplifying-增幅路径蒸发融化)
- [五、Transformative 剧变路径](#五transformative-剧变路径)
- [六、Catalyze 激化路径](#六catalyze-激化路径超激化蔓激化)
- [七、Moonsign 月曜路径](#七moonsign-月曜路径)
- [八、完整常量表](#八完整常量表)
- [九、变量分类总表](#九变量分类总表)
- [十、当前引擎已知问题](#十当前引擎已知问题)

---

## 一、公式总览：五条伤害路径

原神的伤害计算由**反应类型**决定走哪条路径。引擎通过 `reactionType` 进行路由：

```
reactionType
├── NONE                              → Path 1: DIRECT（直伤）
├── VAPORIZE / MELT                   → Path 2: AMPLIFYING（增幅）
├── OVERLOADED / SUPERCONDUCT / ...   → Path 3: TRANSFORMATIVE（剧变）
├── AGGRAVATION / SPREAD              → Path 4: CATALYZE（激化）
└── MOON_BLOOM / MOON_ELECTRO / ...   → Path 5: MOONSIGN（月曜）
```

五条路径的核心公式如下：

### Path 1 — DIRECT（直伤，无反应）

$$\text{Damage} = \text{Base} \times \text{Bonus} \times \text{Crit} \times \text{Resist} \times \text{Defense} \times \text{Independent}$$

**适用**：所有不触发反应的攻击。

### Path 2 — AMPLIFYING（增幅：蒸发/融化）

$$\text{Damage} = \text{Base} \times \text{Bonus} \times \text{Crit} \times \text{Resist} \times \text{Defense} \times \text{Amp} \times \text{Independent}$$

**特点**：在直伤路径末尾乘上一个反应倍率（1.5× 或 2.0×），受元素精通加成。

### Path 3 — TRANSFORMATIVE（剧变：超载/超导/感电/扩散/绽放等）

$$\text{Damage} = \text{TransformBase} \times \text{Resist} \times \text{Independent}$$

**特点**：完全独立于攻击力/倍率/增伤/双暴/防御，只取决于等级、精通、反应类型和敌人抗性。

### Path 4 — CATALYZE（激化：超激化/蔓激化）

$$\text{Base}_{\text{effective}} = \text{Base} + \text{AggravationBonus}$$

$$\text{Damage} = \text{Base}_{\text{effective}} \times \text{Bonus} \times \text{Crit} \times \text{Resist} \times \text{Defense} \times \text{Independent}$$

**特点**：激化加成是**加法叠加**在基础伤害上的，因此可以享受双暴和增伤。

### Path 5 — MOONSIGN（月曜：月绽放/月感电/月结晶）

$$\text{Damage} = \text{MoonBase} \times \text{Crit} \times \text{Resist} \times \text{Elevation} \times \text{Independent}$$

**特点**：类似剧变（不吃攻/倍率/增伤/防御），但**可以暴击**，且额外多出一个 Elevation（擢升）乘区。

---

## 二、属性计算器 StatCalculator

在进入伤害公式之前，所有装备/武器/命座/ buff 被汇总为最终面板属性 `ComputedStats`。

### 2.1 三生命属性（HP / ATK / DEF）

$$\text{Total} = \text{Base} \times (1 + \Sigma\text{\%Bonus}) + \Sigma\text{FlatBonus}$$

**ATK 特殊**：攻击力的 Base 是角色 + 武器的合并：

$$\text{BaseATK} = \text{Character}_{\text{baseAtk}} + \text{Weapon}_{\text{baseAtk}}$$

$$\text{TotalATK} = \text{BaseATK} \times (1 + \Sigma\text{atk\%}) + \Sigma\text{atkFlat}$$

### 2.2 加法属性（CR / CD / EM / ER / DMG Bonus）

$$\text{totalCritRate} = \min(\text{baseCritRate} + \Sigma\text{critRateBonuses},\; 1.0)$$

$$\text{totalCritDmg} = \text{baseCritDmg} + \Sigma\text{critDmgBonuses}$$

$$\text{totalEM} = \text{baseEM} + \Sigma\text{emBonuses}$$

$$\text{totalER} = \text{baseER} + \Sigma\text{erBonuses}$$

$$\text{totalDmgBonus} = \Sigma\text{allDmgBonusSources}$$

### 2.3 叠加来源的 10 步计算顺序

| 步骤 | 来源 | 累加到 |
|------|------|--------|
| 1 | `character.baseStats` | 基础值 |
| 2 | `character.ascensionStat` | `hpPercent` / `atkPercent` / `defPercent` / `dmgBonus` / `critRate` / `critDmg` / `em` / `er` |
| 3 | `weapon.baseAtk` + `weapon.substatValue` | `weaponBaseAtk` + 对应的百分比/加法加成 |
| 4 | 圣遗物主词条 (×5) | 杯子元素伤害 → `dmgBonus`，其余 → 对应的百分比/固定值 |
| 5 | 圣遗物副词条 (×5, 每条4\|6条) | 对应属性累加 |
| 6 | `teamBuffs[]` | 对应属性累加 |
| 7 | `weaponConfig.passiveBonus` | 通过 `applyZoneBonus()` 叠加 |
| 8 | `constellationConfig.bonus` | 通过 `applyZoneBonus()` 叠加 |
| 9 | `teamBuffBonuses` | 通过 `applyZoneBonus()` 叠加 |
| 10 | `setBonus` | 通过 `applyZoneBonus()` 叠加（2026-05-21 修复新增） |

### 2.4 applyZoneBonus 的叠加语义

`applyZoneBonus(stats, bonus, baseHp, baseAtk, baseDef)` 将 `ZoneBonusInput` 叠加到已有属性上。

ATK%/HP%/DEF% 作用于**基础值**（不含其他加成），而非当前总值：

$$\text{newHp} = \text{hp} + \text{baseHp} \times \text{bonus.hpPercent} + \text{bonus.hpFlat}$$
$$\text{newAtk} = \text{atk} + \text{baseAtk} \times \text{bonus.atkPercent} + \text{bonus.atkFlat}$$
$$\text{newDef} = \text{def} + \text{baseDef} \times \text{bonus.defPercent} + \text{bonus.defFlat}$$
$$\text{newCritRate} = \min(\text{critRate} + \text{bonus.critRate},\; 1.0)$$
$$\text{newCritDmg} = \text{critDmg} + \text{bonus.critDmg}$$
$$\text{newDmgBonus} = \text{dmgBonus} + \text{bonus.dmgBonus}$$
$$\text{newEM} = \text{em} + \text{bonus.elementalMastery}$$
$$\text{newER} = \text{er} + \text{bonus.energyRecharge}$$

> ✅ **2026-05-21 修复**：此公式已从错误版本（`total × (1 + percent%)`）修正为正确版本（`total + base × percent%`）。原神中所有 ATK%/HP%/DEF% 来源均作用于基础值。

---

## 三、DIRECT 直伤路径

**源码**：`src/engine/formula.ts` → `calculateDirect()`

### 3.1 基础伤害区 Base

**源码**：`src/engine/zones/base.ts` — `BaseDamageZone`

$$\text{RawBase} = \text{totalAtk} \times \text{atkRatio} + \text{totalHp} \times \text{hpRatio} + \text{totalDef} \times \text{defRatio} + \text{totalEM} \times \text{emRatio}$$

$$\text{Base} = \text{skillMultiplier} \times \text{RawBase} + \text{baseDamageFlat}$$

| 符号 | 含义 | 来源 |
|------|------|------|
| `totalAtk` | 角色最终攻击力 | `ComputedStats.totalAtk` |
| `totalHp` | 角色最终生命值 | `ComputedStats.totalHp` |
| `totalDef` | 角色最终防御力 | `ComputedStats.totalDef` |
| `totalEM` | 角色最终元素精通 | `ComputedStats.em` |
| `atkRatio` | ATK 缩放系数 | `character.defaultStatScaling.atkRatio`（如胡桃=0，雷神=1） |
| `hpRatio` | HP 缩放系数 | `character.defaultStatScaling.hpRatio`（如胡桃 E=0.0626） |
| `defRatio` | DEF 缩放系数 | `character.defaultStatScaling.defRatio`（如阿贝多 E=1） |
| `emRatio` | EM 缩放系数 | `character.defaultStatScaling.emRatio`（通常为 0） |
| `skillMultiplier` | 技能倍率 | 玩家选择，如 200% = 2.0 |
| `baseDamageFlat` | 固定基础伤害加成 | `extraBonuses.baseDamageFlat`（武器/命座提供） |

**典型举例**：

- **雷神（纯 ATK 缩放）**：`atkRatio=1, hpRatio=0, defRatio=0, emRatio=0`
  $$\text{Base} = \text{skillMultiplier} \times \text{totalAtk}$$

- **胡桃（HP 缩放）**：E 开启后 `atkRatio=1, hpRatio=0.0626`
  $$\text{Base} = \text{skillMultiplier} \times (\text{totalAtk} + 0.0626 \times \text{totalHp})$$

- **阿贝多（DEF 缩放）**：`atkRatio=0, hpRatio=0, defRatio=1`
  $$\text{Base} = \text{skillMultiplier} \times \text{totalDef}$$

---

### 3.2 增伤区 Bonus

**源码**：`src/engine/zones/bonus.ts` — `BonusZone`

$$\text{Bonus} = 1 + \text{dmgBonus}$$

| 符号 | 含义 |
|------|------|
| `dmgBonus` | 所有伤害加成来源的**加法总和**（以小数表示，0.466 = 46.6%） |

**dmgBonus 的来源（全部加法叠加）：**

1. 圣遗物杯子主词条：对应元素伤害加成（46.6% 或物理 58.3%）
2. 圣遗物套装效果（2件套/4件套）
3. 武器被动（如雾切、和璞鸢的增伤）
4. 命座效果（如甘雨 C4 冰伤+25%）
5. 角色天赋（如魈大招增伤）
6. 队伍角色技能（万叶扩散、芙宁娜 Q 等）
7. 队伍圣遗物效果（如千岩4件、宗室4件）
8. 元素共鸣
9. 食物/药剂增益

> ⚠️ 独立增伤（如钟离天赋「悬岩宸断」每层 5%）属于独立乘区，**不进入此区**。

---

### 3.3 暴击区 Crit

**源码**：`src/engine/zones/crit.ts` — `CritZone`

$$\text{Crit} = 1 + \min(\text{critRate},\; 1.0) \times \text{critDmg}$$

| 符号 | 含义 |
|------|------|
| `critRate` | 最终暴击率（小数），上限 100% |
| `critDmg` | 最终暴击伤害（小数），如 180% = 1.8 |

这是**期望暴击乘数**（平均伤害视角），不是单刀伤害。适合用于圣遗物词条优化。

**边界情况**：`critRate` 被上限于 1.0（100%），`critDmg` 无硬上限。

---

### 3.4 抗性区 Resistance

**源码**：`src/engine/zones/resistance.ts` — `ResistanceZone`

$$\text{EffectiveR} = \text{enemyResistance} - \text{resistReduction}$$

$$\text{Resist}(R) = \begin{cases} 1 - \dfrac{R}{2}, & R < 0 \\[8pt] 1 - R, & 0 \le R < 0.75 \\[8pt] \dfrac{1}{1 + 4R}, & R \ge 0.75 \end{cases}$$

| 符号 | 含义 |
|------|------|
| `enemyResistance` | 敌人对应元素的基础抗性（小数，如 0.10 = 10%） |
| `resistReduction` | 所有减抗手段的总和（叠加自武器/命座/队伍） |
| `EffectiveR` | 最终有效抗性 |

**抗性曲线特点**：
- 负抗性段（$R < 0$）：减抗收益递减（半效果）
- 正常段（$0 \le R < 0.75$）：减抗收益线性
- 高抗段（$R \ge 0.75$）：减抗收益极高（$4R$ 分母）

**典型敌人抗性参考**：

| 敌人类型 | 对应元素抗性 |
|----------|-------------|
| 标准敌人（丘丘人、深渊法师等） | 10% (0.10) |
| 对应元素史莱姆 | 75% (0.75) |
| 遗迹守卫（物理） | 70% (0.70) |
| 人形敌人 | 10% (0.10) |

---

### 3.5 防御区 Defense

**源码**：`src/engine/zones/defense.ts` — `DefenseZone`

$$\text{CharTerm} = \text{characterLevel} + 100$$

$$\text{EnemyTerm} = \text{enemyLevel} + 100$$

$$\text{DefReductionSum} = \min\left(\text{DEF\_REDUCTION\_CAP},\; \sum \text{defReductions}\right)$$

$$\text{DefIncreaseSum} = \min\left(1.0,\; \sum \text{defIncreases}\right)$$

$$\text{EffectiveEnemyDef} = \text{EnemyTerm} \times (1 - \text{DefReductionSum} + \text{DefIncreaseSum}) \times (1 - \text{defIgnore})$$

$$\text{Defense} = \frac{\text{CharTerm}}{\text{CharTerm} + \text{EffectiveEnemyDef}}$$

| 符号 | 含义 |
|------|------|
| `characterLevel` | 角色等级（默认 90） |
| `enemyLevel` | 敌人等级（默认 100，对应 5.2 深渊） |
| `defReductions` | 防御降低比例数组（如超导 = 0.4），总和硬上限 90%（KQM） |
| `defIgnore` | 无视防御比例（如雷电将军 C2 = 0.6） |
| `defIncreases` | 怪物防御增加比例数组（如副本属性强化石），默认 [] |
| `DEF_LEVEL_CONSTANT` | 游戏固定常量 **100** |
| `DEF_REDUCTION_CAP` | 减防硬上限 **0.9**（KQM 实测；BWIKI 估测 1.0，采纳 KQM） |

**典型场景**：

1. **Lv90 vs Lv90 无减防**：
   $$\text{Defense} = \frac{90 + 100}{(90 + 100) + (90 + 100)} = \frac{190}{380} = 0.5$$

2. **Lv90 vs Lv100 无减防**：
   $$\text{Defense} = \frac{190}{190 + 200} = \frac{190}{390} \approx 0.487$$

3. **Lv90 vs Lv100 超导减防 40% + 雷神 C2 无视 60%**：
   $$\text{DefReductionSum} = 0.4,\quad \text{defIgnore} = 0.6$$
   $$\text{EffectiveEnemyDef} = 200 \times (1 - 0.4) \times (1 - 0.6) = 200 \times 0.6 \times 0.4 = 48$$
   $$\text{Defense} = \frac{190}{190 + 48} = \frac{190}{238} \approx 0.798$$

---

### 3.6 独立乘区 Independent

**源码**：`src/engine/zones/independent.ts` — `IndependentZone`

$$\text{Independent} = 1 + \text{talentBonus} + \text{ctxBonus}$$

| 符号 | 含义 |
|------|------|
| `talentBonus` | 来自 `extraBonuses.independentBonus`（武器/命座/天赋的独立加成） |
| `ctxBonus` | 来自 `DamageContext.independentBonus` |

**什么是独立乘区？**

某些角色的天赋/命座/武器提供的增伤**不进入增伤区（BonusZone）**，而是在所有乘区之外**独立乘算**。典型正确例子：

- 阿贝多 A4：对 HP < 50% 的敌人 +25% 独立乘区
- 部分武器被动：如和璞鸢攻击叠层提供的独立增伤

> ⚠️ 注意：以下效果**不属于**独立乘区，而属于 AdditiveBaseDMGBonus（加法基础伤害，进入 BaseDamageZone）：
> - 钟离 Q 额外 +33% HP 伤害
> - 申鹤 E（冰翎）
> - 云堇 Q（飞云旗阵）
> - 赤角石溃杵/辰砂之纺锤的 DEF 转伤害
> 这些效果直接加到基础伤害区，可以享受后续的增伤/双暴/减抗/减防等乘区。

**判断标准**：描述「造成的伤害提高 X%」（独立）vs「额外造成 X% 某属性的伤害」（AdditiveBaseDMGBonus）。

---

## 四、AMPLIFYING 增幅路径（蒸发/融化）

**源码**：`src/engine/zones/amplifying.ts` — `AmplifyingZone`

$$\text{Amp} = \text{baseMultiplier} \times \left(1 + \text{EMBonus} + \text{ampReactionBonus}\right)$$

$$\text{EMBonus} = \frac{2.78 \times \text{EM}}{\text{EM} + 1400}$$

完整增幅路径伤害：

$$\text{Damage} = \text{Base} \times \text{Bonus} \times \text{Crit} \times \text{Resist} \times \text{Defense} \times \text{Amp} \times \text{Independent}$$

| 符号 | 含义 |
|------|------|
| `baseMultiplier` | 反应基础系数：1.5（弱增幅）或 2.0（强增幅） |
| `EM` | 元素精通 |
| `ampReactionBonus` | 额外增幅反应伤害加成（如魔女4件套的 15%） |
| `2.78` | 增幅反应精通公式分子（固定常量） |
| `1400` | 增幅反应精通公式分母（固定常量） |

**蒸发/融化的基础系数（baseMultiplier）：**

| 反应 | 触发方式 | baseMultiplier |
|------|---------|---------------|
| 蒸发 | 火触发水 | 1.5× |
| 蒸发 | 水触发火 | 2.0× |
| 融化 | 冰触发火 | 1.5× |
| 融化 | 火触发冰 | 2.0× |

**精通收益示例**：

- EM = 0：$\text{EMBonus} = 0$，Amp = baseMultiplier
- EM = 100：$\text{EMBonus} = \frac{2.78 \times 100}{100 + 1400} = \frac{278}{1500} \approx 0.185$
  Amp = baseMultiplier × 1.185
- EM = 200：$\text{EMBonus} = \frac{2.78 \times 200}{200 + 1400} = \frac{556}{1600} = 0.3475$
  Amp = baseMultiplier × 1.3475
- EM = 300：$\text{EMBonus} = \frac{2.78 \times 300}{300 + 1400} = \frac{834}{1700} \approx 0.491$
  Amp = baseMultiplier × 1.491

> ⚠️ 增幅反应不是 100% 覆盖率的。实际伤害还需要考虑反应覆盖率（哪些攻击段能触发反应）。当前引擎没有这一维度。

---

## 五、TRANSFORMATIVE 剧变路径

**源码**：`src/engine/zones/transformative.ts` — `TransformativeZone`

$$\text{TransformBase} = \text{Rate} \times \text{LevelMultiplier} \times (1 + \text{EMBonus} + \text{transformReactionBonus})$$

$$\text{EMBonus} = \frac{16 \times \text{EM}}{\text{EM} + 2000}$$

完整剧变伤害：

$$\text{Damage} = \text{TransformBase} \times \text{Resist} \times \text{Independent}$$

| 符号 | 含义 |
|------|------|
| `Rate` | 反应类型基础倍率（见下表） |
| `LevelMultiplier` | 角色等级系数（见 §8 常量表） |
| `EM` | 元素精通 |
| `transformReactionBonus` | 额外剧变反应加成（套装/命座） |
| `16` | 剧变精通公式分子（固定） |
| `2000` | 剧变精通公式分母（固定） |

**各类剧变反应 Rate（5.2 版本）：**

| 反应 | Rate | 说明 |
|------|------|------|
| 超载 (Overloaded) | 2.75 | 火+雷 |
| 超导 (Superconduct) | 1.5 | 冰+雷（伤害低，主要是物抗-40%） |
| 感电 (Electro-Charged) | 2.0 | 水+雷（单 tick 倍率；总倍率 = 2.0 × ECTriggers，通常 2~4 次 = 4.0~8.0） |
| 扩散 (Swirl) | 0.6 | 风+火/水/冰/雷 |
| 超绽放 (Hyperbloom) | 3.0 | 雷触发草原核 |
| 绽放 (Bloom) | 2.0 | 水+草生成草原核 |
| 烈绽放 (Burgeon) | 3.0 | 火触发草原核 |
| 燃烧 (Burning) | 0.25 | 火+草 |
| 碎冰 (Shatter) | 3.0 | 重击/岩攻冻结敌人 |

**关键特点**：剧变伤害 **不吃** 攻击力、技能倍率、增伤区、暴击区、防御区。**只吃**：等级 + 精通 + Rate + 抗性 + 独立乘区。

**Lv90 剧变伤害速算（EM=0，标准抗性 10%）：**

$$\begin{aligned}
\text{超载} &= 2.75 \times 1446.85 \times 0.9 \approx 3581 \\
\text{超绽放} &= 3.0 \times 1446.85 \times 0.9 \approx 3907 \\
\text{扩散} &= 0.6 \times 1446.85 \times 0.9 \approx 781
\end{aligned}$$

---

## 六、CATALYZE 激化路径（超激化/蔓激化）

**源码**：`src/engine/zones/catalyze.ts` — `CatalyzeZone`

$$\text{AggravationBonus} = \text{BaseRate} \times \text{LevelMultiplier} \times (1 + \text{EMBonus})$$

$$\text{EMBonus} = \frac{5 \times \text{EM}}{\text{EM} + 1200}$$

激化完整伤害：

$$\text{Base}_{\text{effective}} = \text{Base} + \text{AggravationBonus}$$

$$\text{Damage} = \text{Base}_{\text{effective}} \times \text{Bonus} \times \text{Crit} \times \text{Resist} \times \text{Defense} \times \text{Independent}$$

| 符号 | 含义 |
|------|------|
| `BaseRate` | 超激化 = 1.15，蔓激化 = 1.25 |
| `LevelMultiplier` | 角色等级系数 |
| `EM` | 元素精通 |
| `Base` | 原有的 BaseDamageZone 计算的基础伤害 |
| `5` | 激化精通公式分子（固定） |
| `1200` | 激化精通公式分母（固定） |

**关键特点**：

激化加成的 `AggravationBonus` 是**加法叠加**在 `Base` 上的——它不是乘数，而是与 `skillMultiplier × RawBase` 同级相加。这意味着：

- 攻击力低、倍率低的技能（如菲谢尔 E 每跳 100%），激化加成的相对占比极高 → 精通收益大
- 攻击力高、倍率高的技能（如 300% 倍率），激化加成的相对占比较低 → 攻击力收益更大

**并且：激化加成可以暴击、可以享受增伤区和防御区**。这是它和剧变反应的本质区别。

> ✅ **v4.2.1 修复**：激化附伤在大权区（AuthorityZone）之后加算，而非之前。即 `Base × Authority + CatalyzeBonus`，而非 `(Base + CatalyzeBonus) × Authority`。符合 Meropide 公式标准。

**Lv90 激化加成速算（EM=0）：**

$$\begin{aligned}
\text{超激化} &= 1.15 \times 1446.85 \times 1.0 \approx 1664 \\
\text{蔓激化} &= 1.25 \times 1446.85 \times 1.0 \approx 1809
\end{aligned}$$

---

## 七、MOONSIGN 月曜路径

> 📌 **适用范围说明**：以下公式适用于**角色直接触发的月曜伤害**（月感电 3.0、月绽放 1.0、月结晶 1.6）。反应触发的月曜伤害（反应月感电 1.8、反应月结晶 0.96）涉及多角色属性加权求和与各伤害组分独立暴击判定，当前版本暂不实现。

**源码**：`src/engine/zones/moonsign.ts` — `MoonsignZone`  
**源码**：`src/engine/zones/elevation.ts` — `ElevationZone`

$$\text{MoonBase} = \text{MoonRate} \times \text{LevelMultiplier} \times (1 + \text{EMBonus} + \text{moonReactionBonus})$$

$$\text{EMBonus} = \frac{6 \times \text{EM}}{\text{EM} + 2000}$$

完整月曜伤害：

$$\text{Damage} = \text{MoonBase} \times \text{Crit} \times \text{Resist} \times \text{Elevation} \times \text{Independent}$$

$$\text{Elevation} = 1 + \text{elevationBonus}$$

| 符号 | 含义 |
|------|------|
| `MoonRate` | 月曜反应基础倍率（见下表） |
| `LevelMultiplier` | 角色等级系数 |
| `EM` | 元素精通 |
| `moonReactionBonus` | 月曜反应伤害加成 |
| `elevationBonus` | 擢升加成（月曜体系特有机制） |
| `6` | 月曜精通公式分子（固定） |
| `2000` | 月曜精通公式分母（固定） |

**月曜反应倍率：**

| 反应 | MoonRate |
|------|----------|
| 月绽放 (MOON_BLOOM) | 1.0 |
| 月感电 (MOON_ELECTRO) | 3.0 |
| 月结晶 (MOON_CRYSTAL) | 1.6 |
| 反应月感电 (REACTION_MOON_ELECTRO) | 1.8 |
| 反应月结晶 (REACTION_MOON_CRYSTAL) | 0.96 |

**月曜路径特点**：

- 类似剧变：不吃攻击力、倍率、增伤区、防御区
- 但**可以暴击**（与剧变不同）
- 多了一个 **Elevation（擢升）乘区**，独属于月曜体系
- 使用独立的精通公式（分子 6，分母 2000）

---

## 八、完整常量表

### 8.1 防御与等级常量

| 常量 | 值 | 用途 |
|------|----|------|
| `DEF_LEVEL_CONSTANT` | 100 | 防御力公式分母偏移量 |
| `DEF_REDUCTION_CAP` | 0.9 | 减防硬上限（KQM 实测；BWIKI 估测 1.0，采纳 KQM） |

### 8.2 元素精通公式常量

| 反应类型 | 分子 | 分母 | 公式 |
|----------|------|------|------|
| 增幅（蒸发/融化） | 2.78 | 1400 | $\dfrac{2.78 \times \text{EM}}{\text{EM} + 1400}$ |
| 剧变（超载等 9 种） | 16 | 2000 | $\dfrac{16 \times \text{EM}}{\text{EM} + 2000}$ |
| 激化（超激化/蔓激化） | 5 | 1200 | $\dfrac{5 \times \text{EM}}{\text{EM} + 1200}$ |
| 月曜（5 种） | 6 | 2000 | $\dfrac{6 \times \text{EM}}{\text{EM} + 2000}$ |

### 8.3 等级系数表 LevelMultiplier

| 等级 | 系数 |
|------|------|
| 1 | 17.17 |
| 10 | 28.21 |
| 20 | 53.75 |
| 30 | 95.02 |
| 40 | 152.61 |
| 50 | 234.97 |
| 60 | 351.71 |
| 70 | 765.64 |
| 80 | 1077.44 |
| 85 | 1027.50 |
| 90 | 1446.85 |
| 95 | 1561.46 |
| 100 | 1674.81 |

> 中间等级使用最近可用等级的系数近似。

### 8.4 激化反应基础倍率

| 反应 | BaseRate |
|------|----------|
| 超激化 (AGGRAVATION) | 1.15 |
| 蔓激化 (SPREAD) | 1.25 |

### 8.5 副词条中值（P0 简化模型）

| 词条类型 | 中值 |
|----------|------|
| 暴击率 (CRIT_RATE) | 3.3% (0.033) |
| 暴击伤害 (CRIT_DMG) | 6.6% (0.066) |
| 攻击力% (ATK_PERCENT) | 5.0% (0.05) |
| 生命值% (HP_PERCENT) | 5.0% (0.05) |
| 防御力% (DEF_PERCENT) | 6.2% (0.062) |
| 元素精通 (EM) | 19.8 |
| 充能效率 (ER) | 5.5% (0.055) |
| 攻击力 (ATK_FLAT) | 18.0 |
| 生命值 (HP_FLAT) | 268.5 |
| 防御力 (DEF_FLAT) | 21.4 |

### 8.6 主词条最大值（5星 Lv20）

| 词条类型 | 最大值 |
|----------|--------|
| 生命值 (花) | 4780 |
| 攻击力 (羽) | 311 |
| HP% / ATK% | 46.6% (0.466) |
| DEF% | 58.3% (0.583) |
| 元素伤害加成 | 46.6% (0.466) |
| 物理伤害加成 | 58.3% (0.583) |
| 元素精通 | 186.5 |
| 充能效率 | 51.8% (0.518) |
| 暴击率 | 31.1% (0.311) |
| 暴击伤害 | 62.2% (0.622) |
| 治疗加成 | 35.9% (0.359) |

---

## 九、变量分类总表

### 🔴 固定数值（游戏常量，永不变化）

| 变量 | 值 |
|------|----|
| 防御常量 | 100 |
| 增幅精通分子 / 分母 | 2.78 / 1400 |
| 剧变精通分子 / 分母 | 16 / 2000 |
| 激化精通分子 / 分母 | 5 / 1200 |
| 月曜精通分子 / 分母 | 6 / 2000 |
| 超激化基础倍率 | 1.15 |
| 蔓激化基础倍率 | 1.25 |
| 各剧变反应 Rate | 0.25∼3.0 |
| 各月曜反应 MoonRate | 0.96∼3.0 |
| LevelMultipliers | 17.17∼1446.85 |
| 副词条中值 | 0.033∼268.5 |
| 主词条最大值 | 311∼4780 |
| 单属性最大词条数 | 6 |
| 总词条数上限 | 45 |

### 🔵 角色固定属性（每个角色不同，但不随装备变化）

| 变量 | 含义 |
|------|------|
| `character.baseStats` | 基础 HP / ATK / DEF / CR / CD / EM / ER |
| `character.ascensionStat` | 突破属性（类型 + 各阶段值） |
| `character.defaultStatScaling` | 多属性缩放比例（atkRatio / hpRatio / defRatio / emRatio） |
| `character.element` | 元素类型 |
| `character.relevantSubstats` | 有效词条列表 |
| `weapon.baseAtk` | 武器基础攻击力 |
| `weapon.substatType/Value` | 武器副词条类型和值 |

### 🟡 场景固定参数（取决于玩家选择的场景/敌人，不随装备变化）

| 变量 | 含义 |
|------|------|
| `skillMultiplier` | 技能倍率（取决于技能等级和攻击段） |
| `enemyLevel` | 敌人等级 |
| `enemyResistance` | 敌人抗性（可能因元素而异） |
| `baseMultiplier`（1.5/2.0） | 增幅反应基础系数（取决于元素附着顺序） |
| `LevelMultiplier` | 角色等级决定的等级系数 |

### 🟢 可变参数（玩家装备/词条/队伍/命座直接影响）

| 变量 | 说明 | 是否参与词条优化 |
|------|------|:--:|
| 圣遗物副词条（10种×6段） | 核心优化变量 | ⭐ |
| 圣遗物主词条（沙/杯/头） | 可选组合（ATK%/EM/DMG/CR/CD） | 待扩展 |
| 圣遗物套装选择 | 2+2 或 4 件套 | 间接 |
| 武器选择 | 固定 baseAtk + 副词条 | 间接 |
| 武器被动加成 | 手动填入的乘区加成 | - |
| 命座等级 + 加成 | 手动填入 | - |
| 天赋加成 | 手动填入 | - |
| 队伍增益 | teamBuffs + teamBuffBonuses | - |
| 最终攻击力/生命/防御 | 由以上各项计算得出 | 输出 |
| 最终暴击率/暴击伤害 | 由以上各项计算得出 | ⭐ 核心目标 |
| 最终元素精通 | 由以上各项计算得出 | ⭐ 重要变量 |
| 最终增伤 | 由以上各项计算得出 | 输出 |

---

## 十、当前引擎已知问题

> **最后更新**：2026-06-02（v4.2.2）

### ✅ 已修复（v4.2.1）

| # | 问题 | 修复内容 |
|---|------|---------|
| 16 | `LEVEL_MULTIPLIERS` 70/80 级数值偏差 | 70: 497→765, 80: 777→1077，新增 95/100 级 |
| 17 | 激化附伤与大权区乘法顺序错误 | CATALYZE 路径改为 `base × authority + catalyzeBonus` |
| — | 全部死代码清理 | 删 35 项死代码（14 组件、2 zone、10+ 工具函数等） |
| — | 存档缺少 customScaling/teamBuff/lauma | 迁移至 zustand store，保存/加载/分享全链路打通 |
| — | 分享链接退出死循环 | 进入后清 hash，不再反复跳 wizard |

### ✅ 已修复（2026-05-21 Phase 1）

| # | 问题 | 修复内容 |
|---|------|---------|
| 1 | `applyZoneBonus.atkPercent` 语义错误 | 改为 `total + base × percent` |
| 2 | `setBonus` 未参与计算 | 新增步骤 10 |
| 3 | `amplifyingMultiplier` 链路缺失 | 打通类型和优化器链路 |
| 4 | `defReductions`/`defIgnore` 硬编码 | 从 `mergeExtraBonuses()` 提取 |
| 9 | `teamBuffBonuses` ATK% 偏差 | 随 Fix 1 自动修正 |
| 11 | `DefReductionSum` 上界 1.0 | 改为 `DEF_REDUCTION_CAP = 0.9`（KQM） |
| 12 | 防御公式缺少 `DefIncrease` | 新增参数，默认 0 |

### ⏳ 待修复（按优先级排序）

| # | 问题描述 | 严重程度 | 预计阶段 |
|---|---------|:--------:|:------:|
| 5 | 无反应覆盖模型（需与 #6 联合设计） | 🟡 中 | Phase 2 |
| 6 | 仅支持单一 `skillMultiplier` | 🟡 中 | Phase 2 |
| 7 | 敌人抗性不区分元素类型 | 🟢 低 | Phase 3 |
| 8 | 理想模板优化器不搜索主词条组合 | 🔴 高 | Phase 2 |
| 10 | 缺少「技能等级 → 倍率」的自动映射 | 🟢 低 | Phase 3 |
| 13 | 缺少 `BaseDMGMultiplier` 系统（行秋 C4/宵宫 E/散兵 E） | 🔴 高 | Phase 2 |
| 14 | `AdditiveBaseDMGBonus` 来源不全（申鹤 E/云堇 Q 等） | 🟡 中 | Phase 3 |
| 15 | 反应月曜公式过度简化（角色 vs 反应路径未区分） | 🟡 中 | Phase 3 |
