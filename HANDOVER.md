# 理想原生 v4.2 — 项目移交文档

## 项目简介

理想原生是一款面向原神玩家的纯前端 Web 工具，基于完整期望伤害公式，帮助玩家优化圣遗物词条分配、生成理想词条模板，并以可视化方式展示期望伤害提升效果。

项目采用 **Vite + React 18 + TypeScript + MUI v6 + Zustand** 技术栈，所有计算在浏览器端完成（含 Web Worker 优化器），数据通过 localStorage 持久化。核心期望伤害引擎采用乘区管道架构，支持直伤、增幅、剧变、激化、月曜五条路径，覆盖大权区/月兆/精通/羽毛/祷歌等特殊乘区。

v4.2 采用芙宁娜水蓝主题，青瓷白点缀。滚动交互经过重构（scrollIntoView 替代 scrollTo），触摸板和移动端均有适配。支持配置分享（lz-string 压缩到 URL hash，粘贴即复刻）。

## 源码统计

| 类别 | 说明 |
|------|------|
| TS 源码文件 | ~60 个（组件/引擎/优化器/状态管理/工具） |
| 数据文件 | 112 角色 + 224 武器 + 55 圣遗物套装 + 天赋/命座 |
| 样式 | index.css（含 v5 动画） + MUI theme |
| 测试 | 引擎 + 优化器 vitest 用例 |

## 关键目录

```
src/
├── engine/              # 期望伤害公式引擎（15 乘区）
│   ├── formula.ts       # 统一公式管道（5 路径路由）
│   ├── stats.ts         # 属性计算器
│   └── zones/           # 各乘区实现
├── optimizer/           # 优化算法（Web Worker / Comlink）
│   ├── redistribute.ts  # 词条重分配
│   ├── ideal.ts         # 理想模板 + 主属性搜索
│   ├── search.ts        # 爬山算法
│   └── worker.ts        # Worker 封装
├── components/
│   ├── wizard/          # SectionRoller + SectionStepper
│   │   └── sections/    # 8 个独立板块组件 + PortalOverlay
│   ├── optimizer/       # DamageFlow / OptimizationResult / DamageComparison
│   ├── character/       # CharacterSelect / CharacterStatPanel
│   ├── weapon/          # WeaponSelect / WeaponPassiveInput
│   ├── artifact/        # ArtifactEditor / ArtifactImport / ArtifactSetSelect
│   ├── common/          # LoadingOverlay / StickerThrower / BonusRow
│   └── layout/          # SaveManager / Header
├── store/
│   ├── slices/          # wizard / character / artifact / optimizer / save
│   └── menuStore.ts     # 菜单打开计数（暂停卡片浮沉用）
├── hooks/               # useV5Ripple 水波涟漪
├── utils/               # share / applyShare / buildLoader / calcLaumaPrayer
├── data/                # JSON 数据 + TypeScript 索引
├── pages/               # LandingPage / WizardPage
├── theme.ts             # MUI 暗色主题（芙宁娜水蓝 + 青瓷白）
└── index.css            # v5 动画 + 全局样式
```

## 运行状态

- **Dev server**: `npm run dev`（端口 5173）
- **生产构建**: `npm run build`（输出到 dist/）
- **测试**: `npm test`
- **类型检查**: `npx tsc -b`，0 错误

## 版本历史

| 版本 | 主要变更 |
|------|---------|
| v4.2 | 期望伤害术语统一 · 青瓷白主题 · 滚动重构（scrollIntoView） · 分享复刻 · WizardPage 拆分 · 贴纸压缩 · 按钮回弹+涟漪 · 下拉菜单动画 · 卡片浮沉暂停 · 5 个新乘区展示 |
| v4.1 | 竖屏信息流 · 滚轮导航 · 移动端适配 · 卡片呼吸浮沉 · 芙宁娜水蓝主题 |
| v4.0 | 竖屏信息流 · 折叠面板 · 滚轮导航 · 气泡优化 |
| v3.x | 五路径统一公式 · 词条重分配 · 理想模板 · Enka 导入 |

## 接手须知

1. **启动**: `cd` 到项目目录 → `npm install` → `npm run dev`
2. **项目约定**: 百分比内部以小数存储（50% = 0.5），UI 展示时 ×100
3. **核心数据流**: `CharacterBuild` → `DamageContext` → `DamageResult`（期望伤害 + 15 乘区 debug）
4. **滚动**: SectionRoller 使用 `scrollIntoView` + `data-section` 属性，不要回头用 `scrollTo` 像素计算
5. **分享**: `encodeBuild()` → lz-string → URL hash；`applySharePayload()` → zustand stores
6. **贴纸**: 压缩至 6.5MB，如果需要重新添加贴纸，先跑压缩脚本
