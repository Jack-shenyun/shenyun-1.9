export type BoardMetricCard = {
  id: string;
  label: string;
  value: string;
  helper?: string;
  tone?: "normal" | "warning" | "danger";
};

export type BoardTrendRow = {
  label: string;
  primary: number;
  secondary?: number;
};

export type BoardBreakdownRow = {
  label: string;
  count: number;
  amount?: string;
};

export type BoardFocusRow = {
  title: string;
  subtitle?: string;
  value: string;
  extra?: string;
  tone?: "normal" | "warning" | "danger";
};

export type BoardRankingRow = {
  label: string;
  value: number;
  formattedValue: string;
  helper?: string;
  tone?: "normal" | "warning" | "danger";
};

export type DepartmentBoardResponse = {
  boardId: string;
  title: string;
  subtitle: string;
  periodLabel: string;
  summaryCards: BoardMetricCard[];
  trend: {
    title: string;
    primaryLabel: string;
    secondaryLabel: string;
    rows: BoardTrendRow[];
  };
  breakdownTitle: string;
  breakdown: BoardBreakdownRow[];
  focusTitle: string;
  focusRows: BoardFocusRow[];
};

export type BossBoardResponse = {
  title: string;
  subtitle: string;
  periodLabel: string;
  overviewCards: BoardMetricCard[];
  salesCards: BoardMetricCard[];
  productionCards: BoardMetricCard[];
  purchaseCards: BoardMetricCard[];
  qualityCards: BoardMetricCard[];
  peopleCards: BoardMetricCard[];
  trend: {
    title: string;
    primaryLabel: string;
    secondaryLabel: string;
    rows: BoardTrendRow[];
  };
  salesCustomerTop: BoardRankingRow[];
  salesProductTop: BoardRankingRow[];
  priceWatch: BoardFocusRow[];
  supplierWatch: BoardFocusRow[];
  complianceWatch: BoardFocusRow[];
  risks: BoardFocusRow[];
};
