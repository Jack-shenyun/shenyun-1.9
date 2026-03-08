import { formatDate } from "@/lib/formatters";
import { useState } from "react";
import { trpc } from "@/lib/trpc";
import ERPLayout from "@/components/ERPLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Accordion, AccordionContent, AccordionItem, AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import {
  Search, FileText, ChevronRight, Package, FlaskConical, Warehouse,
  ShoppingCart, Banknote, Flame, ClipboardList, ArrowRightLeft,
  CheckCircle2, XCircle, AlertCircle, Clock, Thermometer, Wrench,
} from "lucide-react";
import { toast } from "sonner";

// ========== 状态标签映射 ==========
const productionStatusMap: Record<string, { label: string; color: string }> = {
  draft:       { label: "草稿",   color: "bg-gray-100 text-gray-600" },
  planned:     { label: "已计划", color: "bg-blue-100 text-blue-700" },
  in_progress: { label: "生产中", color: "bg-yellow-100 text-yellow-700" },
  completed:   { label: "已完成", color: "bg-green-100 text-green-700" },
  cancelled:   { label: "已取消", color: "bg-red-100 text-red-600" },
};

const sterilizationStatusMap: Record<string, { label: string; color: string }> = {
  draft:       { label: "草稿",   color: "bg-gray-100 text-gray-600" },
  sent:        { label: "已发出", color: "bg-blue-100 text-blue-700" },
  processing:  { label: "灭菌中", color: "bg-yellow-100 text-yellow-700" },
  arrived:     { label: "已到货", color: "bg-purple-100 text-purple-700" },
  returned:    { label: "已返回", color: "bg-indigo-100 text-indigo-700" },
  qualified:   { label: "合格",   color: "bg-green-100 text-green-700" },
  unqualified: { label: "不合格", color: "bg-red-100 text-red-600" },
};

const inspectionResultMap: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  qualified:   { label: "合格",   color: "bg-green-100 text-green-700", icon: <CheckCircle2 className="h-3.5 w-3.5" /> },
  unqualified: { label: "不合格", color: "bg-red-100 text-red-600",     icon: <XCircle className="h-3.5 w-3.5" /> },
  conditional: { label: "有条件", color: "bg-yellow-100 text-yellow-700", icon: <AlertCircle className="h-3.5 w-3.5" /> },
};

const warehouseEntryStatusMap: Record<string, { label: string; color: string }> = {
  draft:    { label: "草稿",   color: "bg-gray-100 text-gray-600" },
  pending:  { label: "待审批", color: "bg-yellow-100 text-yellow-700" },
  approved: { label: "已审批", color: "bg-blue-100 text-blue-700" },
  completed:{ label: "已入库", color: "bg-green-100 text-green-700" },
  rejected: { label: "已驳回", color: "bg-red-100 text-red-600" },
};

const recordTypeMap: Record<string, { label: string; icon: React.ReactNode }> = {
  general:             { label: "通用记录",   icon: <ClipboardList className="h-4 w-4" /> },
  temperature_humidity:{ label: "温湿度记录", icon: <Thermometer className="h-4 w-4" /> },
  material_usage:      { label: "材料使用",   icon: <Package className="h-4 w-4" /> },
  clean_room:          { label: "清场记录",   icon: <Wrench className="h-4 w-4" /> },
  first_piece:         { label: "首件检验",   icon: <FlaskConical className="h-4 w-4" /> },
};

function StatusBadge({ status, map }: { status: string; map: Record<string, { label: string; color: string }> }) {
  const s = map[status] ?? { label: status, color: "bg-gray-100 text-gray-600" };
  return <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${s.color}`}>{s.label}</span>;
}

function InfoRow({ label, value }: { label: string; value?: string | number | null }) {
  return (
    <div className="flex gap-2 text-sm">
      <span className="text-muted-foreground w-28 shrink-0">{label}</span>
      <span className="font-medium">{value ?? "-"}</span>
    </div>
  );
}

function SectionHeader({ icon, title, count }: { icon: React.ReactNode; title: string; count?: number }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-muted-foreground">{icon}</span>
      <span className="font-semibold">{title}</span>
      {count !== undefined && (
        <Badge variant="secondary" className="ml-1 text-xs">{count}</Badge>
      )}
    </div>
  );
}

// ========== 批记录详情弹窗 ==========
function BatchRecordDetail({ batchNo, open, onClose }: { batchNo: string; open: boolean; onClose: () => void }) {
  const { data, isLoading, error } = trpc.batchRecord.getByBatchNo.useQuery(
    { batchNo },
    { enabled: open && !!batchNo }
  );
  const { data: productsData = [] } = trpc.products.list.useQuery();
  const getProductName = (productId?: number | null) => {
    if (!productId) return "-";
    const p = (productsData as any[]).find((p: any) => p.id === productId);
    return p?.name || `产品#${productId}`;
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            批记录详情
            <span className="font-mono text-primary ml-2">{batchNo}</span>
          </DialogTitle>
          <DialogDescription>以生产批号为主线的全链路追溯记录（只读）</DialogDescription>
        </DialogHeader>

        {isLoading && (
          <div className="flex items-center justify-center py-12 text-muted-foreground">
            <Clock className="h-5 w-5 mr-2 animate-spin" />加载中...
          </div>
        )}
        {error && (
          <div className="flex items-center justify-center py-12 text-destructive">
            <XCircle className="h-5 w-5 mr-2" />加载失败：{error.message}
          </div>
        )}

        {data && (
          <Accordion type="multiple" defaultValue={["production", "quality", "warehouse", "sales", "finance"]} className="space-y-2">

            {/* ===== 生产板块 ===== */}
            <AccordionItem value="production" className="border rounded-lg px-4">
              <AccordionTrigger className="hover:no-underline">
                <SectionHeader
                  icon={<Package className="h-4 w-4" />}
                  title="生产板块"
                  count={
                    (data.production.order ? 1 : 0) +
                    data.production.records.length +
                    data.production.routingCards.length +
                    data.production.sterilizationOrders.length
                  }
                />
              </AccordionTrigger>
              <AccordionContent className="space-y-4 pt-2">
                {/* 生产指令 */}
                {data.production.order && (
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">生产指令</p>
                    <div className="grid grid-cols-2 gap-x-8 gap-y-1.5 bg-muted/30 rounded p-3">
                      <InfoRow label="指令单号" value={data.production.order.orderNo} />
                      <InfoRow label="产品名称" value={getProductName(data.production.order.productId)} />
                      <InfoRow label="生产批号" value={data.production.order.batchNo} />
                      <InfoRow label="计划数量" value={`${data.production.order.plannedQty} ${data.production.order.unit || ''}`} />
                      <InfoRow label="完成数量" value={`${data.production.order.completedQty || 0} ${data.production.order.unit || ''}`} />
                      <InfoRow label="生产日期" value={data.production.order.productionDate ? String(data.production.order.productionDate).slice(0, 10) : undefined} />
                      <InfoRow label="有效期至" value={data.production.order.expiryDate ? String(data.production.order.expiryDate).slice(0, 10) : undefined} />
                      <InfoRow label="计划开始" value={data.production.order.plannedStartDate ? String(data.production.order.plannedStartDate).slice(0, 10) : undefined} />
                      <InfoRow label="状态" value={productionStatusMap[data.production.order.status]?.label || data.production.order.status} />
                    </div>
                  </div>
                )}

                {/* 生产记录 */}
                {data.production.records.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                      生产记录 <span className="text-primary">({data.production.records.length})</span>
                    </p>
                    <div className="space-y-2">
                      {data.production.records.map((rec: any) => (
                        <div key={rec.id} className="border rounded p-3 text-sm">
                          <div className="flex items-center gap-2 mb-2">
                            {recordTypeMap[rec.recordType]?.icon}
                            <span className="font-medium">{recordTypeMap[rec.recordType]?.label || rec.recordType}</span>
                            <span className="text-muted-foreground text-xs ml-auto">{rec.recordDate ? String(rec.recordDate).slice(0, 10) : "-"}</span>
                          </div>
                          <div className="grid grid-cols-2 gap-x-6 gap-y-1">
                            {rec.workstationName && <InfoRow label="工序/工位" value={rec.workstationName} />}
                            {rec.processName && <InfoRow label="工序名称" value={rec.processName} />}
                            {rec.operator && <InfoRow label="操作人" value={rec.operator} />}
                            {rec.actualQty != null && <InfoRow label="实际数量" value={`${rec.actualQty} ${rec.unit || ''}`} />}
                            {rec.scrapQty != null && Number(rec.scrapQty) > 0 && <InfoRow label="报废数量" value={`${rec.scrapQty} ${rec.unit || ''}`} />}
                            {/* 温湿度 */}
                            {rec.recordType === 'temperature_humidity' && (
                              <>
                                {rec.temperature != null && <InfoRow label="温度(℃)" value={`${rec.temperature} / 限值: ${rec.temperatureLimit || '-'}`} />}
                                {rec.humidity != null && <InfoRow label="湿度(%)" value={`${rec.humidity} / 限值: ${rec.humidityLimit || '-'}`} />}
                                {rec.cleanlinessLevel && <InfoRow label="洁净级别" value={rec.cleanlinessLevel} />}
                                {rec.pressureDiff != null && <InfoRow label="压差(Pa)" value={String(rec.pressureDiff)} />}
                              </>
                            )}
                            {/* 材料使用 */}
                            {rec.recordType === 'material_usage' && (
                              <>
                                {rec.materialName && <InfoRow label="材料名称" value={rec.materialName} />}
                                {rec.materialBatchNo && <InfoRow label="材料批号" value={rec.materialBatchNo} />}
                                {rec.issuedQty != null && <InfoRow label="领用数量" value={`${rec.issuedQty} ${rec.usedUnit || ''}`} />}
                                {rec.usedQty != null && <InfoRow label="实际用量" value={`${rec.usedQty} ${rec.usedUnit || ''}`} />}
                              </>
                            )}
                            {/* 清场 */}
                            {rec.recordType === 'clean_room' && (
                              <>
                                {rec.cleanedBy && <InfoRow label="清场人" value={rec.cleanedBy} />}
                                {rec.checkedBy && <InfoRow label="检查人" value={rec.checkedBy} />}
                                {rec.cleanResult && <InfoRow label="清场结果" value={rec.cleanResult === 'pass' ? '✅ 通过' : '❌ 不通过'} />}
                              </>
                            )}
                            {/* 首件检验 */}
                            {rec.recordType === 'first_piece' && (
                              <>
                                {rec.firstPieceInspector && <InfoRow label="检验人" value={rec.firstPieceInspector} />}
                                {rec.firstPieceBasis && <InfoRow label="检验依据" value={`${rec.firstPieceBasis} v${rec.firstPieceBasisVersion || '-'}`} />}
                                {rec.firstPieceResult && <InfoRow label="首件结果" value={rec.firstPieceResult === 'qualified' ? '✅ 合格' : '❌ 不合格'} />}
                              </>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 生产流转单 */}
                {data.production.routingCards.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                      生产流转单 <span className="text-primary">({data.production.routingCards.length})</span>
                    </p>
                    {data.production.routingCards.map((rc: any) => (
                      <div key={rc.id} className="border rounded p-3 text-sm grid grid-cols-2 gap-x-6 gap-y-1">
                        <InfoRow label="流转单号" value={rc.cardNo} />
                        <InfoRow label="当前工序" value={rc.currentProcess} />
                        <InfoRow label="下一工序" value={rc.nextProcess} />
                        <InfoRow label="数量" value={`${rc.quantity} ${rc.unit || ''}`} />
                        <InfoRow label="需委外灭菌" value={rc.needsSterilization ? '是' : '否'} />
                      </div>
                    ))}
                  </div>
                )}

                {/* 委外灭菌单 */}
                {data.production.sterilizationOrders.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                      委外灭菌单 <span className="text-primary">({data.production.sterilizationOrders.length})</span>
                    </p>
                    {data.production.sterilizationOrders.map((so: any) => (
                      <div key={so.id} className="border rounded p-3 text-sm">
                        <div className="grid grid-cols-2 gap-x-6 gap-y-1">
                          <InfoRow label="灭菌单号" value={so.orderNo} />
                          <InfoRow label="灭菌批号" value={so.sterilizationBatchNo} />
                          <InfoRow label="灭菌方式" value={so.sterilizationMethod} />
                          <InfoRow label="委外供应商" value={so.supplierName} />
                          <InfoRow label="发出日期" value={so.sendDate ? String(so.sendDate).slice(0, 10) : undefined} />
                          <InfoRow label="实际返回" value={so.actualReturnDate ? String(so.actualReturnDate).slice(0, 10) : undefined} />
                          <InfoRow label="数量" value={`${so.quantity} ${so.unit || ''}`} />
                          <div className="flex gap-2 text-sm">
                            <span className="text-muted-foreground w-28 shrink-0">状态</span>
                            <StatusBadge status={so.status} map={sterilizationStatusMap} />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </AccordionContent>
            </AccordionItem>

            {/* ===== 质量板块 ===== */}
            <AccordionItem value="quality" className="border rounded-lg px-4">
              <AccordionTrigger className="hover:no-underline">
                <SectionHeader
                  icon={<FlaskConical className="h-4 w-4" />}
                  title="质量板块"
                  count={data.quality.inspections.length + data.quality.incidents.length}
                />
              </AccordionTrigger>
              <AccordionContent className="space-y-4 pt-2">
                {data.quality.inspections.length === 0 && data.quality.incidents.length === 0 && (
                  <p className="text-sm text-muted-foreground py-2">暂无质量检验记录</p>
                )}
                {data.quality.inspections.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                      检验记录 <span className="text-primary">({data.quality.inspections.length})</span>
                    </p>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>检验单号</TableHead>
                          <TableHead>类型</TableHead>
                          <TableHead>检验日期</TableHead>
                          <TableHead className="text-right">抽样数</TableHead>
                          <TableHead className="text-right">合格数</TableHead>
                          <TableHead className="text-right">不合格数</TableHead>
                          <TableHead>结论</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {data.quality.inspections.map((ins: any) => {
                          const res = inspectionResultMap[ins.result];
                          return (
                            <TableRow key={ins.id}>
                              <TableCell className="font-mono text-xs">{ins.inspectionNo}</TableCell>
                              <TableCell>
                                <Badge variant="outline" className="text-xs">{ins.type}</Badge>
                              </TableCell>
                              <TableCell className="text-sm">{ins.inspectionDate ? String(ins.inspectionDate).slice(0, 10) : "-"}</TableCell>
                              <TableCell className="text-right">{ins.sampleQty ?? "-"}</TableCell>
                              <TableCell className="text-right text-green-600 font-medium">{ins.qualifiedQty ?? "-"}</TableCell>
                              <TableCell className="text-right text-red-500">{ins.unqualifiedQty ?? "-"}</TableCell>
                              <TableCell>
                                {res ? (
                                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${res.color}`}>
                                    {res.icon}{res.label}
                                  </span>
                                ) : ins.result ?? "-"}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                )}
                {data.quality.incidents.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                      不良事件 <span className="text-red-500">({data.quality.incidents.length})</span>
                    </p>
                    {data.quality.incidents.map((inc: any) => (
                      <div key={inc.id} className="border border-red-200 rounded p-3 text-sm bg-red-50/50">
                        <div className="grid grid-cols-2 gap-x-6 gap-y-1">
                          <InfoRow label="事件编号" value={inc.incidentNo} />
                          <InfoRow label="事件类型" value={inc.incidentType} />
                          <InfoRow label="发现日期" value={inc.discoveredDate ? String(inc.discoveredDate).slice(0, 10) : undefined} />
                          <InfoRow label="严重程度" value={inc.severity} />
                          <InfoRow label="描述" value={inc.description} />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </AccordionContent>
            </AccordionItem>

            {/* ===== 仓库板块 ===== */}
            <AccordionItem value="warehouse" className="border rounded-lg px-4">
              <AccordionTrigger className="hover:no-underline">
                <SectionHeader
                  icon={<Warehouse className="h-4 w-4" />}
                  title="仓库板块"
                  count={data.warehouse.entries.length + data.warehouse.transactions.length}
                />
              </AccordionTrigger>
              <AccordionContent className="space-y-4 pt-2">
                {data.warehouse.entries.length === 0 && data.warehouse.transactions.length === 0 && (
                  <p className="text-sm text-muted-foreground py-2">暂无仓库记录</p>
                )}
                {data.warehouse.entries.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                      生产入库申请 <span className="text-primary">({data.warehouse.entries.length})</span>
                    </p>
                    {data.warehouse.entries.map((entry: any) => (
                      <div key={entry.id} className="border rounded p-3 text-sm">
                        <div className="grid grid-cols-2 gap-x-6 gap-y-1">
                          <InfoRow label="入库申请单号" value={entry.entryNo} />
                          <InfoRow label="灭菌批号" value={entry.sterilizationBatchNo} />
                          <InfoRow label="灭菌后数量" value={entry.sterilizedQty != null ? `${entry.sterilizedQty} ${entry.unit || ''}` : undefined} />
                          <InfoRow label="检验报废数量" value={entry.inspectionRejectQty != null ? `${entry.inspectionRejectQty} ${entry.unit || ''}` : undefined} />
                          <InfoRow label="留样数量" value={entry.sampleQty != null ? `${entry.sampleQty} ${entry.unit || ''}` : undefined} />
                          <InfoRow label="入库数量" value={entry.quantity != null ? `${entry.quantity} ${entry.unit || ''}` : undefined} />
                          <InfoRow label="申请日期" value={entry.applicationDate ? String(entry.applicationDate).slice(0, 10) : undefined} />
                          <div className="flex gap-2 text-sm">
                            <span className="text-muted-foreground w-28 shrink-0">状态</span>
                            <StatusBadge status={entry.status} map={warehouseEntryStatusMap} />
                          </div>
                        </div>
                        {entry.quantityModifyReason && (
                          <div className="mt-2 text-xs text-muted-foreground bg-yellow-50 rounded p-2">
                            <span className="font-medium">数量修改原因：</span>{entry.quantityModifyReason}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
                {data.warehouse.transactions.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                      库存流水 <span className="text-primary">({data.warehouse.transactions.length})</span>
                    </p>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>单据号</TableHead>
                          <TableHead>类型</TableHead>
                          <TableHead className="text-right">数量</TableHead>
                          <TableHead className="text-right">变动前</TableHead>
                          <TableHead className="text-right">变动后</TableHead>
                          <TableHead>时间</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {data.warehouse.transactions.map((tx: any) => {
                          const typeLabels: Record<string, string> = {
                            production_in: "生产入库", sales_out: "销售出库",
                            purchase_in: "采购入库", return_in: "退货入库",
                            production_out: "生产领料", return_out: "销售退货",
                            other_in: "其他入库", other_out: "其他出库",
                            transfer: "调拨", adjust: "调整",
                          };
                          const isIn = tx.type.endsWith("_in") || tx.type === "transfer";
                          return (
                            <TableRow key={tx.id}>
                              <TableCell className="font-mono text-xs">{tx.documentNo || "-"}</TableCell>
                              <TableCell>
                                <span className={`text-xs font-medium ${isIn ? 'text-green-600' : 'text-red-500'}`}>
                                  {typeLabels[tx.type] || tx.type}
                                </span>
                              </TableCell>
                              <TableCell className={`text-right font-medium ${isIn ? 'text-green-600' : 'text-red-500'}`}>
                                {isIn ? '+' : '-'}{tx.quantity} {tx.unit || ''}
                              </TableCell>
                              <TableCell className="text-right text-muted-foreground text-xs">{tx.beforeQty ?? "-"}</TableCell>
                              <TableCell className="text-right text-xs">{tx.afterQty ?? "-"}</TableCell>
                              <TableCell className="text-xs text-muted-foreground">
                                {tx.createdAt ? formatDate(tx.createdAt) : "-"}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </AccordionContent>
            </AccordionItem>

            {/* ===== 销售板块 ===== */}
            <AccordionItem value="sales" className="border rounded-lg px-4">
              <AccordionTrigger className="hover:no-underline">
                <SectionHeader
                  icon={<ShoppingCart className="h-4 w-4" />}
                  title="销售板块"
                  count={data.sales.order ? 1 : 0}
                />
              </AccordionTrigger>
              <AccordionContent className="pt-2">
                {!data.sales.order ? (
                  <p className="text-sm text-muted-foreground py-2">暂无关联销售订单</p>
                ) : (
                  <div className="border rounded p-3 text-sm">
                    <div className="grid grid-cols-2 gap-x-6 gap-y-1">
                      <InfoRow label="销售订单号" value={data.sales.order.orderNo} />
                      <InfoRow label="订单日期" value={data.sales.order.orderDate ? String(data.sales.order.orderDate).slice(0, 10) : undefined} />
                      <InfoRow label="交货日期" value={data.sales.order.deliveryDate ? String(data.sales.order.deliveryDate).slice(0, 10) : undefined} />
                      <InfoRow label="订单金额" value={data.sales.order.totalAmount ? `${data.sales.order.totalAmount} ${data.sales.order.currency || 'CNY'}` : undefined} />
                      <InfoRow label="付款方式" value={data.sales.order.paymentMethod} />
                      <InfoRow label="收货地址" value={data.sales.order.shippingAddress} />
                      <InfoRow label="收货联系人" value={data.sales.order.shippingContact} />
                      <InfoRow label="收货电话" value={data.sales.order.shippingPhone} />
                    </div>
                  </div>
                )}
              </AccordionContent>
            </AccordionItem>

            {/* ===== 财务板块 ===== */}
            <AccordionItem value="finance" className="border rounded-lg px-4">
              <AccordionTrigger className="hover:no-underline">
                <SectionHeader
                  icon={<Banknote className="h-4 w-4" />}
                  title="财务板块"
                  count={data.finance.accountsReceivable.length}
                />
              </AccordionTrigger>
              <AccordionContent className="pt-2">
                {data.finance.accountsReceivable.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-2">暂无应收账款记录</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>发票号</TableHead>
                        <TableHead>发票日期</TableHead>
                        <TableHead>到期日</TableHead>
                        <TableHead className="text-right">应收金额</TableHead>
                        <TableHead className="text-right">已收金额</TableHead>
                        <TableHead>状态</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.finance.accountsReceivable.map((ar: any) => {
                        const arStatusMap: Record<string, string> = {
                          pending: "待收款", partial: "部分收款", paid: "已收款", overdue: "已逾期",
                        };
                        return (
                          <TableRow key={ar.id}>
                            <TableCell className="font-mono text-xs">{ar.invoiceNo}</TableCell>
                            <TableCell className="text-sm">{ar.invoiceDate ? String(ar.invoiceDate).slice(0, 10) : "-"}</TableCell>
                            <TableCell className="text-sm">{ar.dueDate ? String(ar.dueDate).slice(0, 10) : "-"}</TableCell>
                            <TableCell className="text-right font-medium">{ar.amount} {ar.currency || 'CNY'}</TableCell>
                            <TableCell className="text-right text-green-600">{ar.paidAmount || 0} {ar.currency || 'CNY'}</TableCell>
                            <TableCell>
                              <span className={`text-xs font-medium ${ar.status === 'paid' ? 'text-green-600' : ar.status === 'overdue' ? 'text-red-500' : 'text-yellow-600'}`}>
                                {arStatusMap[ar.status] || ar.status}
                              </span>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                )}
              </AccordionContent>
            </AccordionItem>

          </Accordion>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ========== 批记录列表主页面 ==========
export default function BatchRecordPage() {
  const [searchBatchNo, setSearchBatchNo] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [page, setPage] = useState(0);
  const [detailBatchNo, setDetailBatchNo] = useState<string | null>(null);
  const PAGE_SIZE = 20;

  const { data, isLoading, refetch } = trpc.batchRecord.list.useQuery({
    batchNo: searchBatchNo || undefined,
    dateFrom: dateFrom || undefined,
    dateTo: dateTo || undefined,
    limit: PAGE_SIZE,
    offset: page * PAGE_SIZE,
  });

  const { data: productsData = [] } = trpc.products.list.useQuery();
  const getProductName = (productId?: number | null) => {
    if (!productId) return "-";
    const p = (productsData as any[]).find((p: any) => p.id === productId);
    return p?.name || `产品#${productId}`;
  };

  const list = data?.list ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / PAGE_SIZE);

  const handleSearch = () => {
    setSearchBatchNo(searchInput);
    setPage(0);
  };

  const handleReset = () => {
    setSearchInput("");
    setSearchBatchNo("");
    setDateFrom("");
    setDateTo("");
    setPage(0);
  };

  return (
    <ERPLayout>
      <div className="p-6 space-y-4">
        {/* 页头 */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <FileText className="h-6 w-6 text-primary" />
              批记录查询
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              以生产批号为主线，追溯生产、质量、仓库、销售、财务全链路数据
            </p>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              <Package className="h-4 w-4 text-blue-500" />生产
            </span>
            <ChevronRight className="h-3 w-3" />
            <span className="flex items-center gap-1">
              <FlaskConical className="h-4 w-4 text-purple-500" />质量
            </span>
            <ChevronRight className="h-3 w-3" />
            <span className="flex items-center gap-1">
              <Warehouse className="h-4 w-4 text-green-500" />仓库
            </span>
            <ChevronRight className="h-3 w-3" />
            <span className="flex items-center gap-1">
              <ShoppingCart className="h-4 w-4 text-orange-500" />销售
            </span>
            <ChevronRight className="h-3 w-3" />
            <span className="flex items-center gap-1">
              <Banknote className="h-4 w-4 text-yellow-500" />财务
            </span>
          </div>
        </div>

        {/* 搜索栏 */}
        <Card>
          <CardContent className="pt-4">
            <div className="flex flex-wrap gap-3 items-end">
              <div className="flex-1 min-w-[200px]">
                <label className="text-xs text-muted-foreground mb-1 block">生产批号</label>
                <Input
                  placeholder="输入批号搜索..."
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                  className="font-mono"
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">创建日期从</label>
                <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="w-40" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">创建日期至</label>
                <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="w-40" />
              </div>
              <Button onClick={handleSearch} className="gap-1">
                <Search className="h-4 w-4" />搜索
              </Button>
              <Button variant="outline" onClick={handleReset}>重置</Button>
            </div>
          </CardContent>
        </Card>

        {/* 统计卡片 */}
        <div className="grid grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">批记录总数</p>
              <p className="text-2xl font-bold text-primary">{total}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">生产中</p>
              <p className="text-2xl font-bold text-yellow-600">
                {list.filter((r: any) => r.status === 'in_progress').length}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">已完成</p>
              <p className="text-2xl font-bold text-green-600">
                {list.filter((r: any) => r.status === 'completed').length}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">关联销售订单</p>
              <p className="text-2xl font-bold text-blue-600">
                {list.filter((r: any) => r.salesOrderId).length}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* 批记录列表 */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">批记录列表</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="font-bold text-primary">生产批号 <span className="text-xs text-muted-foreground font-normal">(唯一追溯)</span></TableHead>
                  <TableHead>生产指令号</TableHead>
                  <TableHead>产品名称</TableHead>
                  <TableHead className="text-right">计划数量</TableHead>
                  <TableHead className="text-right">完成数量</TableHead>
                  <TableHead>生产日期</TableHead>
                  <TableHead>有效期至</TableHead>
                  <TableHead>状态</TableHead>
                  <TableHead>关联销售单</TableHead>
                  <TableHead className="text-center">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading && (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center py-8 text-muted-foreground">
                      <Clock className="h-5 w-5 animate-spin inline mr-2" />加载中...
                    </TableCell>
                  </TableRow>
                )}
                {!isLoading && list.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center py-8 text-muted-foreground">
                      暂无批记录数据
                    </TableCell>
                  </TableRow>
                )}
                {list.map((row: any) => (
                  <TableRow key={row.id} className="hover:bg-muted/30">
                    <TableCell>
                      <span className="font-mono font-bold text-primary">{row.batchNo}</span>
                    </TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">{row.orderNo}</TableCell>
                    <TableCell>{getProductName(row.productId)}</TableCell>
                    <TableCell className="text-right">{row.plannedQty} {row.unit || ''}</TableCell>
                    <TableCell className="text-right">{row.completedQty || 0} {row.unit || ''}</TableCell>
                    <TableCell className="text-sm">{row.productionDate ? String(row.productionDate).slice(0, 10) : "-"}</TableCell>
                    <TableCell className="text-sm">{row.expiryDate ? String(row.expiryDate).slice(0, 10) : "-"}</TableCell>
                    <TableCell>
                      <StatusBadge status={row.status} map={productionStatusMap} />
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {row.salesOrderId ? `#${row.salesOrderId}` : "-"}
                    </TableCell>
                    <TableCell className="text-center">
                      <Button
                        size="sm"
                        variant="outline"
                        className="gap-1 text-xs"
                        onClick={() => setDetailBatchNo(row.batchNo!)}
                      >
                        <FileText className="h-3.5 w-3.5" />查看批记录
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            {/* 分页 */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t">
                <p className="text-sm text-muted-foreground">
                  共 {total} 条，第 {page + 1} / {totalPages} 页
                </p>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(p => p - 1)}>上一页</Button>
                  <Button variant="outline" size="sm" disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}>下一页</Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* 批记录详情弹窗 */}
      {detailBatchNo && (
        <BatchRecordDetail
          batchNo={detailBatchNo}
          open={!!detailBatchNo}
          onClose={() => setDetailBatchNo(null)}
        />
      )}
    </ERPLayout>
  );
}
