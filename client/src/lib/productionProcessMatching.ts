export const getApplicableProductDisplayName = (value: string) =>
  String(value || "")
    .replace(/（[^）]*）/g, "")
    .replace(/\([^)]*\)/g, "")
    .replace(/【[^】]*】/g, "")
    .replace(/\[[^\]]*\]/g, "")
    .replace(/\s+/g, " ")
    .trim();

const toCompactKey = (value: string) =>
  getApplicableProductDisplayName(value)
    .toLowerCase()
    .replace(/[（）()\s_\-【】\[\]]/g, "");

const GASTRIC_TUBE_ALIASES = [
  "胃管",
  "一次性使用胃管",
  "sterile single use silicone gastric tube",
  "gastric calibration tube",
];

export const normalizeApplicableProduct = (value: string) => {
  const stripped = getApplicableProductDisplayName(value);
  const compact = toCompactKey(stripped);
  if (!compact) return "";

  if (GASTRIC_TUBE_ALIASES.some((alias) => compact.includes(toCompactKey(alias)))) {
    return "胃管";
  }

  return stripped;
};

export const normalizeApplicableProductKey = (value: string) =>
  toCompactKey(normalizeApplicableProduct(value));

export const matchesApplicableProduct = (left: string, right: string) =>
  normalizeApplicableProductKey(left) === normalizeApplicableProductKey(right);

export interface ProcessBindingLike {
  applicableProducts?: string | null;
  boundProductNames?: string[] | null;
}

export const getProcessBindingNames = (process: ProcessBindingLike) => {
  const explicit = (process.boundProductNames || [])
    .map((item) => getApplicableProductDisplayName(item || ""))
    .filter(Boolean);
  if (explicit.length > 0) {
    return Array.from(new Set(explicit));
  }

  const fallback = String(process.applicableProducts || "")
    .split(/[,\n，；;、|/]+/)
    .map((item) => getApplicableProductDisplayName(item))
    .filter(Boolean);
  return Array.from(new Set(fallback));
};

export const processMatchesProduct = (
  process: ProcessBindingLike,
  productName: string,
  extraTokens: Array<string | null | undefined> = []
) => {
  const rules = getProcessBindingNames(process);
  if (!rules.length) return true;

  const tokenSet = new Set<string>();
  [productName, ...extraTokens].forEach((value) => {
    const raw = String(value || "").trim();
    if (!raw) return;
    const normalized = normalizeApplicableProductKey(raw);
    const plain = toCompactKey(getApplicableProductDisplayName(raw));
    if (normalized) tokenSet.add(normalized);
    if (plain) tokenSet.add(plain);
  });

  if (!tokenSet.size) return false;

  return rules.some((rule) => {
    const normalizedRule = normalizeApplicableProductKey(rule);
    const plainRule = toCompactKey(getApplicableProductDisplayName(rule));
    const ruleKeys = [normalizedRule, plainRule].filter(Boolean);
    return ruleKeys.some((ruleKey) =>
      Array.from(tokenSet).some((token) => token === ruleKey || token.includes(ruleKey) || ruleKey.includes(token))
    );
  });
};
