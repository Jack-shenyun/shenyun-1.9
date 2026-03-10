# 神韵医疗 ERP 字段字典

## 1. 说明

本文件用于统一系统表单字段含义、显示名称、是否必填、是否审批、是否参与联动。

字段使用原则：

- 页面显示名称必须使用中文
- 数据库字段名统一使用英文
- 同类字段在不同模块中必须复用同一命名
- 技术字段不得直接展示给业务用户

---

## 2. 通用字段字典

| 显示名称 | 字段名 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- | --- |
| 单号 | code / no / orderNo | string | 是 | 各类业务单主编号 |
| 状态 | status | string | 是 | 单据当前状态 |
| 发起人 | createdByName | string | 否 | 页面展示用 |
| 发起时间 | createdAt | datetime | 否 | 系统生成 |
| 更新时间 | updatedAt | datetime | 否 | 系统生成 |
| 备注 | remark / remarks | text | 否 | 业务说明 |
| 附件 | attachments | array | 否 | 文件路径数组 |
| 审批状态 | approvalStatus | string | 否 | 待审批/已审批等 |
| 当前审批人 | currentApproverName | string | 否 | 审批流展示 |
| 审批历史 | approvalHistory | array | 否 | 过程记录 |
| 所属部门 | department | string | 否 | 发起部门 |
| 币种 | currency | string | 否 | 原币种 |
| 汇率 | exchangeRate | number | 否 | 对本位币汇率 |

---

## 3. 销售部字段字典

### 3.1 客户管理

| 显示名称 | 字段名 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- | --- |
| 客户编码 | code | string | 是 | 如 KH-00001 |
| 客户名称 | name | string | 是 | 客户主名称 |
| 客户类型 | type | string | 是 | 国内/海外/经销商 |
| 状态 | status | string | 是 | 正常/停用/黑名单 |
| 联系人 | contactPerson | string | 是 | 联系人姓名 |
| 联系电话 | phone | string | 是 | 电话号码 |
| 电子邮箱 | email | string | 否 | 邮箱 |
| 国家 | country | string | 条件 | 海外客户使用 |
| 省份 | province | string | 条件 | 国内客户使用 |
| 城市 | city | string | 条件 | 国内客户使用 |
| 详细地址 | address | string | 否 | 地址 |
| 销售负责人 | salesPersonId | number | 是 | 用户设置中选择 |
| 付款条件 | paymentTerms | string | 是 | 预付款/先款后货/货到付款/账期支付 |
| 账期天数 | paymentDays | number | 条件 | 账期支付必填 |
| 是否开票 | needInvoice | boolean | 否 | 是否开票 |
| 税号 | taxNo | string | 否 | 税务信息 |
| 开户行 | bankName | string | 否 | 银行信息 |
| 银行账号 | bankAccount | string | 否 | 银行信息 |
| 客户商标 | logoUrl | string | 否 | 自动补充或空白 |

### 3.2 销售订单

| 显示名称 | 字段名 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- | --- |
| 订单号 | orderNo | string | 是 | 如 SO-YYYY-0001 |
| 客户 ID | customerId | number | 是 | 关联客户 |
| 客户编码 | customerCode | string | 否 | 自动带出 |
| 客户名称 | customerName | string | 是 | 自动带出 |
| 联系人 | contactPerson | string | 是 | 自动带出/可编辑 |
| 联系电话 | phone | string | 是 | 自动带出/可编辑 |
| 订单日期 | orderDate | date | 是 | 订单日期 |
| 交货日期 | deliveryDate | date | 是 | 交货日期 |
| 销售员 | salesperson | string | 否 | 默认当前销售 |
| 付款条件 | paymentTerms | string | 是 | 统一付款条件 |
| 预付比例 | prepaymentRatio | number | 条件 | 预付款时必填 |
| 结算货币 | currency | string | 是 | CNY/USD 等 |
| 汇率 | exchangeRate | number | 是 | 来源于财务汇率 |
| 收货地址 | shippingAddress | string | 是 | 收货地址 |
| 是否需要运费 | needsShipping | boolean | 是 | 是/否 |
| 运费金额 | shippingFee | number | 条件 | 需要运费时必填 |
| 是否报关 | isExport | boolean | 是 | 是/否 |
| 报关状态 | customsStatus | string | 否 | 待处理等 |
| 备注 | remarks | text | 否 | 普通备注 |

### 3.3 销售订单明细

| 显示名称 | 字段名 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- | --- |
| 产品 ID | productId | number | 是 | 关联产品 |
| 产品编码 | code | string | 是 | 自动带出 |
| 产品名称 | name | string | 是 | 自动带出 |
| 规格 | spec | string | 否 | 自动带出 |
| 单位 | unit | string | 是 | 自动带出 |
| 单价 | price | number | 是 | 必填 |
| 数量 | quantity | number | 是 | 必填 |
| 折扣 | discount | number | 否 | 默认 0 |
| 金额 | amount | number | 否 | 自动计算 |

### 3.4 对账单

| 显示名称 | 字段名 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- | --- |
| 对账单号 | reconcileNo | string | 是 | DZ-YYYY-0001 |
| 客户 | customerId | number | 是 | 账期客户 |
| 客户名称 | customerName | string | 是 | 自动带出 |
| 对账周期 | period | string | 是 | 月份或周期 |
| 对账日期 | reconciledDate | date | 是 | 对账日期 |
| 原应收金额 | originalAmount | number | 否 | 自动带出 |
| 对账金额 | reconcileAmount | number | 是 | 本次对账金额 |
| 调整后金额 | adjustedAmount | number | 是 | 调整后值 |
| 差异说明 | differenceReason | text | 是 | 调整原因 |
| 备注 | remarks | text | 否 | 说明 |

### 3.5 财务协同提交单

| 显示名称 | 字段名 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- | --- |
| 应收编号 | receivableNo | string | 是 | AR-SO-... |
| 订单号 | orderNo | string | 是 | 关联订单 |
| 客户名称 | customerName | string | 是 | 自动带出 |
| 订单金额 | orderAmount | number | 否 | 只读 |
| 已收金额 | receivedAmount | number | 否 | 只读 |
| 后续待收 | pendingAmount | number | 否 | 只读 |
| 本次提交金额 | submitAmount | number | 是 | 提交财务金额 |
| 收款方式 | paymentMethod | string | 是 | 银行转账等 |
| 收款日期 | receiptDate | date | 是 | 日期 |
| 备注 | remarks | text | 否 | 说明 |

### 3.6 报关单

| 显示名称 | 字段名 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- | --- |
| 报关编号 | declarationNo | string | 是 | BG-YYYY-0001 |
| 关联订单号 | orderNo | string | 是 | 销售订单号 |
| 客户名称 | customerName | string | 是 | 客户 |
| 产品名称 | productName | string | 是 | 产品 |
| 数量 | quantity | number | 是 | 数量 |
| 单位 | unit | string | 是 | 单位 |
| 币种 | currency | string | 是 | 货币 |
| 金额 | amount | number | 是 | 金额 |
| 目的地 | destination | string | 是 | 国家/地区 |
| 起运港 | portOfLoading | string | 否 | 港口 |
| 目的港 | portOfDischarge | string | 否 | 港口 |
| 运输方式 | shippingMethod | string | 是 | 海运/空运等 |
| HS 编码 | hsCode | string | 是 | HS 编码 |

---

## 4. 财务部字段字典

### 4.1 账户管理

| 显示名称 | 字段名 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- | --- |
| 账户编号 | accountCode | string | 是 | 账户唯一编号 |
| 账户名称 | accountName | string | 是 | 银行/用途名称 |
| 币种 | currency | string | 是 | CNY/USD 等 |
| 状态 | status | string | 是 | 启用/停用 |
| 银行账号 | bankAccount | string | 是 | 账号 |
| 开户行 | bankName | string | 否 | 开户行 |
| 行号/SWIFT | swiftCode | string | 否 | SWIFT |
| 地址 | address | string | 否 | 地址 |
| 期初金额 | openingBalance | number | 否 | 可编辑 |
| 累计收入 | totalIncome | number | 否 | 自动统计 |
| 累计支出 | totalExpense | number | 否 | 自动统计 |
| 结余 | balance | number | 否 | 自动统计 |

### 4.2 汇率管理

| 显示名称 | 字段名 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- | --- |
| 原币种 | baseCurrency | string | 是 | USD |
| 目标币种 | targetCurrency | string | 是 | CNY |
| 汇率 | rate | number | 是 | 如 7.18 |
| 生效日期 | effectiveDate | date | 是 | 生效日期 |
| 来源 | source | string | 否 | 手动/实时 |
| 状态 | status | string | 否 | 当前/历史 |

### 4.3 应收管理

| 显示名称 | 字段名 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- | --- |
| 应收编号 | invoiceNo | string | 是 | AR-YYYY-0001 |
| 订单号 | orderNo | string | 是 | 来源订单 |
| 客户名称 | customerName | string | 是 | 客户 |
| 应收金额 | amount | number | 是 | 原币种金额 |
| 已收金额 | receivedAmount | number | 否 | 累计已收 |
| 待收金额 | pendingAmount | number | 否 | 自动计算 |
| 到期日 | dueDate | date | 否 | 到期日 |
| 付款条件 | paymentMethod | string | 否 | 统一付款条件 |
| 状态 | status | string | 是 | 待收款等 |

### 4.4 报销管理

| 显示名称 | 字段名 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- | --- |
| 报销单号 | applyNo | string | 是 | BX-YYYY-0001 |
| 报销人 | applicant | string | 是 | 人员 |
| 所属部门 | department | string | 是 | 单选 |
| 申请日期 | applyDate | date | 是 | 日期 |
| 报销主题 | title | string | 是 | 自动生成也可调整 |
| 备注说明 | remark | text | 否 | 说明 |
| 财务备注 | financeRemark | text | 否 | 财务处理说明 |
| 总金额 | totalAmount | number | 否 | 自动汇总 |

### 4.5 报销明细

| 显示名称 | 字段名 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- | --- |
| 日期 | invoiceDate | date | 是 | 明细日期 |
| 费用类型 | description / feeType | string | 是 | 差旅/补贴等 |
| 发票类型 | invoiceType | string | 是 | 电子/专票等 |
| 税率 | taxRate | number | 否 | 税率 |
| 金额 | totalAmount | number | 是 | 金额 |
| 备注 | itemRemark | text | 否 | 明细备注 |
| 发票附件 | invoiceFile | file | 否 | 图片/PDF |

---

## 5. 采购部字段字典

### 5.1 供应商管理

| 显示名称 | 字段名 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- | --- |
| 供应商编号 | supplierCode | string | 是 | GYS-00001 |
| 供应商名称 | supplierName | string | 是 | 供应商名称 |
| 联系人 | contactPerson | string | 是 | 联系人 |
| 联系电话 | phone | string | 是 | 电话 |
| 地址 | address | string | 否 | 地址 |
| 付款条件 | paymentTerms | string | 是 | 统一付款条件 |
| 币种 | currency | string | 否 | 默认币种 |
| 税号 | taxNo | string | 否 | 税号 |
| 状态 | status | string | 是 | 状态 |

### 5.2 物料资料

| 显示名称 | 字段名 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- | --- |
| 物料编码 | materialCode | string | 是 | 主编码 |
| 物料名称 | materialName | string | 是 | 名称 |
| 规格型号 | specification | string | 是 | 规格 |
| 单位 | unit | string | 是 | 单位 |
| 默认供应商 | defaultSupplierId | number | 否 | 默认供应商 |
| 最近采购价 | lastPurchasePrice | number | 否 | 自动带出 |
| 安全库存 | safetyStock | number | 否 | 安全库存 |
| 是否灭菌 | isSterile | boolean | 否 | 医疗器械追溯字段 |
| 物料分类 | category | string | 是 | 采购件/自制件等 |
| 状态 | status | string | 否 | 状态 |

### 5.3 采购计划

| 显示名称 | 字段名 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- | --- |
| 采购计划号 | planNo | string | 是 | CGJH-YYYY-0001 |
| 来源类型 | sourceType | string | 否 | MRP/手工 |
| 来源单号 | sourceNo | string | 否 | 来源计划/工单 |
| 物料编码 | materialCode | string | 是 | 物料 |
| 物料名称 | materialName | string | 是 | 名称 |
| 规格 | specification | string | 否 | 规格 |
| 需求数量 | demandQty | number | 是 | 总需求 |
| 当前库存 | stockQty | number | 否 | 实时库存 |
| 净需求 | netDemandQty | number | 否 | 自动计算 |
| 建议供应商 | suggestedSupplierId | number | 否 | 推荐供应商 |
| 建议单价 | suggestedPrice | number | 否 | 最近价格 |
| 需求日期 | needDate | date | 否 | 需求日期 |
| 紧急程度 | priority | string | 否 | 普通/紧急 |

### 5.4 采购申请

| 显示名称 | 字段名 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- | --- |
| 采购申请号 | requestNo | string | 是 | CGSQ-YYYY-0001 |
| 申请人 | applicant | string | 是 | 发起人 |
| 所属部门 | department | string | 是 | 部门 |
| 申请日期 | applyDate | date | 是 | 日期 |
| 紧急程度 | priority | string | 否 | 优先级 |
| 申请原因 | reason | text | 否 | 原因 |

### 5.5 采购申请明细

| 显示名称 | 字段名 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- | --- |
| 物料编码 | materialCode | string | 是 | 弹窗选择 |
| 物料名称 | materialName | string | 是 | 自动带出 |
| 规格型号 | specification | string | 否 | 自动带出 |
| 数量 | quantity | number | 是 | 需求数量 |
| 单位 | unit | string | 是 | 单位 |
| 预估单价 | estimatedPrice | number | 否 | 最近价格 |
| 建议供应商 | supplierId | number | 否 | 弹窗选择 |
| 备注 | itemRemark | text | 否 | 行备注 |

### 5.6 采购订单

| 显示名称 | 字段名 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- | --- |
| 采购订单号 | orderNo | string | 是 | PO-YYYY-0001 |
| 供应商 | supplierId | number | 是 | 弹窗选择 |
| 货币 | currency | string | 否 | 币种 |
| 下单日期 | orderDate | date | 是 | 日期 |
| 交货日期 | deliveryDate | date | 是 | 日期 |
| 采购状态 | status | string | 是 | 草稿等 |

---

## 6. 生产部字段字典

### 6.1 生产计划

| 显示名称 | 字段名 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- | --- |
| 计划编号 | planNo | string | 是 | PP-YYYYMMDD-0001 |
| 来源订单号 | sourceOrderNo | string | 是 | 销售订单 |
| 产品名称 | productName | string | 是 | 产品 |
| 计划数量 | planQty | number | 是 | 数量 |
| 单位 | unit | string | 是 | 单位 |
| 计划开工日期 | startDate | date | 是 | 开工日期 |
| 计划完工日期 | endDate | date | 是 | 完工日期 |
| 优先级 | priority | string | 否 | 普通/紧急 |

### 6.2 生产工单

| 显示名称 | 字段名 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- | --- |
| 工单编号 | workOrderNo | string | 是 | MO-YYYY-0001 |
| 来源计划号 | planNo | string | 是 | 计划号 |
| 产品编码 | productCode | string | 是 | 产品编码 |
| 产品名称 | productName | string | 是 | 名称 |
| 规格型号 | specification | string | 否 | 规格 |
| 工单数量 | quantity | number | 是 | 数量 |
| 开工日期 | startDate | date | 否 | 开工 |
| 计划完工日期 | finishDate | date | 否 | 完工 |
| 当前工序 | currentProcess | string | 否 | 工序 |

### 6.3 生产领料单

| 显示名称 | 字段名 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- | --- |
| 领料单号 | requisitionNo | string | 是 | LL-YYYY-0001 |
| 来源工单号 | workOrderNo | string | 是 | 工单 |
| 领料日期 | issueDate | date | 是 | 日期 |
| 领料部门 | department | string | 是 | 生产部 |
| 领料人 | applicant | string | 是 | 人员 |

### 6.4 生产入库单

| 显示名称 | 字段名 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- | --- |
| 入库单号 | entryNo | string | 是 | RK-YYYY-0001 |
| 来源工单号 | workOrderNo | string | 是 | 工单 |
| 产品编码 | productCode | string | 是 | 产品编码 |
| 产品名称 | productName | string | 是 | 产品名称 |
| 生产批号 | batchNo | string | 否 | 批号 |
| 灭菌批号 | sterilizationBatchNo | string | 条件 | 医疗器械必需 |
| 入库数量 | quantity | number | 是 | 合格数量 |
| 目标仓库 | warehouseName | string | 是 | 目标仓 |
| 入库日期 | entryDate | date | 是 | 日期 |

---

## 7. 质量部字段字典

### 7.1 来料检验单

| 显示名称 | 字段名 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- | --- |
| 检验编号 | inspectionNo | string | 是 | IQC-YYYY-0001 |
| 关联到货单 | relatedInboundNo | string | 是 | 来源到货 |
| 产品名称 | productName | string | 是 | 名称 |
| 规格型号 | specification | string | 否 | 规格 |
| 供应商 | supplierName | string | 否 | 供应商 |
| 批次号 | batchNo | string | 否 | 批次 |
| 到货数量 | arrivalQty | number | 是 | 到货数量 |
| 单位 | unit | string | 否 | 单位 |
| 抽样数量 | sampleQty | number | 是 | 抽样数量 |
| 检验日期 | inspectionDate | date | 是 | 日期 |
| 检验员 | inspector | string | 是 | 检验员 |
| 填报方式 | reportMethod | string | 否 | 线上填写等 |
| 灭菌批号 | sterilizationBatchNo | string | 条件 | 医疗器械使用 |
| 合格数量 | qualifiedQty | number | 否 | 自动计算 |
| 不合格数量 | rejectedQty | number | 否 | 自动计算 |

### 7.2 成品检验单

| 显示名称 | 字段名 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- | --- |
| 成品检验编号 | inspectionNo | string | 是 | FQC-YYYY-0001 |
| 工单号 | workOrderNo | string | 是 | 来源工单 |
| 产品名称 | productName | string | 是 | 产品名称 |
| 生产批号 | batchNo | string | 否 | 批号 |
| 灭菌批号 | sterilizationBatchNo | string | 条件 | 灭菌产品 |
| 完工数量 | finishQty | number | 是 | 完工数量 |
| 抽样数量 | sampleQty | number | 是 | 抽样数量 |
| 合格数量 | qualifiedQty | number | 否 | 自动计算 |
| 不合格数量 | rejectedQty | number | 否 | 自动计算 |
| 检验结论 | result | string | 是 | 合格/不合格 |
| 放行结论 | releaseResult | string | 否 | 放行结论 |

---

## 8. 仓库管理字段字典

### 8.1 入库单

| 显示名称 | 字段名 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- | --- |
| 入库单号 | entryNo | string | 是 | IN-YYYY-0001 |
| 入库类型 | entryType | string | 是 | 采购/生产/退货 |
| 物料名称 | materialName | string | 是 | 名称 |
| 批次号 | batchNo | string | 否 | 批次 |
| 数量 | quantity | number | 是 | 入库数量 |
| 单位 | unit | string | 是 | 单位 |
| 目标仓库 | warehouseName | string | 是 | 仓库 |
| 入库时间 | entryDate | datetime | 是 | 时间 |

### 8.2 出库单

| 显示名称 | 字段名 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- | --- |
| 出库单号 | outNo | string | 是 | OUT-YYYY-0001 |
| 出库类型 | outType | string | 是 | 领料/发货/调拨 |
| 物料名称 | materialName | string | 是 | 名称 |
| 数量 | quantity | number | 是 | 出库数量 |
| 单位 | unit | string | 是 | 单位 |
| 仓库 | warehouseName | string | 是 | 仓库 |
| 出库时间 | outDate | datetime | 是 | 时间 |

### 8.3 库存记录

| 显示名称 | 字段名 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- | --- |
| 物料编码 | materialCode | string | 是 | 物料 |
| 物料名称 | materialName | string | 是 | 名称 |
| 规格 | specification | string | 否 | 规格 |
| 仓库 | warehouseName | string | 是 | 仓库 |
| 库位 | location | string | 否 | 库位 |
| 当前库存 | currentQty | number | 否 | 实时库存 |
| 安全库存 | safetyStock | number | 否 | 安全库存 |
| 状态 | status | string | 否 | 合格/不合格 |

---

## 9. 系统设置字段字典

### 9.1 部门设置

| 显示名称 | 字段名 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- | --- |
| 部门名称 | name | string | 是 | 部门名 |
| 部门负责人 | managerUserId | number | 是 | 用户设置中选 |
| 部门成员 | memberUserIds | array | 否 | 多选 |
| 状态 | status | string | 是 | 启用/停用 |
| 备注 | remark | text | 否 | 备注 |

### 9.2 用户设置

| 显示名称 | 字段名 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- | --- |
| 姓名 | fullName | string | 是 | 用户姓名 |
| 用户名 | username | string | 是 | 可修改 |
| 所属部门 | departments | array | 是 | 多部门 |
| 角色 | role | string | 是 | 管理员/普通用户 |
| 状态 | status | string | 是 | 正常/停用 |
| 微信绑定 | wechatStatus | string | 否 | 已绑定/未绑定 |
| 最后登录 | lastLoginAt | datetime | 否 | 最后登录时间 |
| 可显示应用 | visibleApps | array | 否 | 首页应用权限 |

### 9.3 公司信息

| 显示名称 | 字段名 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- | --- |
| 商标 | logoUrl | string | 否 | 抬头商标 |
| 公司中文名称 | companyNameCn | string | 是 | 中文名 |
| 公司英文名称 | companyNameEn | string | 否 | 英文名 |
| 中文地址 | addressCn | string | 否 | 中文地址 |
| 英文地址 | addressEn | string | 否 | 英文地址 |
| 网站 | website | string | 否 | 官网 |
| 邮箱 | email | string | 否 | 邮箱 |
| 联系人 | contactName | string | 否 | 联系人 |
| 电话 | phone | string | 否 | 电话 |
| WhatsApp | whatsapp | string | 否 | WhatsApp |

---

## 10. 统一禁止直接展示字段

以下字段默认禁止直接展示到业务页面：

- id
- createdBy
- updatedBy
- deletedAt
- rawJson
- meta
- internalStatus
- syncFlag
- sourceMarker
- remarkMarker

如业务确需展示，必须先做业务中文转义。
