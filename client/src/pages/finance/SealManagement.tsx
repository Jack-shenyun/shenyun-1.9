import { useMemo, useState } from "react";
import { Link, useLocation } from "wouter";
import ERPLayout from "@/components/ERPLayout";
import { formatDateValue } from "@/lib/formatters";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import TablePaginationFooter from "@/components/TablePaginationFooter";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ArrowLeft, Download, Eye, Search, Stamp } from "lucide-react";
import sealContractSpecial from "@/assets/seal-contract-special.svg";
import sealCompanyEn from "@/assets/seal-company-en.svg";

type SealRecord = {
  id: string;
  name: string;
  type: string;
  language: string;
  usage: string;
  assetUrl: string;
};

type SealUsageRecord = {
  id: string;
  module: string;
  documentName: string;
  documentNo: string;
  usageScene: string;
  status: string;
  updatedAt: string;
};

const SEAL_RECORDS: SealRecord[] = [
  {
    id: "contract-special",
    name: "合同专用章",
    type: "业务印章",
    language: "中文",
    usage: "合同、销售订单、协议类文件",
    assetUrl: sealContractSpecial,
  },
  {
    id: "company-en",
    name: "英文公章",
    type: "企业公章",
    language: "英文",
    usage: "英文合同、外贸资料、海外客户文件",
    assetUrl: sealCompanyEn,
  },
];

const SEAL_USAGE_MAP: Record<string, SealUsageRecord[]> = {
  "contract-special": [
    {
      id: "usage-001",
      module: "销售部",
      documentName: "销售订单",
      documentNo: "SO-2026-0003",
      usageScene: "审核通过后订单打印",
      status: "待接入自动盖章",
      updatedAt: "2026-03-11 09:20",
    },
    {
      id: "usage-002",
      module: "销售部",
      documentName: "英文合同",
      documentNo: "CT-2026-0012",
      usageScene: "合同打印",
      status: "预留",
      updatedAt: "2026-03-11 09:20",
    },
  ],
  "company-en": [
    {
      id: "usage-004",
      module: "销售部",
      documentName: "英文报价单",
      documentNo: "QT-EN-2026-0008",
      usageScene: "外贸文件打印",
      status: "预留",
      updatedAt: "2026-03-11 09:20",
    },
  ],
};

export default function SealManagementPage() {
  const [keyword, setKeyword] = useState("");
  const [, navigate] = useLocation();

  const filteredSeals = useMemo(() => {
    const q = keyword.trim().toLowerCase();
    if (!q) return SEAL_RECORDS;
    return SEAL_RECORDS.filter((item) =>
      [item.name, item.type, item.language, item.usage].some((field) => field.toLowerCase().includes(q))
    );
  }, [keyword]);

  return (
    <ERPLayout>
      <div className="space-y-6 p-4 md:p-6">
        <div className="flex flex-col gap-4 rounded-2xl border bg-white p-5 shadow-sm md:flex-row md:items-center md:justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Stamp className="h-5 w-5 text-rose-600" />
              <h1 className="text-2xl font-bold tracking-tight">印章管理</h1>
            </div>
            <p className="text-sm text-muted-foreground">统一维护合同专用章、中文公章、英文公章，供后续打印与自动盖章调用。</p>
          </div>
          <div className="relative w-full md:w-72">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={keyword} onChange={(e) => setKeyword(e.target.value)} placeholder="搜索印章..." className="pl-9" />
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {filteredSeals.map((seal) => (
            <Card key={seal.id} className="overflow-hidden">
              <CardHeader className="space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <CardTitle className="text-lg">{seal.name}</CardTitle>
                    <CardDescription className="mt-1">{seal.usage}</CardDescription>
                  </div>
                  <Badge variant="outline">{seal.language}</Badge>
                </div>
                <div className="flex gap-2">
                  <Badge className="bg-rose-50 text-rose-700 hover:bg-rose-50">{seal.type}</Badge>
                  <Badge variant="secondary">已就绪</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="rounded-2xl border bg-rose-50/30 p-4">
                  <img src={seal.assetUrl} alt={seal.name} className="mx-auto h-52 w-52 object-contain" />
                </div>
                <div className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2 text-sm">
                  <span className="text-muted-foreground">调用标识</span>
                  <span className="font-medium text-slate-700">{seal.id}</span>
                </div>
                <Button variant="outline" className="w-full gap-2" asChild>
                  <a href={seal.assetUrl} download={`${seal.id}.svg`}>
                    <Download className="h-4 w-4" />
                    下载印章素材
                  </a>
                </Button>
                <Button className="w-full gap-2" onClick={() => navigate(`/finance/seals/${seal.id}`)}>
                  <Eye className="h-4 w-4" />
                  查看引用记录
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </ERPLayout>
  );
}

export function SealDetailPage({ sealId }: { sealId: string }) {
  const PAGE_SIZE = 10;
  const seal = SEAL_RECORDS.find((item) => item.id === sealId);
  const usageRecords = seal ? (SEAL_USAGE_MAP[seal.id] || []) : [];
  const [currentPage, setCurrentPage] = useState(1);
  const totalPages = Math.max(1, Math.ceil(usageRecords.length / PAGE_SIZE));
  const pagedUsageRecords = usageRecords.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  if (!seal) {
    return (
      <ERPLayout>
        <div className="space-y-4 p-4 md:p-6">
          <Button variant="outline" size="sm" asChild>
            <Link href="/finance/seals">
              <ArrowLeft className="mr-1 h-4 w-4" />
              返回印章管理
            </Link>
          </Button>
          <Card>
            <CardContent className="py-10 text-center text-muted-foreground">未找到对应印章</CardContent>
          </Card>
        </div>
      </ERPLayout>
    );
  }

  return (
    <ERPLayout>
      <div className="space-y-6 p-4 md:p-6">
        <div className="flex items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" asChild>
                <Link href="/finance/seals">
                  <ArrowLeft className="mr-1 h-4 w-4" />
                  返回
                </Link>
              </Button>
              <h1 className="text-2xl font-bold tracking-tight">{seal.name}</h1>
              <Badge variant="outline">{seal.language}</Badge>
            </div>
            <p className="text-sm text-muted-foreground">{seal.usage}</p>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
          <Card>
            <CardHeader>
              <CardTitle>印章预览</CardTitle>
              <CardDescription>当前系统调用的印章素材</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-2xl border bg-rose-50/30 p-4">
                <img src={seal.assetUrl} alt={seal.name} className="mx-auto h-72 w-72 object-contain" />
              </div>
              <div className="space-y-2 rounded-xl bg-slate-50 p-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">调用标识</span>
                  <span className="font-medium">{seal.id}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">印章类型</span>
                  <span className="font-medium">{seal.type}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>引用记录</CardTitle>
              <CardDescription>显示当前印章在系统中的调用位置和使用状态</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>模块</TableHead>
                    <TableHead>单据名称</TableHead>
                    <TableHead>单据编号</TableHead>
                    <TableHead>引用场景</TableHead>
                    <TableHead>状态</TableHead>
                    <TableHead>更新时间</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {usageRecords.length > 0 ? (
                    pagedUsageRecords.map((record) => (
                      <TableRow key={record.id}>
                        <TableCell>{record.module}</TableCell>
                        <TableCell>{record.documentName}</TableCell>
                        <TableCell>{record.documentNo}</TableCell>
                        <TableCell>{record.usageScene}</TableCell>
                        <TableCell>{record.status}</TableCell>
                        <TableCell>{formatDateValue(record.updatedAt)}</TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                        暂无引用记录
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
        <TablePaginationFooter total={usageRecords.length} page={currentPage} pageSize={PAGE_SIZE} onPageChange={setCurrentPage} />
      </div>
    </ERPLayout>
  );
}
