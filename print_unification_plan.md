# 医疗器械ERP管理系统 V1.9 - 打印模块统一化重构方案

## 1. 现状与问题分析

经过对 `shenyun-1.9` 项目的全面排查，发现当前系统的打印功能存在严重的“碎片化”问题。主要表现为**打印预览、打印、保存的格式不统一**，以及**同一个表单存在多个不同技术栈的打印入口**。

### 1.1 打印入口碎片化（5种不同的实现路径）

目前系统中至少存在 5 种完全不同的打印实现方式，导致维护成本极高：

1. **路径一：`TemplatePrintPreviewButton` (Puppeteer PDF 渲染)**
   - **使用频次**：16 处（如采购订单、生产领料单、出入库单等）。
   - **机制**：调用后端 `renderPdf` 接口，通过 Puppeteer 将 HTML 模板渲染为 PDF，前端通过 `iframe` 预览并提供下载和打印。
   - **优点**：格式最稳定，预览、打印、保存（下载）完全一致。
   - **缺点**：依赖后端服务，生成速度稍慢。

2. **路径二：`PrintPreviewButton` (前端 HTML 直接打印)**
   - **使用频次**：33 处（如 IQC/OQC 质检单、财务收票/开票等）。
   - **机制**：将当前页面的某个 DOM 节点（`targetRef`）的 HTML 提取出来，注入到一个新打开的浏览器窗口中，直接调用 `window.print()`。
   - **缺点**：**格式极不稳定**。因为它是直接抓取前端组件的 DOM，受浏览器样式、屏幕分辨率影响极大；且无法直接保存为标准的 PDF（只能依赖浏览器自带的“另存为 PDF”虚拟打印机）。

3. **路径三：`<PrintTemplate>` 组件弹窗 (React 组件渲染)**
   - **使用频次**：9 处（如销售订单 `SalesOrderPrint`、发货单 `DeliveryNotePrint`、收据 `ReceiptPrint`、报关单等）。
   - **机制**：在当前页面弹出一个 React Dialog，里面渲染排版好的单据，点击“打印”时再将该区域写入新窗口并调用 `window.print()`。
   - **缺点**：需要为每种单据手写复杂的 React 打印组件，且预览效果与最终纸质打印效果可能存在 CSS 媒体查询（`@media print`）差异。

4. **路径四：内联 HTML 拼接 + `window.open`**
   - **使用频次**：39 处（如生产订单 `Orders.tsx` 中的 `handlePrint`、投资管理 `Listing.tsx` 等）。
   - **机制**：在前端 JS 代码中硬编码拼接长篇的 HTML 字符串，然后 `window.open` 写入并打印。
   - **缺点**：代码极其臃肿，难以维护，且与路径一的模板系统完全脱节。

5. **路径五：`openEnglishPrintPreviewWindow` (AI 翻译打印)**
   - **使用频次**：1 处（生产环境记录 `Environment.tsx`）。
   - **机制**：结合 AI 翻译 DOM 内容后调用前端打印。

### 1.2 同一表单存在多个打印入口的冲突

在核心业务页面中，出现了新老打印逻辑并存的混乱局面。

**典型案例：生产订单 (`client/src/pages/production/Orders.tsx`)**
在同一个详情弹窗中，同时存在两个打印按钮：
1. `<TemplatePrintPreviewButton>`：调用后端模板引擎生成标准 PDF。
2. `<Button onClick={() => handlePrint(selectedRecord)}>`：执行前端硬编码的 HTML 拼接打印。
这导致用户点击不同的按钮，会看到完全不同的排版格式，且只有前者能保证“预览=打印=保存”。

**典型案例：销售订单 (`client/src/pages/sales/Orders.tsx`)**
在列表的“操作”菜单中，提供了“打印订单”、“打印发货单”、“打印收据”三个按钮，全部使用的是**路径三**（React 组件弹窗），而没有接入系统统一的 `printTemplates` 模板库。

---

## 2. 统一化重构方案

为了彻底解决格式不统一和维护困难的问题，必须将所有打印需求收敛到**唯一标准路径**：即**基于后端 Puppeteer 的 PDF 模板渲染引擎（路径一）**。

### 2.1 核心改造原则

1. **废弃前端 DOM 抓取打印**：全面淘汰 `PrintPreviewButton` 和 `PrintTemplate` 组件，不再依赖浏览器的 HTML 直接打印。
2. **废弃硬编码 HTML**：删除所有在前端组件中通过字符串拼接 HTML 的 `handlePrint` 函数。
3. **统一入口组件**：所有业务页面的打印按钮，统一替换为 `TemplatePrintPreviewButton` 或 `UnifiedPrintButton`。
4. **所见即所得**：因为统一采用后端生成的 PDF，所以前端的“预览”就是 PDF 阅读器，“保存”就是下载该 PDF，“打印”就是将该 PDF 发送给打印机，实现 100% 的格式统一。

### 2.2 具体实施步骤

#### 第一阶段：清理冗余的打印入口（解决同一表单多入口问题）
1. **生产订单 (`production/Orders.tsx`)**：
   - 删除 442 行的 `handlePrint` 函数及其内部的 HTML 拼接逻辑。
   - 删除 1439 行的旧版 `<Button>🖨️ 打印</Button>`。
   - 仅保留 1433 行的 `<TemplatePrintPreviewButton>`。

2. **销售订单 (`sales/Orders.tsx` & `sales/Quotes.tsx`)**：
   - 废弃 `SalesOrderPrint`、`DeliveryNotePrint`、`ReceiptPrint` 这三个 React 打印组件。
   - 将这三个单据的排版转换为标准的 HTML/CSS 模板，存入 `printTemplateDefaults.ts`。
   - 将页面上的打印按钮替换为调用 `usePrintTemplate().preview(templateKey, data)`。

#### 第二阶段：迁移前端 DOM 打印（解决格式不统一问题）
针对目前使用 `PrintPreviewButton`（路径二）的 33 处页面（主要集中在质检 IQC/OQC、财务收开票、仓储出入库）：
1. 在 `shared/printTemplateDefaults.ts` 中为这些单据补充默认的 HTML 模板。
2. 在页面中构造对应的数据 Payload（如 `buildIqcPrintData(record)`）。
3. 将 `<PrintPreviewButton targetRef={...}>` 替换为 `<TemplatePrintPreviewButton templateKey="..." data={payload}>`。
4. 删除页面中用于承载打印内容的隐藏 DOM（即那些被 `targetRef` 指向的 `div`）。

#### 第三阶段：组件与 API 收拢
1. **合并组件**：目前存在 `TemplatePrintPreviewButton` 和 `UnifiedPrintButton` 两个功能高度重合的组件。建议保留 `UnifiedPrintButton`，并在内部集成 `usePrintTemplate` 的 `preview` 逻辑（先预览 PDF，再由用户决定是否打印或下载）。
2. **下线旧 API**：在 `printPreview.ts` 中，标记 `openPrintPreviewWindow` 和 `buildPrintableHtmlFromElement` 为 `@deprecated`，最终予以删除。

---

## 3. 预期收益

1. **格式绝对统一**：无论是预览、打印还是下载保存，用户看到的都是同一份由后端生成的 PDF 文件，彻底消除浏览器兼容性和 DPI 差异导致的排版错乱。
2. **模板可配置化**：所有单据的样式都收敛到系统的“打印模板管理”模块中，实施人员或管理员可以在线修改 HTML/CSS 模板，而无需修改前端 React 代码。
3. **代码大幅瘦身**：移除前端大量用于打印的隐藏 DOM 结构和硬编码的 HTML 字符串，提升页面加载性能和代码可读性。
