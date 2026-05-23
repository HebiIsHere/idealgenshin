# 工作记忆 — 原神圣遗物词条优化器项目

## 项目概况
- 项目名：genshin_artifact_optimizer（原神圣遗物词条优化网站）
- 位置：C:\Users\zxy\WorkBuddy\2026-05-17-task-12
- 技术栈：Vite + React + MUI + Tailwind CSS + TypeScript + Zustand + Recharts + Comlink
- 纯前端本地工具，无后端

## 核心功能
1. **词条重分配优化**：输入角色+当前词条分布 → 保持词条总数不变 → 算出最优词条分配 → 显示伤害提升百分比
2. **理想词条模板**：输入角色+词条总数 → 输出理论最优词条分配
3. **V2新增**：武器选择+被动输入、命座输入、典型场景、伤害前后对比、乘区词条分析、存档系统

## 架构决策
- 伤害公式引擎：乘区管道（Zone Pipeline）模式，5路路由（DIRECT/AMPLIFYING/TRANSFORMATIVE/CATALYZE/MOONSIGN）
- 优化算法：回调式枚举 + 递归剪枝（enumerateAndEvaluate），计算移至 Web Worker
- 数据驱动：角色/武器/场景数据存为JSON配置文件，新增仅需添加JSON
- 副词条P0按固定中间值简化（暴击率3.3%、暴击伤害6.6%等）
- 百分比内部存储为小数（50% = 0.5），UI展示时×100
- ZoneBonusInput：武器被动+命座共用接口，用户按乘区手动填写数值，叠加到已有基础上

## 测试状态
- 115/115测试全部通过（72伤害公式+20优化器+10属性计算器+13套装判定）
- 构建通过（0 TS错误）
- QA验证完成：5路径公式+Enka多角色导入+2/4件套判定+V2全部功能

## 关键文件
- PRD: docs/PRD.md, docs/PRD-v2.md
- 架构设计: docs/ARCHITECTURE.md, docs/ARCHITECTURE-v2.md
- 角色数据: src/data/characters/*.json（胡桃/雷电将军/钟离/那维莱特/甘雨）
- 武器数据: src/data/weapons/*.json（13把武器 + index.ts + DEFAULT_WEAPON）
- 场景数据: src/data/scenarios/*.json（5角色典型场景 + index.ts）
- 伤害引擎: src/engine/（formula.ts 5路径路由 + zones/ 11个乘区模块）
- 优化器: src/optimizer/（redistribute.ts, ideal.ts, search.ts, worker.ts）
- 统一页面: src/components/optimizer/CharacterAnalyzerPage.tsx（3Tab容器）
- Tab1: CharacterSetupTab.tsx | Tab2: DamageCalcTab.tsx | Tab3: AnalysisTab.tsx
- 公共组件: ZoneBonusInput.tsx（8乘区输入框）, WeaponSelect.tsx, ConstellationInput.tsx
- 对比展示: DamageComparison.tsx, ZoneAnalysisTable.tsx, ScenarioSelect.tsx
- 存档服务: src/services/save.ts（localStorage CRUD + JSON导入导出 + UID隐私）
- 存档管理UI: SaveManager.tsx, Header.tsx
- 状态管理: src/store/slices/（characterSlice + artifactSlice + optimizerSlice + saveSlice）
- 公共工具: src/utils/mergeExtraBonuses.ts（合并武器被动+命座加成）

## 已修复Bug
- Enka导入CORS：vite.config.ts添加server.proxy
- 副词条添加按钮：artifact为null时显示提示
- 单主词条部位：自动初始化artifact
- DEF缩放沙漏修复：ideal.ts沙漏主词条三路
- V2 defReductions/defIgnore双重计入：DefenseZone同时从ctx和extraBonuses读取，调用者不再重复复制（6处修复）
- 白屏问题（2026-05-18）：dev server 进程异常导致加载超时；index.html 加 loading-splash 加载指示器；manualChunks 改为函数形式修复 vendor chunk 为空问题；main.tsx 加启动计时日志

## V2 角色分析统一工作流（已完成 ✅）
- 页面合并：RedistributePage + IdealTemplatePage → CharacterAnalyzerPage（3 Tab）
- Tab1（角色与装备）：角色选择+武器选择+被动+命座+圣遗物
- Tab2（伤害计算）：典型场景选择+伤害计算+过程分解
- Tab3（词条分析）：优化模式选择+伤害前后对比+乘区词条分析
- 武器被动+命座=ZoneBonusInput（用户按乘区手动填，叠加不替换）
- 武器基础属性=下拉选择自动填充（按weaponType过滤）
- CharacterBuild: weaponConfig(WeaponData+passiveBonus) + constellationConfig(level+bonus)
- DamageContext: extraBonuses = mergeExtraBonuses(build)
- 存档系统：localStorage + JSON导入导出 + 版本兼容 + UID隐私
- mergeExtraBonuses提取为公共工具（DRY优化）
- V1遗留文件已清理：Sidebar.tsx, RedistributePage.tsx, IdealTemplatePage.tsx, weapons.ts已删除
- DEFAULT_WEAPON迁移到 src/data/weapons/index.ts

## 待扩展
- P1: 典型场景自定义、多场景对比、命座快捷模板、更多角色/武器数据
- P2: 套装效果参与计算、多技能对比、方案导出
- 需补充更多角色JSON数据（目前5个代表角色）
