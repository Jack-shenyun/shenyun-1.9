import { useMemo } from "react";
import { readActiveCompany } from "@/lib/activeCompany";
import { trpc } from "@/lib/trpc";

function normalizeText(value: unknown) {
  const text = String(value ?? "").trim();
  return text || "";
}

function deriveShortName(companyName: string) {
  const normalized = normalizeText(companyName);
  if (!normalized) return "神韵医疗";
  const stripped = normalized
    .replace(/有限责任公司|股份有限公司|有限公司/g, "")
    .replace(/医疗器械|医疗|塑胶|医药|科技|贸易|集团/g, "")
    .trim();
  if (stripped) return stripped;
  return normalized.length > 8 ? normalized.slice(0, 8) : normalized;
}

export function useCompanyBranding() {
  const { data: companyInfo } = trpc.companyInfo.get.useQuery(undefined, {
    refetchOnWindowFocus: false,
  });
  const activeCompany = useMemo(() => readActiveCompany(), []);

  const companyDisplayName = normalizeText((companyInfo as any)?.companyNameCn)
    || normalizeText(activeCompany?.name)
    || "苏州神韵医疗器械有限公司";
  const companyShortName = deriveShortName(
    normalizeText(activeCompany?.shortName) || companyDisplayName,
  );

  return {
    companyInfo,
    activeCompany,
    companyDisplayName,
    companyShortName,
  };
}
