# OC 调香轮盘第一阶段 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 构建可直接打开的三层 SVG 调香轮盘，使用用户指定的 380 条 OC 香调数据并保留第一阶段静态边界。

**Architecture:** 四个生产文件按页面、样式、数据、绘制逻辑分离。Node 内置测试以最小 DOM 实现实际执行 `data.js` 和 `app.js`，再以浏览器检查视觉与响应式结果。

**Tech Stack:** HTML5、CSS3、Vanilla JavaScript、SVG、Node.js 内置 `node:test` 与 `vm`

**Spec:** `docs/superpowers/specs/2026-08-26-oc-perfume-wheel-phase-1-design.md`

## Global Constraints

- 不使用 React、Vue、Next.js、TypeScript、Canvas、npm 包、CSS 框架、构建工具或后端。
- `index.html` 必须能通过 `file://` 直接运行。
- 最外圈后调 160、中圈中调 120、最内圈前调 100。
- 数据中不允许占位名称，不在轮盘中显示 380 个名称。
- 不实现随机、旋转、停止角度、揭晓、Hover、Tooltip、AI、保存、分享、登录、数据库、后端或部署。

---

### Task 1: 建立可执行验收测试

**Files:**
- Create: `tests/verify-wheel.js`

**Interfaces:**
- Consumes: 未来的 `window.PERFUME_NOTES`，以及 `document.getElementById()` 可访问的三个 ring group。
- Produces: `node --test tests/verify-wheel.js`，覆盖数据长度、唯一性、非占位名称、DOM path 数量、path 几何和 Console 数量。

- [ ] **Step 1: 写入 Node 内置测试与最小 DOM 实现**
- [ ] **Step 2: 运行 `node --test tests/verify-wheel.js`**
- [ ] **Step 3: 确认测试因 `data.js`、`app.js` 尚不存在而失败**

### Task 2: 实现数据、结构与 SVG 绘制

**Files:**
- Create: `index.html`
- Create: `data.js`
- Create: `app.js`

**Interfaces:**
- Consumes: `data.js` 写入的 `window.PERFUME_NOTES`，每个条目仅包含 `id`、`name`。
- Produces: `createRing({ group, notes, innerRadius, outerRadius, colors, ringType })` 的绘制行为，以及三个 group 内 160/120/100 个独立 `path.segment`。

- [ ] **Step 1: 在 `data.js` 写入用户指定的 100 条前调、120 条中调和 160 条后调；不擅自补充或重新分类**
- [ ] **Step 2: 运行测试并确认失败点推进到缺少页面绘制行为**
- [ ] **Step 3: 在 `index.html` 写入标题、指针、SVG groups、圆心按钮和结果卡片**
- [ ] **Step 4: 在 `app.js` 实现极坐标转换、环形扇区 path、三圈绘制与 Console 校验**
- [ ] **Step 5: 运行测试并确认全部通过**

### Task 3: 完成视觉、响应式与浏览器验收

**Files:**
- Create: `styles.css`
- Modify: `index.html`

**Interfaces:**
- Consumes: `index.html` 中 `.wheel-shell`、`.wheel-pointer`、`.wheel-svg`、`.start-button`、`.result-card`。
- Produces: 纯 CSS 宣纸近似、三圈柔和视觉、桌面与手机端不裁切布局。

- [ ] **Step 1: 实现暖白多层 CSS 渐变、轮盘配色、按钮和结果卡片样式**
- [ ] **Step 2: 添加窄屏媒体查询，确保指针与轮盘完整显示**
- [ ] **Step 3: 运行 `node --test tests/verify-wheel.js`**
- [ ] **Step 4: 在浏览器打开本地 `index.html`，检查 Console、桌面和手机视口**
- [ ] **Step 5: 逐项核对阶段一验收清单，停止开发后续功能**
