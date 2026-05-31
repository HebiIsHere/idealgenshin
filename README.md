# 理想原生 (Ideal Genshin) v4.2

基于完整期望伤害公式的**原神圣遗物词条优化工具**。逐区填写、滚动引导、可视化期望伤害计算。

## ✨ 功能

- **竖屏信息流** — scroll-snap + scrollIntoView 原生吸附，滚轮/触摸板/按钮精确一张一卡，移动端适配
- **Enka 导入** — 输入 UID 一键导入角色展柜数据（角色/武器/圣遗物）
- **七步向导** — Enka导入 → 角色 → 武器 → 圣遗物 → 天赋&命座 → 倍率&反应 → 队伍增益
- **可折叠面板** — 天赋模拟/命座模拟/圣遗物编辑均支持 Portal 弹窗
- **期望伤害引擎** — 统一公式管道，覆盖直伤/增幅/剧变/激化/月反应全部路径
- **武器精炼数据** — 224 把武器真实 R1–R5 描述，变化数值自动高亮
- **圣遗物套装** — 55 套圣遗物 2pc/4pc 效果自动检测与应用
- **卡池数据** — 112 角色，含挪德卡莱月反应 + 菈乌玛祷歌附伤支持
- **天赋/命座模拟** — 自由填入各乘区数值，天赋&命座详情参考
- **倍率混合** — 支持单属性或双属性混合倍率（如 ATK + EM）
- **期望伤害详情** — 每乘区展开中间值 + 计算公式，大权区/月兆/精通/羽毛/祷歌五个特殊乘区
- **同词条重优化** — 固定总词条数，爬山算法重分配；面板对比 + 词条分布 + 乘区分析
- **理想模板** — 可调词条数，理论最优期望伤害 + 理想面板对比
- **配置分享** — 一键复制链接，lz-string 压缩到 URL hash，粘贴即复刻
- **配置存档** — JSON 导入/导出，localStorage 持久化
- **芙宁娜水蓝主题** — 青瓷白点缀 + Furina 剪影首页 + 卡片呼吸浮沉 + 下拉菜单入场动画
- **按钮交互** — 胶囊形渐变主按钮 + spring 回弹 + 水波涟漪 + 光晕呼吸
- **贴纸表情包** — 112 角色专属贴纸弹射动画（优化至 6.5MB）

## 🛠 技术栈

**前端**: Vite · React 18 · TypeScript · MUI v6 · Zustand · Recharts  
**引擎**: 自研期望伤害公式管道（15 个乘区）  
**优化器**: Web Worker 爬山算法 · 枚举+剪枝+重分配+理想模板+主属性搜索  
**数据**: genshin-db（112 角色 / 224 武器 / 55 圣遗物套装）· Enka Network API  
**分享**: lz-string 压缩 + URL hash

## 🚀 本地运行

```bash
npm install
npm run dev      # 开发服务器 → http://localhost:5173
npm run build    # 生产构建 → dist/
npm run test     # 运行测试
```

## 📁 项目结构

```
src/
├── engine/          # 期望伤害公式引擎（15个乘区）
│   ├── formula.ts   # 统一公式管道
│   ├── stats.ts     # 属性计算器
│   └── zones/       # 15个独立乘区实现
├── optimizer/       # 词条优化器（Worker线程）
├── components/      # React 组件
│   ├── wizard/      # 向导导航 + 板块组件
│   │   └── sections/ # 8个独立板块（Import/Character/Weapon/...）
│   ├── optimizer/   # 期望伤害流程/乘区分析/场景选择
│   ├── character/   # 角色面板/天赋/命座
│   ├── weapon/      # 武器选择/被动模拟
│   ├── artifact/    # 圣遗物编辑/套装选择/Enka导入
│   └── layout/      # 布局/存档管理
├── store/           # Zustand 状态管理
│   ├── slices/      # wizard/character/artifact/optimizer/save
│   └── menuStore.ts # 菜单打开计数
├── hooks/           # useV5Ripple 水波涟漪
├── data/            # 角色/武器/圣遗物/套装/命座数据
├── services/        # Enka API / SaveService
├── utils/           # share / applyShare / buildLoader / calcLaumaPrayer
└── pages/           # LandingPage / WizardPage
```

## 📄 许可

MIT License

## 👤 作者

袔苾 · v4.2
