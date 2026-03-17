# 医疗器械ERP管理系统 V1.9 - 打印模块代码检查报告

## 1. 打印模块架构概述

经过对 `shenyun-1.9` 项目代码的全面检查，该项目的打印模块采用了**“前后端同构渲染 + Puppeteer 后端生成 PDF + 前端 iframe 预览”**的现代化架构设计。

### 1.1 核心链路
1. **模板定义与存储**：支持系统内置模板（`printTemplateDefaults.ts`）和数据库自定义模板（`printTemplates` 表）。模板支持 HTML/CSS 模式和 Spreadsheet（类 Excel）模式。
2. **数据注入与渲染**：通过 `printEngine.ts` 中的 `renderTemplate` 函数，使用 Handlebars 风格的语法（`{{变量}}`、`{{#each}}`、`{{#if}}`）将业务数据注入模板。
3. **PDF 生成服务**：后端 `printTemplatePdfService.ts` 接收渲染请求，使用 Puppeteer 启动无头 Chrome 浏览器，将 HTML 渲染为 PDF 字节流并返回 Base64。
4. **前端预览与打印**：前端 `usePrintTemplate.ts` 接收 Base64 数据，转换为 Blob URL，通过 `printPreview.ts` 弹出独立窗口，使用 `iframe` 承载 PDF 进行预览、下载或调用浏览器原生打印。

### 1.2 核心文件分布
| 文件路径 | 核心职责 |
|---|---|
| `client/src/lib/printEngine.ts` | 核心渲染引擎，处理变量替换、循环、条件判断及 Spreadsheet 转 HTML |
| `client/src/lib/printPreview.ts` | 负责打开独立预览窗口，承载 PDF iframe 或直接渲染 HTML |
| `client/src/hooks/usePrintTemplate.ts` | 封装 tRPC 调用，提供 `print`、`preview`、`download` 统一 API |
| `server/printTemplatePdfService.ts` | 后端 Puppeteer 服务，将 HTML 转换为 PDF |
| `client/src/components/print/index.tsx` | 各种业务单据（销售订单、发货单、收据等）的打印组件入口 |
| `client/src/components/PrintTemplate.tsx` | 基础的打印弹窗组件（主要用于前端直接打印的场景） |

---

## 2. 代码质量与潜在问题分析

在检查过程中，发现代码整体结构清晰，但在部分细节实现上存在一些潜在问题和隐患。

### 2.1 浏览器弹窗拦截风险
在 `usePrintTemplate.ts` 和 `printPreview.ts` 中，存在异步操作后调用 `window.open` 的情况。
**问题描述**：现代浏览器（如 Chrome、Safari）通常会拦截非用户直接交互（如点击事件）触发的 `window.open`。在 `usePrintTemplate.ts` 的 `preview` 方法中，虽然先同步打开了 `openPendingPdfPreviewWindow`，但如果网络请求过慢，后续的窗口操作可能会出现异常。
**建议**：目前的“先开 Loading 窗口，后写入内容”的策略是正确的防拦截手段，需确保 `openPendingPdfPreviewWindow` 始终在 onClick 的同步调用栈中执行。

### 2.2 Puppeteer 路径与环境依赖
在 `server/printTemplatePdfService.ts` 中，硬编码了 Mac 环境下的 Chrome 路径：
```typescript
const CHROME_EXECUTABLE_PATH = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
```
**问题描述**：虽然代码中使用了 `existsSync` 进行判断，如果不存在则回退到 Puppeteer 默认下载的 Chromium，但在 Linux 服务器（如阿里云部署）上，如果未正确安装中文字体，生成的 PDF 会出现中文乱码（显示为方块）。
**建议**：在部署文档（`ALIYUN_MIGRATION_READY.md`）中，必须强调在服务器上安装中文字体（如 `fonts-wqy-zenhei` 或 `fonts-noto-cjk`）。

### 2.3 打印边距（Margin）单位不统一
**问题描述**：在 `printEngine.ts` 和 `PrintTemplate.tsx` 中，`@page` 的 `margin` 单位混用了 `px` 和 `mm`。
- `printEngine.ts` 第 301 行：`margin: ${marginTop}px ${marginRight}px...`
- `printPreview.ts` 第 211 行：`margin: 10mm 12mm;`
**建议**：在打印样式中，建议统一使用物理单位（`mm` 或 `cm`），因为 `px` 在不同 DPI 的打印机上可能会产生不同的物理尺寸，导致分页错乱。

### 2.4 工具函数重复定义
**问题描述**：项目中存在大量重复定义的工具函数，违反了 DRY（Don't Repeat Yourself）原则。
例如，以下函数在 `client/src/components/print/index.tsx` 和 `client/src/lib/salesDocumentPrint.ts` 中被完全复制了两份：
- `isOverseasCustomer`
- `localizeCountry`
- `getCurrencySymbol`
- `formatMoney`
- `getLocalizedPaymentTerm`
- `toWordsBelowThousand`
- `convertUsdToWords`
- `convertNumberToChineseUpper`
- `buildTemplateLogoHtml`
- `buildSignatureFooterHtml`
**建议**：应将这些通用的打印格式化函数提取到 `client/src/lib/formatters.ts` 或专门的 `printUtils.ts` 中统一维护。

### 2.5 UDI 批量打印的生命周期问题
在 `client/src/components/udi/BatchPrintDialog.tsx` 中：
```javascript
setTimeout(() => window.print(), 300);
```
**问题描述**：这里调用的是当前窗口的 `window.print()`，而不是新打开的 `printWindow.print()`。这会导致在批量打印时，打印的是当前系统页面，而不是生成的标签页面。
**建议**：应修改为 `setTimeout(() => printWindow.print(), 300);`。

---

## 3. 优化建议总结

1. **重构重复代码**：立即清理 `print/index.tsx` 和 `salesDocumentPrint.ts` 中的重复函数，提取到公共 Utils 中。
2. **修复 UDI 打印 Bug**：修正 `BatchPrintDialog.tsx` 中的 `window.print()` 调用对象。
3. **统一打印单位**：将所有 `@page` 的 `margin` 和 `size` 统一为 `mm`，确保跨设备打印的一致性。
4. **字体依赖检查**：在 Dockerfile 或部署脚本中，确保包含中文字体的安装指令，防止 Puppeteer 渲染中文乱码。
5. **PDF 内存泄漏防范**：`usePrintTemplate.ts` 中使用了 `URL.createObjectURL`，虽然设置了 5 分钟后 `revokeObjectURL`，但在高频打印场景下仍可能占用较多内存，建议在弹窗关闭事件中主动释放 Blob URL。
