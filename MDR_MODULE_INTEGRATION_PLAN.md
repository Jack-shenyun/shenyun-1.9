# MDR 法规事务模块集成方案

**版本**: 1.0
**作者**: Manus AI

## 1. 概述

本文档为在您现有的 `gtp-erp` 项目中，无缝集成一个全新的、功能强大的 **“法规事务 (Regulatory Affairs)”** 模块，提供一份详细、可执行的技术蓝图。方案遵循您项目已有的全栈TypeScript、tRPC、Drizzle ORM 和 React 的现代化架构，确保新模块在技术上和风格上与现有系统保持高度一致。

我们的核心目标是：**直接在ERP内，构建我们共同构想的“智能法规文档工作站”，实现以产品项目为核心，所有MDR文档模板化、内容块化、实时联动和AI赋能。**

## 2. 总体集成策略

我们将采用“原生模块”的方式进行集成，具体步骤如下：

1.  **创建导航入口**：在左侧主菜单和工作台添加“法规事务部”入口。
2.  **扩展数据库**：在 `drizzle/schema.ts` 中添加新的数据表，用于存储法规文档、内容块和版本等信息。
3.  **构建后端API**：通过 tRPC 创建新的后端路由，负责新模块的所有数据交互。
4.  **搭建前端页面**：在 `client/src/pages/` 目录下创建新模块的核心页面框架。

以下是每个步骤的具体实施细节。

## 3. 板块建立：详细技术步骤

### 3.1. 导航与菜单集成 (Navigation & Menu Integration)

第一步是在用户界面上为新模块创建一个家。

1.  **添加工作台入口**：
    *   **文件**: `client/src/constants/workbenchApps.ts`
    *   **操作**: 在 `WORKBENCH_APP_ENTRIES` 数组中，仿照“研发部”、“质量部”等，添加一个新的对象：

        ```typescript
        {
          id: "ra", // ra for Regulatory Affairs
          menuId: "ra",
          label: "法规事务部",
          path: "/ra/dashboard", // 默认进入仪表盘
          icon: ShieldCheck, // 或其他合适的 Lucide 图标
          color: "from-purple-500 to-violet-600"
        },
        ```

2.  **添加侧边栏菜单**：
    *   **文件**: `client/src/components/ERPLayout.tsx`
    *   **操作**: 在 `menuConfig` 数组中，添加一个新的顶级菜单项，并定义其子菜单，即我们规划的四大板块。

        ```typescript
        // ... 在 "研发部" 或其他模块旁边
        {
          id: "ra",
          icon: ShieldCheck, // 使用与工作台一致的图标
          label: "法规事务部",
          children: [
            { icon: LayoutDashboard, label: "法规仪表盘", path: "/ra/dashboard" },
            { icon: FolderKanban, label: "MDR文档中心", path: "/ra/document-hub" },
            { icon: Library, label: "内容块库", path: "/ra/library" },
            { icon: Settings2, label: "后台管理", path: "/ra/admin", adminOnly: true },
          ],
        },
        ```

### 3.2. 数据库表结构设计 (Database Schema Design)

这是新模块的基石。我们将在 `drizzle/schema.ts` 文件中添加以下核心数据表。

```typescript
// ==================== 法规事务模块 (Regulatory Affairs) ====================

/**
 * 法规项目表
 * 用于管理每一个独立的法规申报项目，例如一个产品的首次CE认证或变更申报
 */
export const raProjects = mysqlTable("ra_projects", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(), // e.g., "SY-CE02 首次MDR认证项目"
  productId: int("productId").notNull(), // 关联到 products 表
  market: mysqlEnum("market", ["EU_MDR", "US_FDA", "CN_NMPA"]).notNull(),
  status: varchar("status", { length: 50 }).default("planning"), // e.g., planning, in_progress, submitted, approved
  ownerId: int("ownerId"), // 负责人
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

/**
 * 内容块表 (核心)
 * 存储所有可复用的“乐高积木”，如段落、表格、图片
 */
export const raContentBlocks = mysqlTable("ra_content_blocks", {
  id: int("id").autoincrement().primaryKey(),
  type: mysqlEnum("type", ["atomic", "compound"]).notNull(), // 颗粒度类型
  contentType: varchar("contentType", { length: 50 }).notNull(), // e.g., paragraph, table, image
  currentVersion: int("currentVersion").default(1),
  status: varchar("status", { length: 50 }).default("draft"), // draft, in_review, approved, obsolete
  tags: json("tags"), // 存储元数据标签, e.g., { topic: 'intended_use', product: 'SY-CE02' }
  createdBy: int("createdBy"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

/**
 * 内容块版本表
 * 存储每个内容块的每一次变更历史
 */
export const raBlockVersions = mysqlTable("ra_block_versions", {
  id: int("id").autoincrement().primaryKey(),
  blockId: int("blockId").notNull(), // 关联到 raContentBlocks
  version: int("version").notNull(),
  content: text("content").notNull(), // 实际内容 (可以是富文本HTML或Markdown)
  comment: varchar("comment", { length: 255 }), // 版本变更说明
  authorId: int("authorId"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

/**
 * 文档-内容关联表
 * 定义了“文档模板”是如何由“内容块”组装起来的
 */
export const raDocumentContentLinks = mysqlTable("ra_document_content_links", {
  id: int("id").autoincrement().primaryKey(),
  projectId: int("projectId").notNull(), // 关联到 raProjects
  documentTemplateId: varchar("documentTemplateId", { length: 50 }).notNull(), // e.g., "EU-TD-01"
  blockId: int("blockId").notNull(), // 关联到 raContentBlocks
  displayOrder: int("displayOrder").notNull(), // 内容块在文档中的显示顺序
});
```

### 3.3. 后端 API 路由设计 (Backend API Design)

我们将创建一个新的 tRPC 路由文件来处理新模块的所有业务逻辑。

1.  **创建路由文件**: `server/ra_router.ts`
2.  **定义核心API**: 在此文件中，我们将使用您现有的 tRPC 和 Drizzle 模式，创建用于增删改查（CRUD）上述新表的函数。例如：

    ```typescript
    // server/ra_router.ts
    import { createTRPCRouter, protectedProcedure } from "./_core/trpc";
    import { db } from "./db";
    import { raProjects, raContentBlocks /* ... etc */ } from "../drizzle/schema";

    export const raRouter = createTRPCRouter({
      // 获取所有法规项目
      listProjects: protectedProcedure.query(async () => {
        return await db.select().from(raProjects);
      }),

      // 获取单个文档的内容（通过组装内容块）
      getDocumentContent: protectedProcedure
        .input(z.object({ projectId: z.number(), documentId: z.string() }))
        .query(async ({ input }) => {
          // ... 此处编写逻辑，联结查询 raDocumentContentLinks 和 raBlockVersions
          // ... 返回一个有序的内容块列表
        }),

      // 更新一个内容块
      updateContentBlock: protectedProcedure
        .input(/* Zod schema for block content */)
        .mutation(async ({ input }) => {
          // ... 此处编写逻辑，创建新的 raBlockVersions 记录，并可能更新 raContentBlocks 的状态
        }),
      
      // ... 其他所有需要的API
    });
    ```

3.  **集成主路由**: 在 `server/routers.ts` 中，导入并合并 `raRouter`。

### 3.4. 前端页面框架搭建 (Frontend Page Scaffolding)

最后，我们来创建用户能直接看到的页面框架。

1.  **创建新目录**: `client/src/pages/ra`
2.  **创建页面文件**: 在上述目录中，创建我们四大板块对应的React组件文件：
    *   `Dashboard.tsx`
    *   `DocumentHub.tsx`
    *   `ContentBlockLibrary.tsx`
    *   `AdminConsole.tsx`
3.  **编写页面骨架**: 每个页面都将使用您项目中的 `ModulePage` 组件或类似的布局，来保持UI风格的统一。例如，`Dashboard.tsx` 会包含图表和列表，而 `DocumentHub.tsx` 则会包含我们设计的“文档结构树 + 内容编辑区”的复杂布局。
4.  **添加路由**: 在 `client/src/App.tsx` 的 `<Switch>` 组件中，为新页面添加路由规则。

    ```typescript
    // client/src/App.tsx
    // ...
    {/* 法规事务部 */}
    <Route path="/ra/dashboard" component={RADashboardPage} />
    <Route path="/ra/document-hub" component={RADocumentHubPage} />
    <Route path="/ra/library" component={RALibraryPage} />
    <Route path="/ra/admin" component={RAAdminPage} />
    // ...
    ```

## 4. 下一步：内容调整

至此，我们已经将所有“板块”的“脚手架”都搭建完毕了。整个系统已经知道了“法规事务部”的存在，有了存放其数据的“仓库”，处理其业务的“大脑”，以及展示其信息的“窗口”。

接下来，我们就可以完全按照您的节奏，**“一个个的内容进行调整”**。我们可以从 `DocumentHub.tsx` 页面开始，聚焦于第一个MDR文档模板 `EU-TD-01: 器械描述和规范`，利用您已有的审核文件，开始进行内容块的拆分、填充和AI功能的开发。
