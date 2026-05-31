# 理想原生 v4.2 — 项目概述

## TL;DR

理想原生是一款纯前端的原神期望伤害圣遗物词条优化工具，基于完整期望伤害公式，支持滚动向导式配置、词条重分配优化、理想模板生成和可视化期望伤害分析。

## 交付概览

| 指标 | 状态 |
|------|------|
| 版本 | v4.2 |
| TypeScript 错误 | 0 |
| 生产构建 | ✅ 成功 |
| 贴纸资源 | 851 张 PNG，压缩至 6.5MB |

## v4.2 核心特性

- **竖屏信息流** — scrollIntoView + snap 吸附，触摸板/鼠标滚轮精确控卡
- **Enka 导入** — 输入 UID 一键导入角色展柜数据
- **七步向导** — 导入 → 角色 → 武器 → 圣遗物 → 天赋&命座 → 倍率&反应 → 队伍增益
- **期望伤害引擎** — 15 乘区统一管道，5 条伤害路径 + 5 个特殊乘区
- **同词条重优化** — 爬山算法重分配，面板对比 + 词条分布 + 乘区分析
- **理想模板** — 理论最优期望伤害计算，理想面板对比
- **配置分享** — lz-string 压缩到 URL hash，一键复制链接，粘贴即复刻
- **芙宁娜水蓝主题** — 青瓷白点缀，卡片呼吸浮沉，胶囊形按钮 spring 回弹 + 涟漪
- **配置存档** — JSON 导入/导出 + localStorage 持久化
- **移动端适配** — 上下步按钮导航 + 底部角色面板

## 技术栈

- **前端**: Vite · React 18 · TypeScript · MUI v6 · Zustand · Recharts
- **引擎**: 自研期望伤害公式管道（15 个独立乘区）
- **优化器**: Web Worker 爬山算法 · 枚举+剪枝+重分配+理想模板+主属性搜索
- **数据**: genshin-db（112 角色 / 224 武器 / 55 圣遗物套装）· Enka Network API

## 关键目录

```
src/
├── engine/          # 期望伤害公式引擎
│   ├── formula.ts   # 统一公式管道
│   ├── stats.ts     # 属性计算器
│   └── zones/       # 15个独立乘区
├── optimizer/       # 词条优化器（Web Worker）
├── components/
│   ├── wizard/      # 向导导航 + 8个板块组件
│   ├── optimizer/   # 期望伤害流程/乘区分析
│   ├── character/   # 角色/天赋/命座
│   ├── weapon/      # 武器选择/被动
│   ├── artifact/    # 圣遗物编辑/Enka导入
│   └── layout/      # 存档管理
├── store/slices/    # Zustand 切片
├── hooks/           # useV5Ripple 涟漪
├── utils/           # share / applyShare / buildLoader
├── data/            # 角色/武器/圣遗物数据
└── pages/           # LandingPage / WizardPage
```

## 运行

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # dist/
npm test         # vitest
```

## 作者

袔苾 · v4.2
