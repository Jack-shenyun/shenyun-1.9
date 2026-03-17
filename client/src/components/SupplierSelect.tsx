import { useEffect, useMemo, useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Check } from "lucide-react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { Supplier as DbSupplier } from "../../../drizzle/schema";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export type Supplier = DbSupplier;

interface SupplierSelectProps {
  suppliers?: Supplier[];
  selectedSupplier?: Supplier | null;
  selectedLabel?: string;
  onSupplierSelect: (supplier: Supplier) => void;
  placeholder?: string;
}

export default function SupplierSelect({
  suppliers: propSuppliers,
  selectedSupplier,
  selectedLabel,
  onSupplierSelect,
  placeholder = "选择供应商",
}: SupplierSelectProps) {
  const [open, setOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const { data: apiSuppliers } = trpc.suppliers.list.useQuery(undefined, {
    enabled: !propSuppliers,
  });

  const suppliers: Supplier[] = useMemo(
    () => (propSuppliers || apiSuppliers || []) as Supplier[],
    [apiSuppliers, propSuppliers]
  );

  useEffect(() => {
    if (!open) {
      setSearchTerm("");
    }
  }, [open]);

  const filteredSuppliers = useMemo(() => {
    const keyword = searchTerm.trim().replace(/\s+/g, "").toLowerCase();
    if (!keyword) return suppliers;
    return suppliers.filter((supplier) => {
      const haystack = [
        supplier.code,
        supplier.name,
        supplier.contactPerson,
        supplier.phone,
        supplier.email,
      ]
        .map((value) => String(value || "").replace(/\s+/g, "").toLowerCase())
        .join("|");

      return (
        haystack.includes(keyword)
      );
    });
  }, [searchTerm, suppliers]);

  const handleSelect = (supplier: Supplier) => {
    onSupplierSelect(supplier);
    setOpen(false);
  };

  const buttonText = selectedSupplier
    ? `${selectedSupplier.code || ""}${selectedSupplier.code ? " - " : ""}${selectedSupplier.name || ""}`
    : selectedLabel || "";

  return (
    <>
      <Button
        type="button"
        variant="outline"
        onClick={() => setOpen(true)}
        className="w-full justify-start text-left font-normal"
      >
        {buttonText ? (
          <span>{buttonText}</span>
        ) : (
          <span className="text-muted-foreground">{placeholder}</span>
        )}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-5xl">
          <DialogHeader>
            <DialogTitle>选择供应商</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                autoFocus
                placeholder="搜索供应商编码、名称、联系人、电话、邮箱..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>

            <div className="border rounded-lg max-h-[420px] overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[120px]">供应商编码</TableHead>
                    <TableHead>供应商名称</TableHead>
                    <TableHead className="w-[110px]">联系人</TableHead>
                    <TableHead className="w-[150px]">联系电话</TableHead>
                    <TableHead className="w-[200px]">邮箱</TableHead>
                    <TableHead className="w-[80px]">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredSuppliers.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground">
                        未找到匹配的供应商
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredSuppliers.map((supplier) => (
                      <TableRow
                        key={supplier.id}
                        className={`hover:bg-muted/50 ${
                          selectedSupplier?.id === supplier.id ? "bg-muted" : ""
                        }`}
                      >
                        <TableCell className="font-medium">{supplier.code || "-"}</TableCell>
                        <TableCell>{supplier.name || "-"}</TableCell>
                        <TableCell>{supplier.contactPerson || "-"}</TableCell>
                        <TableCell>{supplier.phone || "-"}</TableCell>
                        <TableCell>{supplier.email || "-"}</TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              handleSelect(supplier);
                            }}
                          >
                            {selectedSupplier?.id === supplier.id ? (
                              <Check className="h-4 w-4 text-green-600" />
                            ) : (
                              "选择"
                            )}
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              取消
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
