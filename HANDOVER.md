# 原神圣遗物词条优化器 V2 — 项目移交文档

## 项目简介（约260字）

原神圣遗物词条优化器是一款面向玩家的纯前端 Web 工具，基于完整的原神伤害计算公式，帮助玩家优化圣遗物词条分配、生成理想词条模板，并以可视化方式展示伤害提升效果。

项目采用 **Vite + React 18 + TypeScript + MUI v6 + Zustand + Recharts** 技术栈，所有计算在浏览器端完成，无需后端服务，数据通过 localStorage 持久化。核心伤害引擎采用"乘区管道（Zone Pipeline）"架构，支持直伤、增幅、剧变、激化、月曜五条伤害路径，公式精度对齐主流社区计算器。

V2 版本在 V1 基础上新增了武器/命座配置、典型场景选择、伤害前后对比、乘区词条分析以及完整的存档管理功能。页面采用三 Tab 统一布局（角色与装备 / 伤害计算 / 词条分析），用户在一个页面内即可完成从配置到分析的全流程。

目前项目 115 个测试用例全部通过，TypeScript 零类型错误，生产构建约 4MB（gzip 后约 350KB），支持通过 Enka Network API 一键导入玩家游戏数据。

---

## 源码统计

| 类别 | 数量 | 说明 |
|------|------|------|
| **TS 源码文件（.ts / .tsx）** | 73 个 | 含组件、引擎、优化器、状态管理、工具函数 |
| — 组件（.tsx） | 29 个 | React 函数组件，MUI + Tailwind CSS |
| — 逻辑模块（.ts） | 44 个 | 引擎、优化器、服务、Store、工具 |
| — 类型定义 | 1 个（types/index.ts） | 全局 TypeScript 类型 |
| **数据文件（.json）** | 27 个 | 角色×5、武器×17、场景×5，均存于 src/data/ |
| **样式文件（.css）** | 1 个（src/index.css） | 全局基础样式 |
| **测试文件（.test.ts）** | 4 个 | 伤害公式、优化器、属性计算器、套装判定 |
| **文档（docs/）** | 12 个 | PRD、架构设计（含 Mermaid 图）、测试报告 |
| **总计（含 docs）** | 约 112 个文件 | — |

### 代码行数估算

| 模块 | 估算行数 |
|------|----------|
| 伤害引擎（engine/） | ~1,200 行 |
| 优化器（optimizer/） | ~900 行 |
| React 组件（components/） | ~3,500 行 |
| 状态管理（store/） | ~600 行 |
| 数据层（data/ + services/） | ~800 行 |
| 工具函数（utils/） | ~300 行 |
| **TypeScript 总代码** | **约 7,300 行** |

---

## 关键目录结构

```
src/
├── engine/              # 伤害公式引擎（5路径 + 11个乘区模块）
│   ├── formula.ts      # 主干路由
│   ├── stats.ts        # 属性计算器
│   └── zones/         # 各乘区实现（base/bonus/crit/resistance/defense...）
├── optimizer/         # 优化算法（枚举+剪枝，Web Worker 封装）
│   ├── redistribute.ts # 词条重分配
│   ├── ideal.ts       # 理想模板
│   ├── search.ts      # 搜索算法
│   └── worker.ts      # Comlink Worker 封装
├── components/
│   ├── optimizer/     # 三大 Tab 页面 + 结果展示组件
│   ├── character/     # 角色选择、命座、技能输入
│   ├── weapon/        # 武器选择、被动输入
│   ├── artifact/      # 圣遗物导入（Enka）+ 手动编辑
│   ├── layout/        # AppLayout + Header + SaveManager
│   └── common/       # ZoneBonusInput 等公共组件
├── store/slices/      # Zustand 四切片（character/artifact/optimizer/save）
├── data/              # JSON 配置（角色/武器/场景）+ TypeScript 索引
├── services/          # save.ts（localStorage CRUD）、enka.ts、set-bonus.ts
├── utils/             # format.ts、helper.ts、mergeExtraBonuses.ts
├── theme.ts           # MUI 暗色主题（原神风格）
└── main.tsx           # 入口（ErrorBoundary + StrictMode）
```

---

## 运行状态

- **Dev server**：`npx vite`（默认端口 5173）
- **生产构建**：`npx vite build`，输出到 `dist/`
- **测试**：`npx vitest run`，115/115 通过
- **类型检查**：`npx tsc --noEmit`，0 错误

---

## 已知问题与待办

1. **生产构建 `dist/` 中的 `index.html` 有缓存的旧版本**（lang 属性为 `zh-CN` 而非 `zh-CN`，无 loading-splash）——每次 build 后需确认 `dist/index.html` 与源码 `index.html` 一致
2. **白屏问题**（2026-05-18 修复）：index.html 已添加 loading-splash 加载指示器，main.tsx 已添加启动计时日志；若再次出现白屏，优先检查 dev server 进程状态和浏览器 Console 中的 `[boot]` 日志
3. **vite.config.ts** manualChunks 已修复为函数形式，vendor chunk 现在正确包含 React/ReactDOM
4. **待扩展**：更多角色/武器数据、套装效果参与计算、多技能对比、方案导出

---

## 接手须知

1. **启动开发**：`cd C:\Users\zxy\WorkBuddy\2026-05-17-task-12 && npx vite`
2. **项目约定**：百分比内部以小数存储（50% = 0.5），UI 展示时 ×100；副词条 P0 按固定中间值简化
3. **核心数据结构**：`CharacterBuild`（角色+武器+圣遗物+命座的统一输入）→ `DamageContext`（伤害公式输入）→ `DamageResult`（五路径输出）
4. **新增角色**：在 `src/data/characters/` 添加 JSON + 注册到 `index.ts`；同理武器和场景
5. **问题排查**：白屏先看浏览器 Console 的 `[boot]` 日志和 ErrorBoundary 输出；计算异常先看 `engine/zones/` 对应乘区模块
