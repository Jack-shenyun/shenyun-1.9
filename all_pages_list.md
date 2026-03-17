# 系统页面完整清单

> 共 **113 个路由页面**，其中 **业务表单页面 83 个**，**纯展示/工具/设置页面 30 个**。
> "有表单" = 页面内包含新增、编辑、提交等业务操作表单。

---

## 一、销售部（7 个）

| # | 页面名称 | 路由 | 有表单 |
|---|---|---|---|
| 1 | 客户管理 | `/sales/customers` | ✅ |
| 2 | 销售报价单 | `/sales/quotes` | ✅ |
| 3 | 销售订单 | `/sales/orders` | ✅ |
| 4 | 报关管理 | `/sales/customs` | ✅ |
| 5 | HS 编码管理 | `/sales/hs-codes` | ✅ |
| 6 | 客户对账 | `/sales/reconciliation` | ✅ |
| 7 | 销售财务协作 | `/sales/finance-collaboration` | — 纯展示 |

---

## 二、采购部（8 个）

| # | 页面名称 | 路由 | 有表单 |
|---|---|---|---|
| 8 | 供应商管理 | `/purchase/suppliers` | ✅ |
| 9 | 供应商档案 | `/purchase/supplier-profiles` | ✅ |
| 10 | 采购订单 | `/purchase/orders` | ✅ |
| 11 | 采购财务 | `/purchase/finance` | — 纯展示 |
| 12 | 采购对账 | `/purchase/reconciliation` | ✅ |
| 13 | 采购计划看板 | `/purchase/plan` | ✅ |
| 14 | 物料申请 | `/purchase/requests` | ✅ |
| 15 | 到货单 | `/purchase/goods-receipt` | ✅ |

---

## 三、仓储部（5 个）

| # | 页面名称 | 路由 | 有表单 |
|---|---|---|---|
| 16 | 仓库管理 | `/warehouse/warehouses` | ✅ |
| 17 | 入库单 | `/warehouse/inbound` | ✅ |
| 18 | 出库单 | `/warehouse/outbound` | ✅ |
| 19 | 库存台账 | `/warehouse/inventory` | ✅ |
| 20 | 盘点单 | `/warehouse/stocktake` | ✅ |

---

## 四、生产部（22 个）

| # | 页面名称 | 路由 | 有表单 |
|---|---|---|---|
| 21 | 生产订单 | `/production/orders` | ✅ |
| 22 | 生产计划看板 | `/production/plan-board` | ✅ |
| 23 | 物料申请单 | `/production/material-requisition` | ✅ |
| 24 | 暂存区库存 | `/production/staging-area` | ✅ |
| 25 | 生产记录 | `/production/records` | ✅ |
| 26 | 生产流转卡 | `/production/routing-cards` | ✅ |
| 27 | 委外灭菌单 | `/production/sterilization` | ✅ |
| 28 | 生产入库 | `/production/warehouse-entry` | ✅ |
| 29 | BOM 管理 | `/production/bom` | ✅ |
| 30 | MRP 计划 | `/production/mrp` | ✅ |
| 31 | UDI 管理 | `/production/udi` | ✅ |
| 32 | 大包装记录 | `/production/large-packaging` | ✅ |
| 33 | 待报废记录 | `/production/pending-scrap-records` | ✅ |
| 34 | 批次审核记录 | `/production/batch-review-records` | ✅ |
| 35 | 设备管理 | `/production/equipment` | ✅ |
| 36 | 设备点检 | `/production/equipment-inspection` | ✅ |
| 37 | 设备维保 | `/production/equipment-maintenance` | ✅ |
| 38 | 清洁记录 | `/production/cleaning-records` | — 占位页面 |
| 39 | 消毒记录 | `/production/disinfection-records` | — 占位页面 |
| 40 | 生产环境记录 | `/production/environment` | ✅ |
| 41 | 工艺流程 | `/production/process` | ✅ |
| 42 | 批生产记录 | `/production/batch-records` | ✅ |

---

## 五、UDI 管理（4 个）

| # | 页面名称 | 路由 | 有表单 |
|---|---|---|---|
| 43 | UDI 档案 | `/production/udi/archive` | ✅ |
| 44 | 标签设计器 | `/production/udi/designer` | ✅ |
| 45 | 标签打印 | `/production/udi/print` | ✅ |
| 46 | UDI 报告 | `/production/udi/report` | ✅ |

---

## 六、质量部（9 个）

| # | 页面名称 | 路由 | 有表单 |
|---|---|---|---|
| 47 | 实验室检测 | `/quality/lab` | ✅ |
| 48 | 来料检验（IQC） | `/quality/iqc` | ✅ |
| 49 | IQC 移动端上传 | `/quality/iqc/mobile-upload` | ✅ |
| 50 | 过程检验（IPQC） | `/quality/ipqc` | ✅ |
| 51 | 成品检验（OQC） | `/quality/oqc` | ✅ |
| 52 | 放行记录 | `/quality/release-records` | ✅ |
| 53 | 样品管理 | `/quality/samples` | ✅ |
| 54 | 不合格品管理 | `/quality/incidents` | ✅ |
| 55 | 检验要求 | `/quality/inspection-requirements` | ✅ |

---

## 七、法规合规（RA）（8 个）

| # | 页面名称 | 路由 | 有表单 |
|---|---|---|---|
| 56 | RA 仪表盘 | `/ra/dashboard` | — 纯展示 |
| 57 | RA 项目管理 | `/ra/projects` | ✅ |
| 58 | RA 工作区 | `/ra/workspace/:id` | ✅ |
| 59 | RA 模板库 | `/ra/templates` | ✅ |
| 60 | EU MDR | `/ra/eu-mdr` | ✅ |
| 61 | US FDA | `/ra/us-fda` | ✅ |
| 62 | CN NMPA | `/ra/cn-nmpa` | ✅ |
| 63 | 法规放行记录 | `/ra/regulatory-release-records` | ✅ |

---

## 八、研发部（3 个）

| # | 页面名称 | 路由 | 有表单 |
|---|---|---|---|
| 64 | 产品管理 | `/rd/products` | ✅ |
| 65 | 研发项目 | `/rd/projects` | ✅ |
| 66 | 图纸管理 | `/rd/drawings` | ✅ |

---

## 九、财务部（12 个）

| # | 页面名称 | 路由 | 有表单 |
|---|---|---|---|
| 67 | 账务凭证 | `/finance/ledger` | ✅ |
| 68 | 应收账款 | `/finance/receivable` | ✅ |
| 69 | 应付账款 | `/finance/payable` | ✅ |
| 70 | 银行账户 | `/finance/accounts` | ✅ |
| 71 | 成本管理 | `/finance/cost` | ✅ |
| 72 | 工资管理 | `/finance/salaries` | ✅ |
| 73 | 财务报表 | `/finance/reports` | ✅ |
| 74 | 印章管理 | `/finance/seals` | ✅ |
| 75 | 收票/开票 | `/finance/invoice` | ✅ |
| 76 | 费用报销单 | `/finance/reimbursement` | ✅ |
| 77 | 费用管理 | `/finance/expense-management` | ✅ |

---

## 十、行政部（9 个）

| # | 页面名称 | 路由 | 有表单 |
|---|---|---|---|
| 78 | 文件管理 | `/admin/documents` | ✅ |
| 79 | 文件柜 | `/admin/file-manager` | ✅ |
| 80 | 人事管理 | `/admin/personnel` | ✅ |
| 81 | 培训记录 | `/admin/training` | ✅ |
| 82 | 审计记录 | `/admin/audit` | ✅ |
| 83 | 费用申请 | `/admin/expense` | ✅ |
| 84 | 加班申请 | `/admin/overtime` | ✅ |
| 85 | 请假申请 | `/admin/leave` | ✅ |
| 86 | 外出申请 | `/admin/outing` | ✅ |

---

## 十一、招商部（6 个）

| # | 页面名称 | 路由 | 有表单 |
|---|---|---|---|
| 87 | 经销商管理 | `/investment/dealer` | ✅ |
| 88 | 授权书管理 | `/investment/authorization` | — 占位页面 |
| 89 | 协议管理 | `/investment/agreement` | — 占位页面 |
| 90 | 平台管理 | `/investment/platform` | ✅ |
| 91 | 平台挂网 | `/investment/listing` | ✅ |
| 92 | 医院管理 | `/investment/hospital` | ✅ |

---

## 十二、系统设置（11 个）

| # | 页面名称 | 路由 | 有表单 |
|---|---|---|---|
| 93 | 公司信息 | `/settings/company` | ✅ |
| 94 | 部门管理 | `/settings/departments` | ✅ |
| 95 | 编码规则 | `/settings/codes` | ✅ |
| 96 | 用户管理 | `/settings/users` | ✅ |
| 97 | 工作流设置 | `/settings/workflows` | ✅ |
| 98 | 语言设置 | `/settings/language` | ✅ |
| 99 | 操作日志 | `/settings/audit-trail` | — 纯查询 |
| 100 | 回收站 | `/settings/recycle-bin` | — 纯查询 |
| 101 | 邮件设置 | `/settings/email` | ✅ |
| 102 | 电子签名 | `/settings/signature` | ✅ |
| 103 | 打印模板 | `/settings/print-templates` | ✅ |

---

## 十三、其他功能（10 个）

| # | 页面名称 | 路由 | 有表单 |
|---|---|---|---|
| 104 | 首页仪表盘 | `/` | — 纯展示 |
| 105 | 老板看板 | `/boss/dashboard` | — 纯展示 |
| 106 | 工作流中心 | `/workflow/center` | ✅ |
| 107 | 邮件 | `/mail` | ✅ |
| 108 | 商机管理 | `/prospect` | ✅ |
| 109 | WhatsApp | `/whatsapp` | ✅ |
| 110 | 国内线索 | `/leads/domestic` | ✅ |
| 111 | 海外线索 | `/leads/overseas` | ✅ |
| 112 | 官网管理 | `/website` | ✅ |
| 113 | CE 文档工作区（演示） | `/demo/ce-workspace` | ✅ |

---

## 汇总

| 分类 | 页面数 | 有表单 | 纯展示/占位 |
|---|---|---|---|
| 销售部 | 7 | 6 | 1 |
| 采购部 | 8 | 7 | 1 |
| 仓储部 | 5 | 5 | 0 |
| 生产部 | 22 | 20 | 2 |
| UDI 管理 | 4 | 4 | 0 |
| 质量部 | 9 | 9 | 0 |
| 法规合规（RA） | 8 | 7 | 1 |
| 研发部 | 3 | 3 | 0 |
| 财务部 | 11 | 11 | 0 |
| 行政部 | 9 | 9 | 0 |
| 招商部 | 6 | 4 | 2 |
| 系统设置 | 11 | 9 | 2 |
| 其他功能 | 10 | 8 | 2 |
| **合计** | **113** | **102** | **11** |
