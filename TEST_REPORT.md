# Test Report — 原神圣遗物词条优化器

## Summary
- **Total Tests**: 55 | **Passed**: 55 | **Failed**: 0
- **Estimated Coverage**: ~85% (core engine + optimizer + stat calculation)
- **Routing Decision**: **Engineer** — Build fails with 50 TypeScript errors (source code bugs)

---

## 1. 伤害公式准确性 (33 tests — ALL PASSED)

### BaseDamageZone (3 tests)
- ✅ ATK scaling: skillMultiplier × totalAtk = 6000
- ✅ HP scaling: skillMultiplier × totalHp = 3000 (Hu Tao)
- ✅ DEF scaling: skillMultiplier × totalDef = 1200

### ScalingZone (1 test)
- ✅ Always returns 1.0 (passthrough)

### BonusZone (2 tests)
- ✅ 1 + dmgBonus = 1.466 (46.6% Pyro DMG)
- ✅ 1.0 when no bonus

### CritZone (3 tests)
- ✅ 1 + critRate × critDmg = 1.5 (50% CR, 100% CD)
- ✅ Crit rate capped at 1.0 (150% CR → 1.0)
- ✅ Zero crit rate → 1.0

### ResistanceZone — 三段公式 (7 tests)
- ✅ R < 0: 1 - R/2 (R=-0.2 → 1.1)
- ✅ R = -0.1 → 1.05
- ✅ 0 ≤ R < 0.75: 1 - R (R=0.10 → 0.90)
- ✅ R = 0.50 → 0.50
- ✅ R = 0 → 1.0 (boundary)
- ✅ R ≥ 0.75: 1/(1+4R) (R=0.75 → 0.25)
- ✅ R = 1.0 → 0.2

### DefenseZone (3 tests)
- ✅ Lv90 vs Lv90: 190/380 = 0.5
- ✅ Lv90 vs Lv100: 190/390
- ✅ Lv90 vs Lv80: 190/370

### AmplifyingZone (4 tests)
- ✅ NONE → 1.0
- ✅ Vaporize 1.5× with EM=0 → 1.5
- ✅ Melt 2.0× with EM=100 → 2.0 × (1 + 0.1853...)
- ✅ EM formula: 2.78×EM/(EM+1400)

### TransformativeZone (3 tests)
- ✅ NONE → 1.0
- ✅ Overloaded: 2172 × (1 + EM bonus)
- ✅ Hyperbloom: 2824 × (1 + EM bonus)

### Full Pipeline — Amplifying (3 tests)
- ✅ Hu Tao HP scaling, no reaction: 手算验证通过
- ✅ Raiden ATK scaling, no reaction: 手算验证通过
- ✅ With Vaporize reaction: reaction multiplier applied correctly

### Full Pipeline — Transformative (1 test)
- ✅ Overloaded reaction: baseDmg × EM factor × resistance

### Edge Cases (3 tests)
- ✅ Zero skill multiplier → zero damage
- ✅ 100%+ crit rate properly capped
- ✅ Negative resistance increases damage

---

## 2. 属性计算正确性 (10 tests — ALL PASSED)

- ✅ Base stats only (no artifacts/buffs)
- ✅ Percentage stats stored as decimals (0.311 not 31.1)
- ✅ Total = base × (1 + %bonus) + flat — HP example
- ✅ Crit rate capped at 1.0
- ✅ Crit rate capped at 1.0 with extreme values
- ✅ ATK with weapon baseAtk (flat) and % bonus
- ✅ EM is purely additive
- ✅ Team buffs accumulated correctly
- ✅ Elemental damage bonus from goblet → dmgBonus
- ✅ Ascension stat accumulates correctly

---

## 3. 优化算法正确性 (12 tests — ALL PASSED)

### SearchSpaceExplorer (4 tests)
- ✅ Enumerates all distributions for 5 rolls × 2 types → 6
- ✅ Respects max 6 rolls per type
- ✅ Zero rolls → [[]]
- ✅ All distributions sum to total

### RedistributeOptimizer (3 tests)
- ✅ Total rolls conserved after optimization
- ✅ Optimized damage >= original damage
- ✅ Zero rolls returns same damage

### IdealTemplateOptimizer (5 tests)
- ✅ Non-zero theoretical damage for valid input
- ✅ Ideal allocation roll count matches totalRolls
- ✅ Zero totalRolls → zero damage
- ✅ ATK scaler (Raiden) returns non-zero damage
- ✅ Each allocation roll ≤ 6

---

## 4. 项目构建与启动

### Build: ❌ FAIL (50 TypeScript errors)
- `npm run build` → `tsc -b` fails with 50 errors
- All errors are in source code (unused imports, unused variables, duplicate identifiers, type mismatches)
- **This is a source code bug requiring Engineer fix**

### Dev Server: ✅ PASS
- `npm run dev` / Vite starts successfully
- Listens on [::1]:5173 (confirmed via netstat)

---

## 5. UI 组件检查

### Route Configuration: ✅ PASS
- App.tsx defines routes: `/`, `/redistribute`, `/ideal`, fallback `*`
- All referenced page components exist

### Component Files: ✅ PASS (all exist)
- ArtifactEditor, ArtifactImport, ArtifactList
- CharacterSelect, CharacterStats, SkillInput
- DamageResult, LoadingOverlay, StatDisplay, StatInput
- AppLayout, Sidebar
- ComparisonChart, IdealTemplatePage, OptimizationResult, RedistributePage
- WeaponSelect
- HomePage

---

## Source Code Bugs (Send to Engineer)

### Critical — Build Breaking (2 errors)
1. **`src/components/artifact/ArtifactEditor.tsx` line 13-14**: Duplicate identifier `SubstatType`
   - Imported both as type (`import type { SubstatType }`) and as value (`import { SubstatType }`)
   - **Fix**: Remove `SubstatType` from one of the import statements

2. **`src/components/character/SkillInput.tsx` line 74**: Type mismatch
   - `parseFloat(e.target.value)` where `e.target.value` is `string | number`
   - **Fix**: Add type assertion `parseFloat(e.target.value as string)` or use `(e.target as HTMLInputElement).value`

### Moderate — Unused Imports/Variables (48 errors)
These don't affect runtime behavior but prevent `tsc -b` from passing with strict mode. Files affected:
- `src/components/artifact/ArtifactEditor.tsx` — unused `useState`, `SubStatEntry`
- `src/components/artifact/ArtifactList.tsx` — unused `PERCENTAGE_STAT_TYPES`
- `src/components/character/CharacterSelect.tsx` — unused `Chip`, type imports, `allCharacters`
- `src/components/character/CharacterStats.tsx` — unused `formatNumber`
- `src/components/character/SkillInput.tsx` — unused `Typography`
- `src/components/common/StatDisplay.tsx` — unused `PERCENTAGE_STAT_TYPES`
- `src/components/common/StatInput.tsx` — unused entire import
- `src/components/optimizer/ComparisonChart.tsx` — unused `Box`, `SUBSTAT_MID_VALUES`, `formatStatValue`
- `src/components/optimizer/IdealTemplatePage.tsx` — unused `useMemo`, `SubstatAllocation`
- `src/components/optimizer/OptimizationResult.tsx` — unused `Chip`, `SUBSTAT_MID_VALUES`, `formatStatValue`
- `src/components/optimizer/RedistributePage.tsx` — unused `useState`, `Divider`, `TextField`, destructured vars
- `src/data/characters/index.ts` — unused `path`
- `src/engine/formula.ts` — unused `zones` static property
- `src/engine/stats.ts` — unused `ArtifactInstance` type import
- `src/optimizer/redistribute.ts` — unused `SubstatType` type import
- `src/optimizer/search.ts` — unused `evaluateDamage` parameter
- `src/services/enka.ts` — unused `ReactionType`, `ElementType`, `relic`
- `src/store/index.ts` — unused `create`, all store imports
- `src/store/slices/artifactSlice.ts` — unused `SubstatType`, `SubType`, `createDefaultArtifact`, `state`
- `src/store/slices/characterSlice.ts` — unused `ScalingType`, `getAllCharacters`
- `src/store/slices/optimizerSlice.ts` — unused `Comlink`, `WeaponData`, `OptimizerWorkerAPI`, `DEFAULT_WEAPON`, `get`

**Recommendation**: The fastest fix is to prefix unused parameters with `_` (e.g., `_path`, `_state`) and remove unused imports.

---

## Test Infrastructure Added

| File | Purpose |
|------|---------|
| `vitest.config.ts` | Vitest configuration |
| `src/__tests__/damage-formula.test.ts` | 33 damage formula tests |
| `src/__tests__/stat-calculator.test.ts` | 10 stat calculation tests |
| `src/__tests__/optimizer.test.ts` | 12 optimizer tests |
| `tsconfig.app.json` (modified) | Excluded `src/__tests__` from build |
| `package.json` (modified) | Added `test` and `test:watch` scripts |

Run tests: `node node_modules/vitest/vitest.mjs run` or `npm test`
