import { Input } from "@/components/ui/input";

export function normalizeDateInputValue(value: string, finalize = false): string {
  const cleaned = String(value || "")
    .replace(/\//g, "-")
    .replace(/[^\d-]/g, "");
  if (!cleaned) return "";
  const rawParts = cleaned
    .split("-")
    .slice(0, 3)
    .map((part, index) => part.slice(0, index === 0 ? 4 : 2));
  if (!finalize) return rawParts.join("-");
  if (rawParts.length === 3 && rawParts[0].length === 4) {
    const [year, month, day] = rawParts;
    return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
  }
  return rawParts.join("-");
}

export default function DateTextInput({
  value,
  onChange,
  placeholder = "YYYY-MM-DD",
  className,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}) {
  return (
    <Input
      type="text"
      inputMode="numeric"
      value={value}
      placeholder={placeholder}
      className={className ? `font-mono ${className}` : "font-mono"}
      onChange={(e) => onChange(normalizeDateInputValue(e.target.value))}
      onBlur={(e) => onChange(normalizeDateInputValue(e.target.value, true))}
    />
  );
}
