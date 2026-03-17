/**
 * 医疗器械标识符号数据库
 * 基于 ISO 15223-1:2021、EN 1041:2008、EU MDR 2017/745、US FDA 21 CFR 801、中国 YY/T 0466.1-2016
 * 
 * 分类：
 * - general: 通用符号（ISO 15223-1）
 * - sterilization: 灭菌相关符号
 * - handling: 搬运/存储符号
 * - safety: 安全/警告符号
 * - packaging: 包装相关符号
 * - identification: 标识类符号（UDI、MD、IVD等）
 * - regulatory: 法规特有符号（CE、FDA、NMPA）
 */

import React from "react";

export interface MedicalSymbol {
  id: string;
  name: string;
  nameZh: string;
  category: "general" | "sterilization" | "handling" | "safety" | "packaging" | "identification" | "regulatory";
  regulation: "all" | "CE" | "FDA" | "NMPA";
  isoRef?: string;
  render: (size: number, color?: string) => React.ReactNode;
}

function SvgWrap({ size, children, viewBox = "0 0 200 200" }: { size: number; children: React.ReactNode; viewBox?: string }) {
  return (
    <svg width={size} height={size} viewBox={viewBox} fill="none" xmlns="http://www.w3.org/2000/svg" style={{ display: "block" }}>
      {children}
    </svg>
  );
}

export const MEDICAL_SYMBOLS: MedicalSymbol[] = [
  // ═══ GENERAL - 通用标识符号 ═══
  {
    id: "manufacturer", name: "Manufacturer", nameZh: "制造商", category: "general", regulation: "all", isoRef: "5.1.1",
    render: (s, c = "#000") => (
      <SvgWrap size={s}>
        <path d="M30 170V80L60 50L90 80V170H30Z M110 170V60L140 30L170 60V170H110Z" stroke={c} strokeWidth="8" fill="none" />
        <path d="M55 80L60 50L65 80" stroke={c} strokeWidth="5" fill="none" />
        <path d="M135 60L140 30L145 60" stroke={c} strokeWidth="5" fill="none" />
        <line x1="20" y1="170" x2="180" y2="170" stroke={c} strokeWidth="8" />
      </SvgWrap>
    ),
  },
  {
    id: "ecRep", name: "EC REP", nameZh: "欧盟授权代表", category: "general", regulation: "CE", isoRef: "5.1.2",
    render: (s, c = "#000") => (
      <SvgWrap size={s}>
        <rect x="10" y="40" width="180" height="120" rx="4" stroke={c} strokeWidth="8" fill="none" />
        <line x1="100" y1="40" x2="100" y2="160" stroke={c} strokeWidth="4" />
        <text x="55" y="115" textAnchor="middle" fontSize="42" fontWeight="bold" fontFamily="Arial" fill={c}>EC</text>
        <text x="145" y="115" textAnchor="middle" fontSize="36" fontWeight="bold" fontFamily="Arial" fill={c}>REP</text>
      </SvgWrap>
    ),
  },
  {
    id: "mfgDate", name: "Date of Manufacture", nameZh: "生产日期", category: "general", regulation: "all", isoRef: "5.1.3",
    render: (s, c = "#000") => (
      <SvgWrap size={s} viewBox="0 0 200 200">
        <rect x="20" y="10" width="100" height="90" rx="4" stroke={c} strokeWidth="6" fill="none" />
        <line x1="20" y1="35" x2="120" y2="35" stroke={c} strokeWidth="5" />
        <line x1="45" y1="5" x2="45" y2="20" stroke={c} strokeWidth="5" />
        <line x1="95" y1="5" x2="95" y2="20" stroke={c} strokeWidth="5" />
        <path d="M130 55 L175 35 L175 100 L130 100Z" stroke={c} strokeWidth="6" fill="none" />
        <line x1="175" y1="35" x2="175" y2="100" stroke={c} strokeWidth="6" />
        <rect x="20" y="120" width="160" height="60" rx="4" stroke={c} strokeWidth="5" fill="none" />
        <text x="100" y="162" textAnchor="middle" fontSize="30" fontFamily="Arial" fill={c}>YYYY-MM-DD</text>
      </SvgWrap>
    ),
  },
  {
    id: "expiryDate", name: "Use-by Date", nameZh: "有效期/使用期限", category: "general", regulation: "all", isoRef: "5.1.4",
    render: (s, c = "#000") => (
      <SvgWrap size={s} viewBox="0 0 200 200">
        <rect x="20" y="10" width="100" height="90" rx="4" stroke={c} strokeWidth="6" fill="none" />
        <line x1="20" y1="35" x2="120" y2="35" stroke={c} strokeWidth="5" />
        <line x1="45" y1="5" x2="45" y2="20" stroke={c} strokeWidth="5" />
        <line x1="95" y1="5" x2="95" y2="20" stroke={c} strokeWidth="5" />
        <path d="M130 55 L160 35 L175 55 L160 75 L130 55Z" stroke={c} strokeWidth="5" fill="none" />
        <path d="M160 75 L175 55 L190 75 L175 95 L160 75Z" stroke={c} strokeWidth="5" fill="none" />
        <rect x="20" y="120" width="160" height="60" rx="4" stroke={c} strokeWidth="5" fill="none" />
        <text x="100" y="162" textAnchor="middle" fontSize="30" fontFamily="Arial" fill={c}>YYYY-MM-DD</text>
      </SvgWrap>
    ),
  },
  {
    id: "lot", name: "Batch Code / LOT", nameZh: "批号", category: "general", regulation: "all", isoRef: "5.1.5",
    render: (s, c = "#000") => (
      <SvgWrap size={s}>
        <rect x="15" y="40" width="170" height="120" rx="4" stroke={c} strokeWidth="8" fill="none" />
        <text x="100" y="120" textAnchor="middle" fontSize="64" fontWeight="bold" fontFamily="Arial" fill={c}>LOT</text>
      </SvgWrap>
    ),
  },
  {
    id: "ref", name: "Catalogue Number", nameZh: "目录号/产品编号", category: "general", regulation: "all", isoRef: "5.1.6",
    render: (s, c = "#000") => (
      <SvgWrap size={s}>
        <rect x="15" y="40" width="170" height="120" rx="4" stroke={c} strokeWidth="8" fill="none" />
        <text x="100" y="120" textAnchor="middle" fontSize="60" fontWeight="bold" fontFamily="Arial" fill={c}>REF</text>
      </SvgWrap>
    ),
  },
  {
    id: "serialNo", name: "Serial Number", nameZh: "序列号", category: "general", regulation: "all", isoRef: "5.1.7",
    render: (s, c = "#000") => (
      <SvgWrap size={s}>
        <rect x="15" y="40" width="170" height="120" rx="4" stroke={c} strokeWidth="8" fill="none" />
        <text x="100" y="120" textAnchor="middle" fontSize="64" fontWeight="bold" fontFamily="Arial" fill={c}>SN</text>
      </SvgWrap>
    ),
  },
  {
    id: "qty", name: "Quantity", nameZh: "数量", category: "general", regulation: "all",
    render: (s, c = "#000") => (
      <SvgWrap size={s}>
        <rect x="15" y="40" width="170" height="120" rx="4" stroke={c} strokeWidth="8" fill="none" />
        <text x="100" y="120" textAnchor="middle" fontSize="56" fontWeight="bold" fontFamily="Arial" fill={c}>QTY</text>
      </SvgWrap>
    ),
  },

  // ═══ STERILIZATION - 灭菌相关符号 ═══
  {
    id: "sterile", name: "Sterile", nameZh: "无菌", category: "sterilization", regulation: "all", isoRef: "5.2.1",
    render: (s, c = "#000") => (
      <SvgWrap size={s}>
        <rect x="10" y="55" width="180" height="90" rx="4" stroke={c} strokeWidth="7" fill="none" />
        <text x="100" y="115" textAnchor="middle" fontSize="44" fontWeight="bold" fontFamily="Arial" fill={c}>STERILE</text>
      </SvgWrap>
    ),
  },
  {
    id: "sterileEO", name: "Sterilized using EO", nameZh: "环氧乙烷灭菌", category: "sterilization", regulation: "all", isoRef: "5.2.2",
    render: (s, c = "#000") => (
      <SvgWrap size={s} viewBox="0 0 280 200">
        <rect x="10" y="30" width="260" height="140" rx="4" stroke={c} strokeWidth="7" fill="none" />
        <line x1="170" y1="30" x2="170" y2="170" stroke={c} strokeWidth="4" />
        <text x="90" y="115" textAnchor="middle" fontSize="38" fontWeight="bold" fontFamily="Arial" fill={c}>STERILE</text>
        <text x="225" y="115" textAnchor="middle" fontSize="42" fontWeight="bold" fontFamily="Arial" fill={c}>EO</text>
      </SvgWrap>
    ),
  },
  {
    id: "sterileR", name: "Sterilized using irradiation", nameZh: "辐射灭菌", category: "sterilization", regulation: "all", isoRef: "5.2.3",
    render: (s, c = "#000") => (
      <SvgWrap size={s} viewBox="0 0 260 200">
        <rect x="10" y="30" width="240" height="140" rx="4" stroke={c} strokeWidth="7" fill="none" />
        <line x1="160" y1="30" x2="160" y2="170" stroke={c} strokeWidth="4" />
        <text x="85" y="115" textAnchor="middle" fontSize="38" fontWeight="bold" fontFamily="Arial" fill={c}>STERILE</text>
        <text x="200" y="115" textAnchor="middle" fontSize="48" fontWeight="bold" fontFamily="Arial" fill={c}>R</text>
      </SvgWrap>
    ),
  },
  {
    id: "sterileS", name: "Sterilized using steam/dry heat", nameZh: "蒸汽/干热灭菌", category: "sterilization", regulation: "all", isoRef: "5.2.4",
    render: (s, c = "#000") => (
      <SvgWrap size={s} viewBox="0 0 280 200">
        <rect x="10" y="30" width="260" height="140" rx="4" stroke={c} strokeWidth="7" fill="none" />
        <line x1="170" y1="30" x2="170" y2="170" stroke={c} strokeWidth="4" />
        <text x="90" y="115" textAnchor="middle" fontSize="38" fontWeight="bold" fontFamily="Arial" fill={c}>STERILE</text>
        <path d="M210 70 Q220 90 210 110 Q200 130 210 150" stroke={c} strokeWidth="5" fill="none" />
        <path d="M230 70 Q240 90 230 110 Q220 130 230 150" stroke={c} strokeWidth="5" fill="none" />
      </SvgWrap>
    ),
  },
  {
    id: "sterileA", name: "Sterilized using aseptic", nameZh: "无菌处理技术灭菌", category: "sterilization", regulation: "all", isoRef: "5.2.5",
    render: (s, c = "#000") => (
      <SvgWrap size={s} viewBox="0 0 280 200">
        <rect x="10" y="30" width="260" height="140" rx="4" stroke={c} strokeWidth="7" fill="none" />
        <line x1="170" y1="30" x2="170" y2="170" stroke={c} strokeWidth="4" />
        <text x="90" y="115" textAnchor="middle" fontSize="38" fontWeight="bold" fontFamily="Arial" fill={c}>STERILE</text>
        <text x="225" y="115" textAnchor="middle" fontSize="48" fontWeight="bold" fontFamily="Arial" fill={c}>A</text>
      </SvgWrap>
    ),
  },
  {
    id: "nonSterile", name: "Non-sterile", nameZh: "非无菌", category: "sterilization", regulation: "all", isoRef: "5.2.7",
    render: (s, c = "#000") => (
      <SvgWrap size={s}>
        <rect x="10" y="55" width="180" height="90" rx="4" stroke={c} strokeWidth="7" fill="none" />
        <text x="100" y="115" textAnchor="middle" fontSize="44" fontWeight="bold" fontFamily="Arial" fill={c}>STERILE</text>
        <line x1="10" y1="145" x2="190" y2="55" stroke={c} strokeWidth="7" />
      </SvgWrap>
    ),
  },
  {
    id: "doNotResterilize", name: "Do not resterilize", nameZh: "不可再灭菌", category: "sterilization", regulation: "all", isoRef: "5.2.6",
    render: (s, c = "#000") => (
      <SvgWrap size={s}>
        <rect x="25" y="60" width="150" height="80" rx="4" stroke={c} strokeWidth="6" fill="none" />
        <text x="100" y="115" textAnchor="middle" fontSize="38" fontWeight="bold" fontFamily="Arial" fill={c}>STERILE</text>
        <circle cx="100" cy="100" r="85" stroke={c} strokeWidth="7" fill="none" />
        <line x1="40" y1="160" x2="160" y2="40" stroke={c} strokeWidth="7" />
      </SvgWrap>
    ),
  },
  {
    id: "sterileVH2O2", name: "Sterilized using VH2O2", nameZh: "过氧化氢灭菌", category: "sterilization", regulation: "all",
    render: (s, c = "#000") => (
      <SvgWrap size={s} viewBox="0 0 340 200">
        <rect x="10" y="30" width="320" height="140" rx="4" stroke={c} strokeWidth="7" fill="none" />
        <line x1="170" y1="30" x2="170" y2="170" stroke={c} strokeWidth="4" />
        <text x="90" y="115" textAnchor="middle" fontSize="38" fontWeight="bold" fontFamily="Arial" fill={c}>STERILE</text>
        <text x="255" y="115" textAnchor="middle" fontSize="32" fontWeight="bold" fontFamily="Arial" fill={c}>VH₂O₂</text>
      </SvgWrap>
    ),
  },
  {
    id: "sterileFluidPath", name: "Sterile fluid path", nameZh: "无菌液路", category: "sterilization", regulation: "all", isoRef: "5.2.9",
    render: (s, c = "#000") => (
      <SvgWrap size={s} viewBox="0 0 280 200">
        <rect x="10" y="30" width="260" height="140" rx="4" stroke={c} strokeWidth="7" fill="none" />
        <line x1="170" y1="30" x2="170" y2="170" stroke={c} strokeWidth="4" />
        <text x="90" y="115" textAnchor="middle" fontSize="38" fontWeight="bold" fontFamily="Arial" fill={c}>STERILE</text>
        <path d="M195 70 L195 140 L255 140" stroke={c} strokeWidth="6" fill="none" />
        <circle cx="225" cy="90" r="20" stroke={c} strokeWidth="5" fill="none" />
      </SvgWrap>
    ),
  },

  // ═══ SAFETY - 安全/警告符号 ═══
  {
    id: "caution", name: "Caution", nameZh: "注意/警告", category: "safety", regulation: "all", isoRef: "5.4.4",
    render: (s, c = "#000") => (
      <SvgWrap size={s}>
        <path d="M100 20L185 170H15Z" stroke={c} strokeWidth="8" fill="none" strokeLinejoin="round" />
        <line x1="100" y1="70" x2="100" y2="125" stroke={c} strokeWidth="10" strokeLinecap="round" />
        <circle cx="100" cy="148" r="6" fill={c} />
      </SvgWrap>
    ),
  },
  {
    id: "consultIFU", name: "Consult instructions for use", nameZh: "参考使用说明", category: "safety", regulation: "all", isoRef: "5.4.3",
    render: (s, c = "#000") => (
      <SvgWrap size={s}>
        <rect x="25" y="20" width="150" height="110" rx="5" stroke={c} strokeWidth="7" fill="none" />
        <circle cx="100" cy="55" r="6" fill={c} />
        <line x1="100" y1="70" x2="100" y2="115" stroke={c} strokeWidth="8" strokeLinecap="round" />
        <rect x="60" y="140" width="80" height="8" rx="2" fill={c} />
        <rect x="70" y="155" width="60" height="8" rx="2" fill={c} />
        <rect x="80" y="170" width="40" height="8" rx="2" fill={c} />
      </SvgWrap>
    ),
  },
  {
    id: "doNotReuse", name: "Do not reuse", nameZh: "不可重复使用", category: "safety", regulation: "all", isoRef: "5.4.2",
    render: (s, c = "#000") => (
      <SvgWrap size={s}>
        <circle cx="100" cy="100" r="80" stroke={c} strokeWidth="8" fill="none" />
        <text x="100" y="125" textAnchor="middle" fontSize="90" fontWeight="bold" fontFamily="Arial" fill={c}>2</text>
        <line x1="40" y1="160" x2="160" y2="40" stroke={c} strokeWidth="8" />
      </SvgWrap>
    ),
  },
  {
    id: "biologicalRisk", name: "Biological risk", nameZh: "生物风险", category: "safety", regulation: "all", isoRef: "5.4.6",
    render: (s, c = "#000") => (
      <SvgWrap size={s}>
        <circle cx="100" cy="70" r="12" fill={c} />
        <path d="M100 82 C85 105 55 145 45 170 L100 135 L155 170 C145 145 115 105 100 82Z" fill={c} />
        <path d="M100 82 C120 95 160 105 180 105 L135 135 L155 170 C140 145 115 115 100 82Z" fill={c} />
        <path d="M100 82 C80 95 40 105 20 105 L65 135 L45 170 C60 145 85 115 100 82Z" fill={c} />
      </SvgWrap>
    ),
  },
  {
    id: "naturalRubberLatex", name: "Contains natural rubber latex", nameZh: "含天然橡胶乳胶", category: "safety", regulation: "all", isoRef: "5.4.5",
    render: (s, c = "#000") => (
      <SvgWrap size={s}>
        <circle cx="100" cy="100" r="80" stroke={c} strokeWidth="7" fill="none" />
        <text x="100" y="130" textAnchor="middle" fontSize="50" fontWeight="bold" fontFamily="Arial" fill={c}>Latex</text>
        <line x1="40" y1="160" x2="160" y2="40" stroke={c} strokeWidth="7" />
      </SvgWrap>
    ),
  },
  {
    id: "containsHazardous", name: "Contains hazardous substances", nameZh: "含有害物质", category: "safety", regulation: "all",
    render: (s, c = "#000") => (
      <SvgWrap size={s}>
        <path d="M100 15 L185 100 L100 185 L15 100Z" stroke={c} strokeWidth="8" fill="none" />
        <text x="100" y="120" textAnchor="middle" fontSize="80" fontWeight="bold" fontFamily="Arial" fill={c}>!</text>
      </SvgWrap>
    ),
  },

  // ═══ HANDLING - 搬运/存储符号 ═══
  {
    id: "keepFromSun", name: "Keep away from sunlight", nameZh: "避光", category: "handling", regulation: "all", isoRef: "5.3.2",
    render: (s, c = "#000") => (
      <SvgWrap size={s}>
        <circle cx="100" cy="100" r="30" stroke={c} strokeWidth="7" fill="none" />
        {[0, 45, 90, 135, 180, 225, 270, 315].map(angle => {
          const rad = (angle * Math.PI) / 180;
          const x1 = 100 + 40 * Math.cos(rad), y1 = 100 + 40 * Math.sin(rad);
          const x2 = 100 + 58 * Math.cos(rad), y2 = 100 + 58 * Math.sin(rad);
          return <line key={angle} x1={x1} y1={y1} x2={x2} y2={y2} stroke={c} strokeWidth="6" />;
        })}
        <line x1="25" y1="175" x2="175" y2="25" stroke={c} strokeWidth="8" />
      </SvgWrap>
    ),
  },
  {
    id: "keepFromHeat", name: "Keep away from heat", nameZh: "远离热源", category: "handling", regulation: "all", isoRef: "5.3.3",
    render: (s, c = "#000") => (
      <SvgWrap size={s}>
        <path d="M60 170 L60 80 Q60 40 100 40 Q140 40 140 80 L140 170" stroke={c} strokeWidth="7" fill="none" />
        <line x1="50" y1="170" x2="150" y2="170" stroke={c} strokeWidth="7" />
        <path d="M80 120 Q90 100 80 80" stroke={c} strokeWidth="4" fill="none" />
        <path d="M100 120 Q110 100 100 80" stroke={c} strokeWidth="4" fill="none" />
        <path d="M120 120 Q130 100 120 80" stroke={c} strokeWidth="4" fill="none" />
        <line x1="25" y1="175" x2="175" y2="25" stroke={c} strokeWidth="8" />
      </SvgWrap>
    ),
  },
  {
    id: "keepDry", name: "Keep dry", nameZh: "防潮", category: "handling", regulation: "all", isoRef: "5.3.4",
    render: (s, c = "#000") => (
      <SvgWrap size={s}>
        <path d="M40 30 L40 130 C40 160 65 180 100 180 C135 180 160 160 160 130 L160 30" stroke={c} strokeWidth="7" fill="none" />
        <line x1="40" y1="30" x2="160" y2="30" stroke={c} strokeWidth="7" />
        <path d="M80 90 L90 50 L100 90" stroke={c} strokeWidth="5" fill="none" />
        <path d="M100 120 L110 80 L120 120" stroke={c} strokeWidth="5" fill="none" />
      </SvgWrap>
    ),
  },
  {
    id: "tempLimit", name: "Temperature limitation", nameZh: "温度限制", category: "handling", regulation: "all", isoRef: "5.3.7",
    render: (s, c = "#000") => (
      <SvgWrap size={s}>
        <rect x="82" y="20" width="36" height="110" rx="18" stroke={c} strokeWidth="6" fill="none" />
        <circle cx="100" cy="155" r="30" stroke={c} strokeWidth="6" fill={c} />
        <rect x="90" y="55" width="20" height="85" fill={c} />
        <text x="155" y="50" fontSize="28" fontFamily="Arial" fill={c}>°C</text>
        <line x1="55" y1="25" x2="55" y2="185" stroke={c} strokeWidth="3" strokeDasharray="6 4" />
        <text x="30" y="50" fontSize="20" fontFamily="Arial" fill={c} textAnchor="middle">↑</text>
        <text x="30" y="180" fontSize="20" fontFamily="Arial" fill={c} textAnchor="middle">↓</text>
      </SvgWrap>
    ),
  },
  {
    id: "fragile", name: "Fragile, handle with care", nameZh: "易碎/小心轻放", category: "handling", regulation: "all", isoRef: "5.3.1",
    render: (s, c = "#000") => (
      <SvgWrap size={s}>
        <path d="M65 20 L65 80 L50 100 L100 180 L150 100 L135 80 L135 20Z" stroke={c} strokeWidth="7" fill="none" />
        <line x1="100" y1="80" x2="100" y2="140" stroke={c} strokeWidth="5" />
        <line x1="80" y1="60" x2="100" y2="80" stroke={c} strokeWidth="5" />
        <line x1="120" y1="60" x2="100" y2="80" stroke={c} strokeWidth="5" />
      </SvgWrap>
    ),
  },
  {
    id: "humidity", name: "Humidity limitation", nameZh: "湿度限制", category: "handling", regulation: "all", isoRef: "5.3.8",
    render: (s, c = "#000") => (
      <SvgWrap size={s}>
        <path d="M100 30 C100 30 50 90 50 130 C50 160 72 185 100 185 C128 185 150 160 150 130 C150 90 100 30 100 30Z" stroke={c} strokeWidth="7" fill="none" />
        <text x="100" y="145" textAnchor="middle" fontSize="40" fontWeight="bold" fontFamily="Arial" fill={c}>%</text>
      </SvgWrap>
    ),
  },
  {
    id: "atmosphericPressure", name: "Atmospheric pressure limitation", nameZh: "大气压限制", category: "handling", regulation: "all", isoRef: "5.3.9",
    render: (s, c = "#000") => (
      <SvgWrap size={s}>
        <circle cx="100" cy="100" r="75" stroke={c} strokeWidth="7" fill="none" />
        <text x="100" y="115" textAnchor="middle" fontSize="40" fontWeight="bold" fontFamily="Arial" fill={c}>kPa</text>
      </SvgWrap>
    ),
  },
  {
    id: "stackingLimit", name: "Stacking limit by number", nameZh: "堆码层数极限", category: "handling", regulation: "all",
    render: (s, c = "#000") => (
      <SvgWrap size={s}>
        <rect x="40" y="120" width="120" height="50" stroke={c} strokeWidth="6" fill="none" />
        <rect x="40" y="70" width="120" height="50" stroke={c} strokeWidth="6" fill="none" />
        <rect x="40" y="20" width="120" height="50" stroke={c} strokeWidth="6" fill="none" />
        <text x="100" y="55" textAnchor="middle" fontSize="30" fontWeight="bold" fontFamily="Arial" fill={c}>n</text>
      </SvgWrap>
    ),
  },

  // ═══ PACKAGING - 包装相关符号 ═══
  {
    id: "doNotUseIfDamaged", name: "Do not use if package damaged", nameZh: "包装破损不可使用", category: "packaging", regulation: "all", isoRef: "5.2.8",
    render: (s, c = "#000") => (
      <SvgWrap size={s}>
        <rect x="30" y="50" width="140" height="100" rx="5" stroke={c} strokeWidth="7" fill="none" />
        <path d="M80 50 L100 80 L120 50" stroke={c} strokeWidth="5" fill="none" />
        <circle cx="100" cy="100" r="85" stroke={c} strokeWidth="7" fill="none" />
        <line x1="40" y1="160" x2="160" y2="40" stroke={c} strokeWidth="7" />
      </SvgWrap>
    ),
  },
  {
    id: "singleSterileBarrier", name: "Single sterile barrier system", nameZh: "单层无菌屏障", category: "packaging", regulation: "all",
    render: (s, c = "#000") => (
      <SvgWrap size={s}>
        <ellipse cx="100" cy="100" rx="80" ry="55" stroke={c} strokeWidth="7" fill="none" />
        <text x="100" y="108" textAnchor="middle" fontSize="20" fontFamily="Arial" fill={c}>SBS</text>
      </SvgWrap>
    ),
  },
  {
    id: "doubleSterileBarrier", name: "Double sterile barrier system", nameZh: "双层无菌屏障", category: "packaging", regulation: "all",
    render: (s, c = "#000") => (
      <SvgWrap size={s}>
        <ellipse cx="100" cy="100" rx="85" ry="60" stroke={c} strokeWidth="7" fill="none" />
        <ellipse cx="100" cy="100" rx="65" ry="40" stroke={c} strokeWidth="7" fill="none" />
      </SvgWrap>
    ),
  },

  // ═══ IDENTIFICATION - 标识类符号 ═══
  {
    id: "udi", name: "Unique Device Identification", nameZh: "唯一器械标识", category: "identification", regulation: "all", isoRef: "5.7.10",
    render: (s, c = "#000") => (
      <SvgWrap size={s}>
        <rect x="10" y="50" width="180" height="100" rx="6" stroke={c} strokeWidth="8" fill={c} />
        <text x="100" y="118" textAnchor="middle" fontSize="56" fontWeight="bold" fontFamily="Arial" fill="#fff">UDI</text>
      </SvgWrap>
    ),
  },
  {
    id: "md", name: "Medical Device", nameZh: "医疗器械", category: "identification", regulation: "all", isoRef: "5.7.7",
    render: (s, c = "#000") => (
      <SvgWrap size={s}>
        <rect x="10" y="40" width="180" height="120" rx="6" stroke={c} strokeWidth="10" fill="none" />
        <text x="100" y="125" textAnchor="middle" fontSize="68" fontWeight="bold" fontFamily="Arial" fill={c}>MD</text>
      </SvgWrap>
    ),
  },
  {
    id: "ivd", name: "In Vitro Diagnostic", nameZh: "体外诊断", category: "identification", regulation: "all", isoRef: "5.5.1",
    render: (s, c = "#000") => (
      <SvgWrap size={s}>
        <rect x="10" y="40" width="180" height="120" rx="6" stroke={c} strokeWidth="10" fill="none" />
        <text x="100" y="125" textAnchor="middle" fontSize="60" fontWeight="bold" fontFamily="Arial" fill={c}>IVD</text>
      </SvgWrap>
    ),
  },
  {
    id: "importer", name: "Importer", nameZh: "进口商", category: "identification", regulation: "all",
    render: (s, c = "#000") => (
      <SvgWrap size={s}>
        <circle cx="75" cy="80" r="45" stroke={c} strokeWidth="6" fill="none" />
        <path d="M45 80 C45 55 75 35 75 35 C75 35 105 55 105 80" stroke={c} strokeWidth="4" fill="none" />
        <line x1="30" y1="72" x2="120" y2="72" stroke={c} strokeWidth="3" />
        <line x1="30" y1="88" x2="120" y2="88" stroke={c} strokeWidth="3" />
        <rect x="130" y="70" width="50" height="100" stroke={c} strokeWidth="5" fill="none" />
        <path d="M155 70 L155 40 L145 40 L155 20 L165 40 L155 40" fill={c} />
      </SvgWrap>
    ),
  },
  {
    id: "translation", name: "Translation", nameZh: "翻译", category: "identification", regulation: "all",
    render: (s, c = "#000") => (
      <SvgWrap size={s}>
        <text x="25" y="125" fontSize="65" fontWeight="bold" fontFamily="serif" fill={c}>A</text>
        <path d="M85 100 L125 100" stroke={c} strokeWidth="6" />
        <path d="M115 85 L130 100 L115 115" fill={c} />
        <text x="135" y="125" fontSize="55" fontWeight="bold" fontFamily="SimSun, serif" fill={c}>文</text>
      </SvgWrap>
    ),
  },
  {
    id: "nonPyrogenic", name: "Non-pyrogenic", nameZh: "非致热原", category: "identification", regulation: "all",
    render: (s, c = "#000") => (
      <SvgWrap size={s}>
        <circle cx="100" cy="100" r="75" stroke={c} strokeWidth="7" fill="none" />
        <path d="M75 140 L75 60 Q75 45 90 45 L110 45 Q125 45 125 60 L125 140" stroke={c} strokeWidth="6" fill="none" />
        <circle cx="100" cy="155" r="12" fill={c} />
        <line x1="40" y1="160" x2="160" y2="40" stroke={c} strokeWidth="7" />
      </SvgWrap>
    ),
  },
  {
    id: "containsBioHuman", name: "Biological material of human origin", nameZh: "含人源生物材料", category: "identification", regulation: "all",
    render: (s, c = "#000") => (
      <SvgWrap size={s}>
        <circle cx="100" cy="55" r="30" stroke={c} strokeWidth="6" fill="none" />
        <path d="M70 90 L70 180 L130 180 L130 90" stroke={c} strokeWidth="6" fill="none" />
        <line x1="70" y1="120" x2="130" y2="120" stroke={c} strokeWidth="4" />
      </SvgWrap>
    ),
  },
  {
    id: "containsBioAnimal", name: "Biological material of animal origin", nameZh: "含动物源生物材料", category: "identification", regulation: "all",
    render: (s, c = "#000") => (
      <SvgWrap size={s}>
        <circle cx="100" cy="55" r="30" stroke={c} strokeWidth="6" fill="none" strokeDasharray="10 5" />
        <path d="M70 90 L70 180 L130 180 L130 90" stroke={c} strokeWidth="6" fill="none" strokeDasharray="10 5" />
      </SvgWrap>
    ),
  },
  {
    id: "patientInfo", name: "Patient information website", nameZh: "患者信息网站", category: "identification", regulation: "all",
    render: (s, c = "#000") => (
      <SvgWrap size={s}>
        <circle cx="100" cy="50" r="25" stroke={c} strokeWidth="6" fill="none" />
        <path d="M70 80 L70 170 L130 170 L130 80" stroke={c} strokeWidth="6" fill="none" />
        <rect x="85" y="110" width="30" height="25" rx="3" stroke={c} strokeWidth="4" fill="none" />
        <circle cx="100" cy="122" r="4" fill={c} />
      </SvgWrap>
    ),
  },
  {
    id: "healthcareCentre", name: "Healthcare centre or doctor", nameZh: "医疗机构/医生", category: "identification", regulation: "all",
    render: (s, c = "#000") => (
      <SvgWrap size={s}>
        <circle cx="80" cy="55" r="28" stroke={c} strokeWidth="6" fill="none" />
        <path d="M52" y1="90" stroke={c} strokeWidth="6" fill="none" />
        <line x1="145" y1="40" x2="145" y2="110" stroke={c} strokeWidth="10" />
        <line x1="110" y1="75" x2="180" y2="75" stroke={c} strokeWidth="10" />
      </SvgWrap>
    ),
  },

  // ═══ REGULATORY - 法规特有符号 ═══
  {
    id: "ce", name: "CE Mark", nameZh: "CE认证标志", category: "regulatory", regulation: "CE",
    render: (s, c = "#000") => (
      <SvgWrap size={s} viewBox="0 0 300 200">
        <path d="M110 30 C50 30 20 65 20 100 C20 135 50 170 110 170 C140 170 160 155 170 140" stroke={c} strokeWidth="14" fill="none" strokeLinecap="round" />
        <path d="M200 30 C140 30 110 65 110 100 C110 135 140 170 200 170 C230 170 250 155 260 140" stroke={c} strokeWidth="14" fill="none" strokeLinecap="round" />
        <line x1="110" y1="90" x2="200" y2="90" stroke={c} strokeWidth="10" />
        <line x1="110" y1="110" x2="190" y2="110" stroke={c} strokeWidth="10" />
      </SvgWrap>
    ),
  },
  {
    id: "ceWithNB", name: "CE Mark with Notified Body", nameZh: "CE标志(含公告机构号)", category: "regulatory", regulation: "CE",
    render: (s, c = "#000") => (
      <SvgWrap size={s} viewBox="0 0 300 250">
        <path d="M110 30 C50 30 20 65 20 100 C20 135 50 170 110 170 C140 170 160 155 170 140" stroke={c} strokeWidth="14" fill="none" strokeLinecap="round" />
        <path d="M200 30 C140 30 110 65 110 100 C110 135 140 170 200 170 C230 170 250 155 260 140" stroke={c} strokeWidth="14" fill="none" strokeLinecap="round" />
        <line x1="110" y1="90" x2="200" y2="90" stroke={c} strokeWidth="10" />
        <line x1="110" y1="110" x2="190" y2="110" stroke={c} strokeWidth="10" />
        <text x="150" y="225" textAnchor="middle" fontSize="48" fontWeight="bold" fontFamily="Arial" fill={c}>0000</text>
      </SvgWrap>
    ),
  },
  {
    id: "ukca", name: "UKCA Mark", nameZh: "英国合格评定标志", category: "regulatory", regulation: "CE",
    render: (s, c = "#000") => (
      <SvgWrap size={s}>
        <text x="100" y="80" textAnchor="middle" fontSize="48" fontWeight="bold" fontFamily="Arial" fill={c}>UKCA</text>
        <path d="M25 95 L175 95" stroke={c} strokeWidth="3" />
        <text x="100" y="130" textAnchor="middle" fontSize="20" fontFamily="Arial" fill={c}>UK Conformity</text>
        <text x="100" y="155" textAnchor="middle" fontSize="20" fontFamily="Arial" fill={c}>Assessed</text>
      </SvgWrap>
    ),
  },
  {
    id: "rxOnly", name: "Rx Only", nameZh: "处方器械", category: "regulatory", regulation: "FDA",
    render: (s, c = "#000") => (
      <SvgWrap size={s}>
        <text x="30" y="120" fontSize="72" fontWeight="bold" fontFamily="serif" fill={c}>R</text>
        <text x="85" y="135" fontSize="42" fontFamily="serif" fill={c}>x</text>
        <text x="120" y="125" fontSize="40" fontFamily="Arial" fill={c}>Only</text>
      </SvgWrap>
    ),
  },
  {
    id: "fdaCleared", name: "FDA Cleared", nameZh: "FDA批准", category: "regulatory", regulation: "FDA",
    render: (s, c = "#000") => (
      <SvgWrap size={s}>
        <rect x="15" y="40" width="170" height="120" rx="8" stroke={c} strokeWidth="8" fill="none" />
        <text x="100" y="105" textAnchor="middle" fontSize="42" fontWeight="bold" fontFamily="Arial" fill={c}>FDA</text>
        <text x="100" y="145" textAnchor="middle" fontSize="22" fontFamily="Arial" fill={c}>Cleared</text>
      </SvgWrap>
    ),
  },
  {
    id: "nmpa", name: "NMPA", nameZh: "国家药监局", category: "regulatory", regulation: "NMPA",
    render: (s, c = "#000") => (
      <SvgWrap size={s}>
        <rect x="15" y="40" width="170" height="120" rx="8" stroke={c} strokeWidth="8" fill="none" />
        <text x="100" y="105" textAnchor="middle" fontSize="38" fontWeight="bold" fontFamily="Arial" fill={c}>NMPA</text>
        <text x="100" y="145" textAnchor="middle" fontSize="18" fontFamily="Arial" fill={c}>国家药监局</text>
      </SvgWrap>
    ),
  },
  {
    id: "srn", name: "SRN", nameZh: "单一注册号", category: "regulatory", regulation: "CE",
    render: (s, c = "#000") => (
      <SvgWrap size={s}>
        <rect x="15" y="40" width="170" height="120" rx="4" stroke={c} strokeWidth="8" fill="none" />
        <text x="100" y="120" textAnchor="middle" fontSize="60" fontWeight="bold" fontFamily="Arial" fill={c}>SRN</text>
      </SvgWrap>
    ),
  },
  {
    id: "control", name: "Control", nameZh: "对照", category: "regulatory", regulation: "NMPA",
    render: (s, c = "#000") => (
      <SvgWrap size={s}>
        <rect x="10" y="50" width="180" height="100" rx="4" stroke={c} strokeWidth="7" fill="none" />
        <text x="100" y="115" textAnchor="middle" fontSize="40" fontWeight="bold" fontFamily="Arial" fill={c}>CONTROL</text>
      </SvgWrap>
    ),
  },
  {
    id: "samplingSize", name: "Sampling size", nameZh: "取样量", category: "regulatory", regulation: "NMPA",
    render: (s, c = "#000") => (
      <SvgWrap size={s}>
        <circle cx="100" cy="100" r="75" stroke={c} strokeWidth="7" fill="none" />
        <text x="100" y="125" textAnchor="middle" fontSize="70" fontFamily="serif" fill={c}>Σ</text>
      </SvgWrap>
    ),
  },
];

// ── 按分类获取符号 ──
export function getSymbolsByCategory(category: MedicalSymbol["category"]) {
  return MEDICAL_SYMBOLS.filter(s => s.category === category);
}

export function getSymbolsByRegulation(regulation: MedicalSymbol["regulation"]) {
  if (regulation === "all") return MEDICAL_SYMBOLS;
  return MEDICAL_SYMBOLS.filter(s => s.regulation === "all" || s.regulation === regulation);
}

export function getSymbolById(id: string) {
  return MEDICAL_SYMBOLS.find(s => s.id === id);
}

// ── 渲染符号 ──
export function renderMedicalSymbol(symbolId: string, size: number = 24, color: string = "#000"): React.ReactNode {
  const sym = getSymbolById(symbolId);
  if (!sym) return null;
  return sym.render(size, color);
}

// ── 分类标签 ──
export const CATEGORY_LABELS: Record<MedicalSymbol["category"], { en: string; zh: string }> = {
  general: { en: "General", zh: "通用标识" },
  sterilization: { en: "Sterilization", zh: "灭菌相关" },
  handling: { en: "Handling & Storage", zh: "搬运/存储" },
  safety: { en: "Safety & Warning", zh: "安全/警告" },
  packaging: { en: "Packaging", zh: "包装相关" },
  identification: { en: "Identification", zh: "标识类" },
  regulatory: { en: "Regulatory", zh: "法规特有" },
};

export type MedicalSymbolId = string;
