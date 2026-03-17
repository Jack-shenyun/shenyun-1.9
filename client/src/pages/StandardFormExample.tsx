/**
 * ============================================================
 * 神韵医疗器械 ERP — 标准表单示例页面
 * StandardFormExample.tsx
 *
 * 本页面是所有新建表单的参考模板，复制此文件后按业务修改即可。
 * 路由：/standard-form-example（仅开发环境可见）
 * ============================================================
 */

import { useState } from "react";
import ERPLayout from "@/components/ERPLayout";
import { formatDisplayNumber } from "@/lib/formatters";
import {
  MobileFormDialog,
  MobileFormSection,
  MobileFormGrid,
  MobileFormField,
  MobileDetailTable,
  MobileDetailAddBtn,
  MobileStatBar,
} from "@/components/MobileForm";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, Eye, Trash2, MoreHorizontal } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";

// ============================================================
// 类型定义
// ============================================================
type LineItem = {
  id: string;
  productCode: string;
  productName: string;
  spec: string;
  unit: string;
  qty: string;
  price: string;
  amount: number;
};

type FormData = {
  orderNo: string;
  orderDate: string;
  supplierId: string;
  warehouseId: string;
  remark: string;
};

type FormErrors = Partial<Record<keyof FormData, string>>;

// ============================================================
// 示例数据
// ============================================================
const MOCK_LIST = [
  { id: 1, orderNo: "PO-20260301-0001", supplier: "上海医疗器械有限公司", date: "2026-03-01", status: "approved", amount: 58600 },
  { id: 2, orderNo: "PO-20260302-0002", supplier: "北京康华医疗", date: "2026-03-02", status: "pending", amount: 12300 },
  { id: 3, orderNo: "PO-20260303-0003", supplier: "广州医疗科技", date: "2026-03-03", status: "draft", amount: 34500 },
];

const STATUS_MAP: Record<string, { label: string; variant: "default" | "secondary" | "outline" | "destructive" }> = {
  draft:    { label: "草稿", variant: "secondary" },
  pending:  { label: "待审批", variant: "default" },
  approved: { label: "已审批", variant: "outline" },
  rejected: { label: "已拒绝", variant: "destructive" },
};

// ============================================================
// 主页面组件
// ============================================================
export default function StandardFormExamplePage() {
  const [search, setSearch] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [showDetail, setShowDetail] = useState(false);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // 表单状态
  const [form, setForm] = useState<FormData>({
    orderNo: `PO-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-0001`,
    orderDate: new Date().toISOString().slice(0, 10),
    supplierId: "",
    warehouseId: "",
    remark: "",
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [lines, setLines] = useState<LineItem[]>([
    { id: "1", productCode: "MD-001", productName: "一次性注射器", spec: "5ml", unit: "支", qty: "1000", price: "0.8", amount: 800 },
    { id: "2", productCode: "MD-002", productName: "医用口罩", spec: "成人款", unit: "盒", qty: "500", price: "15", amount: 7500 },
  ]);

  // 统计数据
  const stats = [
    { label: "全部", value: MOCK_LIST.length, bg: "bg-white", color: "text-gray-700" },
    { label: "草稿", value: MOCK_LIST.filter(i => i.status === "draft").length, bg: "bg-gray-50", color: "text-gray-600" },
    { label: "待审批", value: MOCK_LIST.filter(i => i.status === "pending").length, bg: "bg-blue-50", color: "text-blue-600" },
    { label: "已审批", value: MOCK_LIST.filter(i => i.status === "approved").length, bg: "bg-green-50", color: "text-green-600" },
  ];

  // ============================================================
  // 表单操作
  // ============================================================
  function setField(key: keyof FormData, value: string) {
    setForm(prev => ({ ...prev, [key]: value }));
    if (errors[key]) setErrors(prev => { const e = { ...prev }; delete e[key]; return e; });
  }

  function setLineField(id: string, key: keyof LineItem, value: string) {
    setLines(prev => prev.map(l => {
      if (l.id !== id) return l;
      const updated = { ...l, [key]: value };
      if (key === "qty" || key === "price") {
        updated.amount = parseFloat(updated.qty || "0") * parseFloat(updated.price || "0");
      }
      return updated;
    }));
  }

  function addLine() {
    const newId = String(Date.now());
    setLines(prev => [...prev, {
      id: newId, productCode: "", productName: "", spec: "", unit: "个",
      qty: "1", price: "0", amount: 0,
    }]);
  }

  function removeLine(id: string) {
    setLines(prev => prev.filter(l => l.id !== id));
  }

  function validate(): boolean {
    const e: FormErrors = {};
    if (!form.supplierId) e.supplierId = "请选择供应商";
    if (!form.warehouseId) e.warehouseId = "请选择收货仓库";
    if (!form.orderDate) e.orderDate = "请填写订单日期";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function handleSubmit() {
    if (!validate()) return;
    setSubmitting(true);
    // 模拟提交
    setTimeout(() => {
      toast.success("采购申请已提交");
      setSubmitting(false);
      setShowCreate(false);
    }, 1200);
  }

  function openCreate() {
    setForm({
      orderNo: `PO-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-000${MOCK_LIST.length + 1}`,
      orderDate: new Date().toISOString().slice(0, 10),
      supplierId: "", warehouseId: "", remark: "",
    });
    setErrors({});
    setLines([]);
    setShowCreate(true);
  }

  const filtered = MOCK_LIST.filter(r =>
    !search || r.orderNo.includes(search) || r.supplier.includes(search)
  );

  const totalAmount = lines.reduce((s, l) => s + l.amount, 0);

  // ============================================================
  // 渲染
  // ============================================================
  return (
    <ERPLayout>
      <div className="flex flex-col h-full bg-gray-50">

        {/* ── 页面标题栏 ── */}
        <div className="flex items-center justify-between px-4 py-3 bg-white border-b border-gray-200 flex-shrink-0">
          <div>
            <h1 className="text-base font-semibold text-gray-800">标准表单示例</h1>
            <p className="text-xs text-gray-400 mt-0.5">新建表单开发参考模板</p>
          </div>
          <Button size="sm" onClick={openCreate} className="flex items-center gap-1.5">
            <Plus className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">新建申请</span>
            <span className="sm:hidden">新建</span>
          </Button>
        </div>

        {/* ── 统计数字横向滚动条 ── */}
        <MobileStatBar stats={stats} className="bg-white border-b border-gray-100" />

        {/* ── 搜索栏 ── */}
        <div className="px-3 py-2 bg-white border-b border-gray-100 flex-shrink-0">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
            <Input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="搜索单号或供应商..."
              className="pl-8 h-8 text-sm bg-gray-50"
            />
          </div>
        </div>

        {/* ── 列表 ── */}
        <div className="flex-1 overflow-y-auto px-3 py-2 space-y-2"
          style={{ WebkitOverflowScrolling: "touch" }}>
          {filtered.map(row => {
            const st = STATUS_MAP[row.status];
            return (
              <div key={row.id} className="bg-white rounded-xl border border-gray-100 shadow-sm p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-sm font-medium text-gray-800">{row.orderNo}</span>
                      <Badge variant={st.variant} className="text-[11px]">{st.label}</Badge>
                    </div>
                    <p className="text-xs text-gray-500 mt-1 truncate">{row.supplier}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{row.date}</p>
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <span className="text-sm font-semibold text-gray-700">
                      ¥{formatDisplayNumber(row.amount)}
                    </span>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => { setSelectedId(row.id); setShowDetail(true); }}>
                          <Eye className="h-4 w-4 mr-2" />查看详情
                        </DropdownMenuItem>
                        <DropdownMenuItem className="text-destructive">
                          <Trash2 className="h-4 w-4 mr-2" />删除
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </div>
            );
          })}
          {filtered.length === 0 && (
            <div className="text-center py-16 text-gray-400 text-sm">暂无数据</div>
          )}
        </div>
      </div>

      {/* ============================================================
          新建表单弹窗 — 标准结构
          ============================================================ */}
      <MobileFormDialog
        open={showCreate}
        onOpenChange={setShowCreate}
        title="新建采购申请"
        description="填写完整信息后提交审批"
        onSubmit={handleSubmit}
        submitText="提交审批"
        isLoading={submitting}
      >
        {/* ── 分区1：基础信息 ── */}
        <MobileFormSection title="基础信息">
          <MobileFormGrid>
            {/* 单号（只读） */}
            <MobileFormField label="申请单号" hint="自动生成">
              <Input value={form.orderNo} readOnly className="bg-gray-50 text-gray-500" />
            </MobileFormField>

            {/* 日期 */}
            <MobileFormField label="申请日期" required error={errors.orderDate}>
              <Input
                type="date"
                value={form.orderDate}
                onChange={e => setField("orderDate", e.target.value)}
              />
            </MobileFormField>

            {/* 供应商 */}
            <MobileFormField label="供应商" required error={errors.supplierId}>
              <Select value={form.supplierId} onValueChange={v => setField("supplierId", v)}>
                <SelectTrigger className={errors.supplierId ? "border-destructive" : ""}>
                  <SelectValue placeholder="请选择供应商" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="s1">上海医疗器械有限公司</SelectItem>
                  <SelectItem value="s2">北京康华医疗</SelectItem>
                  <SelectItem value="s3">广州医疗科技</SelectItem>
                </SelectContent>
              </Select>
            </MobileFormField>

            {/* 收货仓库 */}
            <MobileFormField label="收货仓库" required error={errors.warehouseId}>
              <Select value={form.warehouseId} onValueChange={v => setField("warehouseId", v)}>
                <SelectTrigger className={errors.warehouseId ? "border-destructive" : ""}>
                  <SelectValue placeholder="请选择仓库" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="w1">主仓库</SelectItem>
                  <SelectItem value="w2">备用仓库</SelectItem>
                </SelectContent>
              </Select>
            </MobileFormField>

            {/* 备注（全宽） */}
            <MobileFormField label="备注" fullWidth>
              <Textarea
                value={form.remark}
                onChange={e => setField("remark", e.target.value)}
                placeholder="选填，补充说明..."
                rows={2}
                className="resize-none"
              />
            </MobileFormField>
          </MobileFormGrid>
        </MobileFormSection>

        {/* ── 分区2：产品明细 ── */}
        <MobileFormSection
          title="产品明细"
          action={
            <Button size="sm" variant="outline" onClick={addLine} className="h-7 text-xs gap-1">
              <Plus className="h-3 w-3" />添加
            </Button>
          }
        >
          {/* 明细表 — 横向可滚动 */}
          <MobileDetailTable minWidth={640}>
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="text-xs w-[100px]">产品编码</TableHead>
                  <TableHead className="text-xs w-[140px]">产品名称</TableHead>
                  <TableHead className="text-xs w-[80px]">规格</TableHead>
                  <TableHead className="text-xs w-[60px]">单位</TableHead>
                  <TableHead className="text-xs w-[80px] text-right">数量</TableHead>
                  <TableHead className="text-xs w-[80px] text-right">单价</TableHead>
                  <TableHead className="text-xs w-[90px] text-right">金额</TableHead>
                  <TableHead className="text-xs w-[50px] text-center sticky right-0 bg-muted/50">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lines.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground text-sm">
                      暂无明细，点击"添加"按钮添加产品
                    </TableCell>
                  </TableRow>
                ) : lines.map(line => (
                  <TableRow key={line.id}>
                    <TableCell>
                      <Input
                        value={line.productCode}
                        onChange={e => setLineField(line.id, "productCode", e.target.value)}
                        className="h-7 text-xs w-[90px]"
                        placeholder="编码"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        value={line.productName}
                        onChange={e => setLineField(line.id, "productName", e.target.value)}
                        className="h-7 text-xs w-[130px]"
                        placeholder="产品名称"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        value={line.spec}
                        onChange={e => setLineField(line.id, "spec", e.target.value)}
                        className="h-7 text-xs w-[70px]"
                        placeholder="规格"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        value={line.unit}
                        onChange={e => setLineField(line.id, "unit", e.target.value)}
                        className="h-7 text-xs w-[50px]"
                        placeholder="单位"
                      />
                    </TableCell>
                    <TableCell className="text-right">
                      <Input
                        type="number"
                        value={line.qty}
                        onChange={e => setLineField(line.id, "qty", e.target.value)}
                        className="h-7 text-xs w-[70px] text-right"
                      />
                    </TableCell>
                    <TableCell className="text-right">
                      <Input
                        type="number"
                        value={line.price}
                        onChange={e => setLineField(line.id, "price", e.target.value)}
                        className="h-7 text-xs w-[70px] text-right"
                      />
                    </TableCell>
                    <TableCell className="text-right font-medium text-sm">
                      ¥{formatDisplayNumber(line.amount)}
                    </TableCell>
                    <TableCell className="text-center sticky right-0 bg-white">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeLine(line.id)}
                        className="h-6 w-6 p-0 text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </MobileDetailTable>

          {/* 添加行按钮 */}
          <MobileDetailAddBtn onClick={addLine} label="添加产品" />

          {/* 合计行 */}
          {lines.length > 0 && (
            <div className="flex items-center justify-end gap-2 px-1 py-1">
              <span className="text-sm text-muted-foreground">合计金额：</span>
              <span className="text-base font-bold text-primary">
                ¥{formatDisplayNumber(totalAmount)}
              </span>
            </div>
          )}
        </MobileFormSection>
      </MobileFormDialog>

      {/* ============================================================
          详情弹窗 — 只读模式
          ============================================================ */}
      <MobileFormDialog
        open={showDetail}
        onOpenChange={setShowDetail}
        title="申请单详情"
        hideFooter
        footer={
          <Button size="sm" variant="outline" onClick={() => setShowDetail(false)}>
            关闭
          </Button>
        }
      >
        {selectedId && (() => {
          const record = MOCK_LIST.find(r => r.id === selectedId);
          if (!record) return null;
          const st = STATUS_MAP[record.status];
          return (
            <>
              <MobileFormSection title="基础信息">
                <MobileFormGrid>
                  <MobileFormField label="申请单号">
                    <div className="text-sm font-mono py-1.5 px-2 bg-gray-50 rounded border border-gray-200">
                      {record.orderNo}
                    </div>
                  </MobileFormField>
                  <MobileFormField label="状态">
                    <div className="py-1.5">
                      <Badge variant={st.variant}>{st.label}</Badge>
                    </div>
                  </MobileFormField>
                  <MobileFormField label="供应商">
                    <div className="text-sm py-1.5 px-2 bg-gray-50 rounded border border-gray-200">
                      {record.supplier}
                    </div>
                  </MobileFormField>
                  <MobileFormField label="申请日期">
                    <div className="text-sm py-1.5 px-2 bg-gray-50 rounded border border-gray-200">
                      {record.date}
                    </div>
                  </MobileFormField>
                </MobileFormGrid>
              </MobileFormSection>

              <MobileFormSection title="产品明细">
                <MobileDetailTable minWidth={480}>
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/50">
                        <TableHead className="text-xs">产品名称</TableHead>
                        <TableHead className="text-xs text-right">数量</TableHead>
                        <TableHead className="text-xs text-right">金额</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      <TableRow>
                        <TableCell className="text-sm">一次性注射器</TableCell>
                        <TableCell className="text-right text-sm">1,000</TableCell>
                        <TableCell className="text-right text-sm font-medium">¥800</TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </MobileDetailTable>
              </MobileFormSection>
            </>
          );
        })()}
      </MobileFormDialog>
    </ERPLayout>
  );
}
