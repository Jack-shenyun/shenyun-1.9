/**
 * ComplianceChecker - 法规合规检查面板
 * 检查当前标签模板是否符合 NMPA / FDA / MDR 法规要求
 */
import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  CheckCircle2, XCircle, AlertTriangle, Shield, Info,
} from "lucide-react";
import { checkCompliance, REGULATION_INFO, type ComplianceResult } from "@/lib/regulatoryCompliance";

interface ComplianceCheckerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  elements: any[];
  template: any;
  currentRegulation?: "NMPA" | "FDA" | "MDR";
}

export default function ComplianceChecker({ open, onOpenChange, elements, template, currentRegulation }: ComplianceCheckerProps) {
  const [activeReg, setActiveReg] = useState<"NMPA" | "FDA" | "MDR">(currentRegulation || "MDR");

  const results = useMemo(() => {
    return {
      NMPA: checkCompliance("NMPA", elements, template),
      FDA: checkCompliance("FDA", elements, template),
      MDR: checkCompliance("MDR", elements, template),
    };
  }, [elements, template]);

  const currentResult = results[activeReg];
  const info = REGULATION_INFO[activeReg];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[650px] max-h-[85vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5" />法规合规检查
          </DialogTitle>
          <DialogDescription>
            检查当前标签模板是否符合各法规区域的标签要求
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeReg} onValueChange={v => setActiveReg(v as any)}>
          <TabsList className="w-full">
            {(["NMPA", "FDA", "MDR"] as const).map(reg => {
              const r = results[reg];
              const regInfo = REGULATION_INFO[reg];
              return (
                <TabsTrigger key={reg} value={reg} className="flex-1 gap-1.5 text-xs">
                  {r.passed ? (
                    <CheckCircle2 className="w-3.5 h-3.5" style={{ color: regInfo.color }} />
                  ) : (
                    <XCircle className="w-3.5 h-3.5 text-red-500" />
                  )}
                  {reg}
                  <Badge variant="outline" className="text-[9px] h-4 px-1">
                    {r.passedRules}/{r.totalRules}
                  </Badge>
                </TabsTrigger>
              );
            })}
          </TabsList>

          {(["NMPA", "FDA", "MDR"] as const).map(reg => {
            const r = results[reg];
            const regInfo = REGULATION_INFO[reg];
            return (
              <TabsContent key={reg} value={reg} className="mt-3">
                <ScrollArea className="max-h-[55vh]">
                  <div className="space-y-3">
                    {/* 法规信息卡片 */}
                    <div className="rounded-lg border p-3" style={{ borderColor: regInfo.borderColor, backgroundColor: regInfo.bgColor }}>
                      <div className="flex items-center justify-between mb-1">
                        <h3 className="text-sm font-semibold" style={{ color: regInfo.color }}>{regInfo.fullNameEn}</h3>
                        <Badge style={{ backgroundColor: regInfo.color, color: "white" }} className="text-[10px]">{reg}</Badge>
                      </div>
                      <p className="text-[11px] text-gray-600 mb-1">{regInfo.fullName}</p>
                      <p className="text-[10px] text-gray-500">{regInfo.standard}</p>
                      <p className="text-[10px] text-gray-500">{regInfo.udiStandard}</p>
                    </div>

                    {/* 总体结果 */}
                    <div className={`rounded-lg border p-3 flex items-center gap-3 ${r.passed ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"}`}>
                      {r.passed ? (
                        <CheckCircle2 className="w-8 h-8 text-green-500 shrink-0" />
                      ) : (
                        <XCircle className="w-8 h-8 text-red-500 shrink-0" />
                      )}
                      <div>
                        <p className={`text-sm font-semibold ${r.passed ? "text-green-700" : "text-red-700"}`}>
                          {r.passed ? "合规检查通过" : `${r.failedRules.length} 项必填要求未满足`}
                        </p>
                        <p className="text-[11px] text-gray-500">
                          通过 {r.passedRules}/{r.totalRules} 项检查
                          {r.warnings.length > 0 && ` · ${r.warnings.length} 项建议`}
                        </p>
                      </div>
                    </div>

                    {/* 未通过的必填项 */}
                    {r.failedRules.length > 0 && (
                      <div>
                        <p className="text-[10px] font-semibold text-red-600 uppercase tracking-wide mb-1.5 flex items-center gap-1">
                          <XCircle className="w-3 h-3" />未满足的必填要求
                        </p>
                        <div className="space-y-1">
                          {r.failedRules.map(rule => (
                            <div key={rule.id} className="flex items-start gap-2 p-2 rounded border border-red-200 bg-red-50/50">
                              <XCircle className="w-3.5 h-3.5 text-red-500 shrink-0 mt-0.5" />
                              <div>
                                <p className="text-xs font-medium text-red-700">{rule.descriptionZh}</p>
                                <p className="text-[10px] text-red-500">{rule.description}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* 建议项 */}
                    {r.warnings.length > 0 && (
                      <div>
                        <p className="text-[10px] font-semibold text-amber-600 uppercase tracking-wide mb-1.5 flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3" />建议添加
                        </p>
                        <div className="space-y-1">
                          {r.warnings.map(rule => (
                            <div key={rule.id} className="flex items-start gap-2 p-2 rounded border border-amber-200 bg-amber-50/50">
                              <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
                              <div>
                                <p className="text-xs font-medium text-amber-700">{rule.descriptionZh}</p>
                                <p className="text-[10px] text-amber-500">{rule.description}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* 法规关键要求列表 */}
                    <Separator />
                    <div>
                      <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1.5 flex items-center gap-1">
                        <Info className="w-3 h-3" />{reg} 标签关键要求
                      </p>
                      <div className="space-y-0.5">
                        {regInfo.keyRequirements.map((req, i) => (
                          <div key={i} className="flex items-center gap-1.5 text-[11px] text-gray-600">
                            <span className="w-4 h-4 rounded-full bg-gray-100 flex items-center justify-center text-[9px] font-medium text-gray-500 shrink-0">{i + 1}</span>
                            {req}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </ScrollArea>
              </TabsContent>
            );
          })}
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
