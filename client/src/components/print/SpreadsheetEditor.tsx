/**
 * SpreadsheetEditor - 类 Excel 电子表格打印模板编辑器
 * 
 * 功能：
 * - 类 Excel 网格编辑（行号 + 列标 A/B/C...）
 * - 单元格编辑、合并单元格
 * - 格式化工具栏（字体、字号、加粗、斜体、下划线、对齐、边框、背景色）
 * - 左侧字段面板，拖拽字段到单元格
 * - 所见即所得：编辑器内容 = 预览 = 打印输出
 */
import { useState, useRef, useCallback, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Bold, Italic, Underline, AlignLeft, AlignCenter, AlignRight,
  ChevronDown, ChevronRight, Eye, Printer, Save, RotateCcw,
  ArrowLeft, Paintbrush, Type, Grid3X3, Merge, SplitSquareHorizontal,
  Trash2,
} from "lucide-react";

// ==================== 类型定义 ====================

export interface CellData {
  value: string;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  fontSize?: number;
  fontFamily?: string;
  textAlign?: "left" | "center" | "right";
  verticalAlign?: "top" | "middle" | "bottom";
  bgColor?: string;
  color?: string;
  borderTop?: string;
  borderRight?: string;
  borderBottom?: string;
  borderLeft?: string;
  rowSpan?: number;
  colSpan?: number;
  merged?: boolean; // true = 被其他单元格合并覆盖
  mergeParent?: string; // "row,col" 指向合并的主单元格
}

export interface SpreadsheetData {
  cells: Record<string, CellData>; // key = "row,col"
  rowCount: number;
  colCount: number;
  colWidths: number[]; // 每列宽度
  rowHeights: number[]; // 每行高度
  paperSize: string;
  orientation: string;
  marginTop: number;
  marginRight: number;
  marginBottom: number;
  marginLeft: number;
}

export interface FieldDefinition {
  key: string;
  label: string;
  type: "string" | "number" | "date" | "array" | "boolean";
  children?: FieldDefinition[];
  icon?: string;
}

export interface FieldGroup {
  name: string;
  icon?: string;
  fields: FieldDefinition[];
  expanded?: boolean;
}

interface Selection {
  startRow: number;
  startCol: number;
  endRow: number;
  endCol: number;
}

// ==================== 工具函数 ====================

function colLabel(col: number): string {
  let label = "";
  let c = col;
  while (c >= 0) {
    label = String.fromCharCode(65 + (c % 26)) + label;
    c = Math.floor(c / 26) - 1;
  }
  return label;
}

function cellKey(row: number, col: number): string {
  return `${row},${col}`;
}

function parseCellKey(key: string): [number, number] {
  const [r, c] = key.split(",").map(Number);
  return [r, c];
}

function getDefaultCell(): CellData {
  return {
    value: "",
    fontSize: 9,
    fontFamily: "宋体",
    textAlign: "left",
    verticalAlign: "middle",
    borderTop: "1px solid #d0d0d0",
    borderRight: "1px solid #d0d0d0",
    borderBottom: "1px solid #d0d0d0",
    borderLeft: "1px solid #d0d0d0",
  };
}

export function createEmptySpreadsheet(rows = 35, cols = 8): SpreadsheetData {
  return {
    cells: {},
    rowCount: rows,
    colCount: cols,
    colWidths: Array(cols).fill(100),
    rowHeights: Array(rows).fill(24),
    paperSize: "A4",
    orientation: "portrait",
    marginTop: 15,
    marginRight: 10,
    marginBottom: 15,
    marginLeft: 10,
  };
}

function getPaperMetrics(paperSize = "A4", orientation = "portrait") {
  const base = (() => {
    switch (paperSize) {
      case "A5":
        return { widthMm: 148, heightMm: 210 };
      case "Letter":
        return { widthMm: 216, heightMm: 279 };
      case "A4":
      default:
        return { widthMm: 210, heightMm: 297 };
    }
  })();

  return orientation === "landscape"
    ? { widthMm: base.heightMm, heightMm: base.widthMm }
    : base;
}

const MM_TO_PX = 96 / 25.4;
const MIN_COLUMN_WIDTH = 48;
const MAX_COLUMN_WIDTH = 220;

function estimateCellWidth(value: string) {
  const text = String(value || "")
    .replace(/\{\{#each\s+[\w.]+\}\}/g, "")
    .replace(/\{\{\/each\}\}/g, "")
    .replace(/\$\{([^}]+)\}/g, "$1")
    .trim();
  if (!text) return MIN_COLUMN_WIDTH;
  const longestLineLength = text.split(/\r?\n/).reduce((max, line) => Math.max(max, line.length), 0);
  const hasChinese = /[\u4e00-\u9fa5]/.test(text);
  const charWidth = hasChinese ? 12 : 7;
  return Math.max(MIN_COLUMN_WIDTH, Math.min(MAX_COLUMN_WIDTH, longestLineLength * charWidth + 24));
}

function distributeWidthsToFit(baseWidths: number[], availableWidth: number) {
  if (baseWidths.length === 0) return [];
  const safeAvailable = Math.max(baseWidths.length * MIN_COLUMN_WIDTH, Math.round(availableWidth));
  const total = baseWidths.reduce((sum, width) => sum + width, 0) || 1;
  const widths = baseWidths.map((width) => Math.max(MIN_COLUMN_WIDTH, Math.round((width / total) * safeAvailable)));
  let diff = safeAvailable - widths.reduce((sum, width) => sum + width, 0);

  if (diff > 0) {
    let index = 0;
    while (diff > 0) {
      widths[index % widths.length] += 1;
      diff -= 1;
      index += 1;
    }
  } else if (diff < 0) {
    diff = Math.abs(diff);
    while (diff > 0) {
      let changed = false;
      for (let i = widths.length - 1; i >= 0 && diff > 0; i -= 1) {
        if (widths[i] > MIN_COLUMN_WIDTH) {
          widths[i] -= 1;
          diff -= 1;
          changed = true;
        }
      }
      if (!changed) break;
    }
  }

  return widths;
}

function autoFitColumnWidths(data: SpreadsheetData) {
  const { widthMm } = getPaperMetrics(data.paperSize, data.orientation);
  const availableWidth = Math.max(
    data.colCount * MIN_COLUMN_WIDTH,
    Math.round(widthMm * MM_TO_PX - Number(data.marginLeft || 0) - Number(data.marginRight || 0) - 40),
  );
  const estimatedWidths = Array.from({ length: data.colCount }, (_, colIndex) => {
    let maxWidth = Math.max(MIN_COLUMN_WIDTH, Number(data.colWidths[colIndex] || MIN_COLUMN_WIDTH));
    for (let rowIndex = 0; rowIndex < data.rowCount; rowIndex += 1) {
      const cell = data.cells[cellKey(rowIndex, colIndex)];
      if (!cell || cell.merged) continue;
      const span = Math.max(1, Number(cell.colSpan || 1));
      const estimated = Math.ceil(estimateCellWidth(cell.value) / span);
      maxWidth = Math.max(maxWidth, estimated);
    }
    return Math.min(MAX_COLUMN_WIDTH, maxWidth);
  });

  return distributeWidthsToFit(estimatedWidths, availableWidth);
}

function updateSpreadsheetMeta(
  data: SpreadsheetData,
  onChange: (data: SpreadsheetData) => void,
  updates: Partial<Pick<SpreadsheetData, "paperSize" | "orientation" | "marginTop" | "marginRight" | "marginBottom" | "marginLeft">>,
) {
  const nextData: SpreadsheetData = {
    ...data,
    ...updates,
  };
  if (
    updates.paperSize !== undefined
    || updates.orientation !== undefined
    || updates.marginLeft !== undefined
    || updates.marginRight !== undefined
  ) {
    nextData.colWidths = autoFitColumnWidths(nextData);
  }
  onChange(nextData);
}

// ==================== 将 SpreadsheetData 转为 HTML（用于预览和打印）====================

export function spreadsheetToHtml(data: SpreadsheetData): string {
  const { cells, rowCount, colCount, colWidths } = data;
  let html = `<table style="border-collapse:collapse;width:100%;table-layout:fixed;">`;
  // colgroup
  html += `<colgroup>`;
  for (let c = 0; c < colCount; c++) {
    html += `<col style="width:${colWidths[c] || 100}px;">`;
  }
  html += `</colgroup>`;

  for (let r = 0; r < rowCount; r++) {
    const rh = data.rowHeights[r] || 24;
    html += `<tr style="height:${rh}px;">`;
    for (let c = 0; c < colCount; c++) {
      const key = cellKey(r, c);
      const cell = cells[key];
      if (cell?.merged) continue; // 被合并的单元格跳过

      const cd = cell || getDefaultCell();
      const rs = cd.rowSpan && cd.rowSpan > 1 ? ` rowspan="${cd.rowSpan}"` : "";
      const cs = cd.colSpan && cd.colSpan > 1 ? ` colspan="${cd.colSpan}"` : "";

      let style = `padding:2px 4px;`;
      if (cd.fontSize) style += `font-size:${cd.fontSize}pt;`;
      if (cd.fontFamily) style += `font-family:${cd.fontFamily};`;
      if (cd.bold) style += `font-weight:bold;`;
      if (cd.italic) style += `font-style:italic;`;
      if (cd.underline) style += `text-decoration:underline;`;
      if (cd.textAlign) style += `text-align:${cd.textAlign};`;
      if (cd.verticalAlign) style += `vertical-align:${cd.verticalAlign};`;
      if (cd.bgColor) style += `background-color:${cd.bgColor};`;
      if (cd.color) style += `color:${cd.color};`;
      if (cd.borderTop) style += `border-top:${cd.borderTop};`;
      if (cd.borderRight) style += `border-right:${cd.borderRight};`;
      if (cd.borderBottom) style += `border-bottom:${cd.borderBottom};`;
      if (cd.borderLeft) style += `border-left:${cd.borderLeft};`;

      // 处理变量值显示
      const displayValue = cd.value || "";
      html += `<td${rs}${cs} style="${style}">${displayValue}</td>`;
    }
    html += `</tr>`;
  }
  html += `</table>`;
  return html;
}

// ==================== 主组件 ====================

interface SpreadsheetEditorProps {
  data: SpreadsheetData;
  onChange: (data: SpreadsheetData) => void;
  fieldGroups: FieldGroup[];
  onSave?: () => void;
  onPreview?: () => void;
  onPrint?: () => void;
  onBack?: () => void;
  onReset?: () => void;
  templateName?: string;
  saving?: boolean;
}

export default function SpreadsheetEditor({
  data, onChange, fieldGroups, onSave, onPreview, onPrint, onBack, onReset,
  templateName = "模板", saving = false,
}: SpreadsheetEditorProps) {
  const [selectedCell, setSelectedCell] = useState<{ row: number; col: number } | null>(null);
  const [selection, setSelection] = useState<Selection | null>(null);
  const [editingCell, setEditingCell] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});
  const [isDragging, setIsDragging] = useState(false);
  const [dragStartCell, setDragStartCell] = useState<{ row: number; col: number } | null>(null);
  const [resizingCol, setResizingCol] = useState<number | null>(null);
  const [resizingRow, setResizingRow] = useState<number | null>(null);
  const [resizeStart, setResizeStart] = useState<{ x: number; y: number; size: number }>({ x: 0, y: 0, size: 0 });
  const tableRef = useRef<HTMLDivElement>(null);
  const editInputRef = useRef<HTMLInputElement>(null);

  // 获取单元格数据
  const getCell = useCallback((row: number, col: number): CellData => {
    return data.cells[cellKey(row, col)] || getDefaultCell();
  }, [data.cells]);

  // 更新单元格
  const updateCell = useCallback((row: number, col: number, updates: Partial<CellData>) => {
    const key = cellKey(row, col);
    const existing = data.cells[key] || getDefaultCell();
    const newCells = { ...data.cells, [key]: { ...existing, ...updates } };
    onChange({ ...data, cells: newCells });
  }, [data, onChange]);

  // 批量更新选中区域的单元格
  const updateSelectedCells = useCallback((updates: Partial<CellData>) => {
    if (!selection) {
      if (selectedCell) {
        updateCell(selectedCell.row, selectedCell.col, updates);
      }
      return;
    }
    const minR = Math.min(selection.startRow, selection.endRow);
    const maxR = Math.max(selection.startRow, selection.endRow);
    const minC = Math.min(selection.startCol, selection.endCol);
    const maxC = Math.max(selection.startCol, selection.endCol);
    const newCells = { ...data.cells };
    for (let r = minR; r <= maxR; r++) {
      for (let c = minC; c <= maxC; c++) {
        const key = cellKey(r, c);
        const existing = newCells[key] || getDefaultCell();
        if (!existing.merged) {
          newCells[key] = { ...existing, ...updates };
        }
      }
    }
    onChange({ ...data, cells: newCells });
  }, [data, onChange, selection, selectedCell, updateCell]);

  // 当前选中单元格的数据
  const currentCell = useMemo(() => {
    if (selectedCell) return getCell(selectedCell.row, selectedCell.col);
    return getDefaultCell();
  }, [selectedCell, getCell]);
  const paperMetrics = useMemo(
    () => getPaperMetrics(data.paperSize, data.orientation),
    [data.paperSize, data.orientation],
  );
  const gridWidth = useMemo(
    () => data.colWidths.reduce((sum, width) => sum + Number(width || 100), 40),
    [data.colWidths],
  );

  // 合并单元格
  const mergeCells = useCallback(() => {
    if (!selection) return;
    const minR = Math.min(selection.startRow, selection.endRow);
    const maxR = Math.max(selection.startRow, selection.endRow);
    const minC = Math.min(selection.startCol, selection.endCol);
    const maxC = Math.max(selection.startCol, selection.endCol);
    if (minR === maxR && minC === maxC) return;

    const newCells = { ...data.cells };
    const mainKey = cellKey(minR, minC);
    const mainCell = newCells[mainKey] || getDefaultCell();
    newCells[mainKey] = {
      ...mainCell,
      rowSpan: maxR - minR + 1,
      colSpan: maxC - minC + 1,
    };

    for (let r = minR; r <= maxR; r++) {
      for (let c = minC; c <= maxC; c++) {
        if (r === minR && c === minC) continue;
        const key = cellKey(r, c);
        newCells[key] = {
          ...getDefaultCell(),
          merged: true,
          mergeParent: mainKey,
        };
      }
    }
    onChange({ ...data, cells: newCells });
    toast.success("单元格已合并");
  }, [data, onChange, selection]);

  // 拆分单元格
  const unmerge = useCallback(() => {
    if (!selectedCell) return;
    const key = cellKey(selectedCell.row, selectedCell.col);
    const cell = data.cells[key];
    if (!cell || (!cell.rowSpan && !cell.colSpan)) return;

    const rs = cell.rowSpan || 1;
    const cs = cell.colSpan || 1;
    const newCells = { ...data.cells };
    newCells[key] = { ...cell, rowSpan: undefined, colSpan: undefined };

    for (let r = selectedCell.row; r < selectedCell.row + rs; r++) {
      for (let c = selectedCell.col; c < selectedCell.col + cs; c++) {
        if (r === selectedCell.row && c === selectedCell.col) continue;
        const k = cellKey(r, c);
        newCells[k] = getDefaultCell();
      }
    }
    onChange({ ...data, cells: newCells });
    toast.success("单元格已拆分");
  }, [data, onChange, selectedCell]);

  // 添加/删除行列
  const addRow = useCallback(() => {
    onChange({
      ...data,
      rowCount: data.rowCount + 1,
      rowHeights: [...data.rowHeights, 24],
    });
  }, [data, onChange]);

  const addCol = useCallback(() => {
    onChange({
      ...data,
      colCount: data.colCount + 1,
      colWidths: [...data.colWidths, 100],
    });
  }, [data, onChange]);

  const deleteRow = useCallback(() => {
    if (!selectedCell || data.rowCount <= 1) return;
    const r = selectedCell.row;
    const newCells: Record<string, CellData> = {};
    for (const [key, cell] of Object.entries(data.cells)) {
      const [cr, cc] = parseCellKey(key);
      if (cr < r) newCells[key] = cell;
      else if (cr > r) newCells[cellKey(cr - 1, cc)] = cell;
    }
    onChange({
      ...data,
      cells: newCells,
      rowCount: data.rowCount - 1,
      rowHeights: data.rowHeights.filter((_, i) => i !== r),
    });
  }, [data, onChange, selectedCell]);

  const deleteCol = useCallback(() => {
    if (!selectedCell || data.colCount <= 1) return;
    const c = selectedCell.col;
    const newCells: Record<string, CellData> = {};
    for (const [key, cell] of Object.entries(data.cells)) {
      const [cr, cc] = parseCellKey(key);
      if (cc < c) newCells[key] = cell;
      else if (cc > c) newCells[cellKey(cr, cc - 1)] = cell;
    }
    onChange({
      ...data,
      cells: newCells,
      colCount: data.colCount - 1,
      colWidths: data.colWidths.filter((_, i) => i !== c),
    });
  }, [data, onChange, selectedCell]);

  // 单元格点击
  const handleCellClick = useCallback((row: number, col: number, e: React.MouseEvent) => {
    // 检查是否是被合并的单元格
    const cell = data.cells[cellKey(row, col)];
    if (cell?.merged && cell.mergeParent) {
      const [pr, pc] = parseCellKey(cell.mergeParent);
      setSelectedCell({ row: pr, col: pc });
      setSelection(null);
    } else {
      setSelectedCell({ row, col });
      setSelection(null);
    }
    if (editingCell) {
      // 提交当前编辑
      commitEdit();
    }
  }, [data.cells, editingCell]);

  // 双击进入编辑
  const handleCellDoubleClick = useCallback((row: number, col: number) => {
    const cell = data.cells[cellKey(row, col)];
    if (cell?.merged && cell.mergeParent) {
      const [pr, pc] = parseCellKey(cell.mergeParent);
      setEditingCell(cellKey(pr, pc));
      setEditValue(data.cells[cellKey(pr, pc)]?.value || "");
    } else {
      setEditingCell(cellKey(row, col));
      setEditValue(cell?.value || "");
    }
    setTimeout(() => editInputRef.current?.focus(), 50);
  }, [data.cells]);

  // 提交编辑
  const commitEdit = useCallback(() => {
    if (editingCell) {
      const [r, c] = parseCellKey(editingCell);
      updateCell(r, c, { value: editValue });
      setEditingCell(null);
    }
  }, [editingCell, editValue, updateCell]);

  // 鼠标拖拽选择
  const handleMouseDown = useCallback((row: number, col: number, e: React.MouseEvent) => {
    if (e.button !== 0) return;
    const cell = data.cells[cellKey(row, col)];
    let actualRow = row, actualCol = col;
    if (cell?.merged && cell.mergeParent) {
      const [pr, pc] = parseCellKey(cell.mergeParent);
      actualRow = pr;
      actualCol = pc;
    }
    setDragStartCell({ row: actualRow, col: actualCol });
    setIsDragging(true);
    setSelection({ startRow: actualRow, startCol: actualCol, endRow: actualRow, endCol: actualCol });
    setSelectedCell({ row: actualRow, col: actualCol });
  }, [data.cells]);

  const handleMouseMove = useCallback((row: number, col: number) => {
    if (!isDragging || !dragStartCell) return;
    setSelection({
      startRow: dragStartCell.row,
      startCol: dragStartCell.col,
      endRow: row,
      endCol: col,
    });
  }, [isDragging, dragStartCell]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
    setDragStartCell(null);
    // 如果选择区域只有一个单元格，清除 selection
    if (selection && selection.startRow === selection.endRow && selection.startCol === selection.endCol) {
      setSelection(null);
    }
  }, [selection]);

  // 列宽调整
  const handleColResizeStart = useCallback((col: number, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setResizingCol(col);
    setResizeStart({ x: e.clientX, y: 0, size: data.colWidths[col] || 100 });
  }, [data.colWidths]);

  // 行高调整
  const handleRowResizeStart = useCallback((row: number, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setResizingRow(row);
    setResizeStart({ x: 0, y: e.clientY, size: data.rowHeights[row] || 24 });
  }, [data.rowHeights]);

  useEffect(() => {
    if (resizingCol === null && resizingRow === null) return;
    const handleMove = (e: MouseEvent) => {
      if (resizingCol !== null) {
        const diff = e.clientX - resizeStart.x;
        const newWidth = Math.max(30, resizeStart.size + diff);
        const newWidths = [...data.colWidths];
        newWidths[resizingCol] = newWidth;
        onChange({ ...data, colWidths: newWidths });
      }
      if (resizingRow !== null) {
        const diff = e.clientY - resizeStart.y;
        const newHeight = Math.max(18, resizeStart.size + diff);
        const newHeights = [...data.rowHeights];
        newHeights[resizingRow] = newHeight;
        onChange({ ...data, rowHeights: newHeights });
      }
    };
    const handleUp = () => {
      setResizingCol(null);
      setResizingRow(null);
    };
    window.addEventListener("mousemove", handleMove);
    window.addEventListener("mouseup", handleUp);
    return () => {
      window.removeEventListener("mousemove", handleMove);
      window.removeEventListener("mouseup", handleUp);
    };
  }, [resizingCol, resizingRow, resizeStart, data, onChange]);

  // 拖拽字段到单元格
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
  }, []);

  const handleDrop = useCallback((row: number, col: number, e: React.DragEvent) => {
    e.preventDefault();
    const fieldKey = e.dataTransfer.getData("text/plain");
    if (fieldKey) {
      updateCell(row, col, { value: `\${${fieldKey}}` });
    }
  }, [updateCell]);

  // 键盘导航
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (editingCell) {
        if (e.key === "Enter") {
          commitEdit();
          // 移到下一行
          if (selectedCell && selectedCell.row < data.rowCount - 1) {
            setSelectedCell({ row: selectedCell.row + 1, col: selectedCell.col });
          }
        } else if (e.key === "Escape") {
          setEditingCell(null);
        } else if (e.key === "Tab") {
          e.preventDefault();
          commitEdit();
          if (selectedCell && selectedCell.col < data.colCount - 1) {
            setSelectedCell({ row: selectedCell.row, col: selectedCell.col + 1 });
          }
        }
        return;
      }

      if (!selectedCell) return;
      const { row, col } = selectedCell;

      switch (e.key) {
        case "ArrowUp":
          e.preventDefault();
          if (row > 0) setSelectedCell({ row: row - 1, col });
          break;
        case "ArrowDown":
          e.preventDefault();
          if (row < data.rowCount - 1) setSelectedCell({ row: row + 1, col });
          break;
        case "ArrowLeft":
          e.preventDefault();
          if (col > 0) setSelectedCell({ row, col: col - 1 });
          break;
        case "ArrowRight":
          e.preventDefault();
          if (col < data.colCount - 1) setSelectedCell({ row, col: col + 1 });
          break;
        case "Enter":
          e.preventDefault();
          handleCellDoubleClick(row, col);
          break;
        case "Delete":
        case "Backspace":
          e.preventDefault();
          updateCell(row, col, { value: "" });
          break;
        case "F2":
          e.preventDefault();
          handleCellDoubleClick(row, col);
          break;
        default:
          // 直接输入字符进入编辑模式
          if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
            setEditingCell(cellKey(row, col));
            setEditValue(e.key);
            setTimeout(() => editInputRef.current?.focus(), 50);
          }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [editingCell, selectedCell, data.rowCount, data.colCount, commitEdit, handleCellDoubleClick, updateCell]);

  // 判断单元格是否在选区内
  const isInSelection = useCallback((row: number, col: number): boolean => {
    if (!selection) return false;
    const minR = Math.min(selection.startRow, selection.endRow);
    const maxR = Math.max(selection.startRow, selection.endRow);
    const minC = Math.min(selection.startCol, selection.endCol);
    const maxC = Math.max(selection.startCol, selection.endCol);
    return row >= minR && row <= maxR && col >= minC && col <= maxC;
  }, [selection]);

  // 字段面板分组展开/收起
  const toggleGroup = useCallback((name: string) => {
    setExpandedGroups(prev => ({ ...prev, [name]: !prev[name] }));
  }, []);

  // 字段拖拽开始
  const handleFieldDragStart = useCallback((fieldKey: string, e: React.DragEvent) => {
    e.dataTransfer.setData("text/plain", fieldKey);
    e.dataTransfer.effectAllowed = "copy";
  }, []);

  // 设置边框
  const setBorders = useCallback((style: string) => {
    updateSelectedCells({
      borderTop: style,
      borderRight: style,
      borderBottom: style,
      borderLeft: style,
    });
  }, [updateSelectedCells]);

  return (
    <div className="flex flex-col h-full bg-white">
      {/* ==================== 顶部标题栏 ==================== */}
      <div className="flex items-center justify-between px-4 py-2 border-b bg-gray-50">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={onBack} className="gap-1">
            <ArrowLeft className="h-4 w-4" /> {templateName}
          </Button>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={onReset} className="gap-1 text-xs">
            <RotateCcw className="h-3.5 w-3.5" /> 恢复默认
          </Button>
          <Button variant="outline" size="sm" onClick={onPreview} className="gap-1 text-xs">
            <Eye className="h-3.5 w-3.5" /> 预览
          </Button>
          <Button variant="outline" size="sm" onClick={onPrint} className="gap-1 text-xs">
            <Printer className="h-3.5 w-3.5" /> 打印
          </Button>
          <Button size="sm" onClick={onSave} disabled={saving} className="gap-1 text-xs bg-emerald-600 hover:bg-emerald-700">
            <Save className="h-3.5 w-3.5" /> {saving ? "保存中..." : "保存"}
          </Button>
        </div>
      </div>

      {/* ==================== 格式化工具栏 ==================== */}
      <div className="flex items-center gap-1 px-3 py-1.5 border-b bg-gray-50 flex-wrap">
        {/* 纸张与方向 */}
        <Select
          value={data.paperSize || "A4"}
          onValueChange={(v) => updateSpreadsheetMeta(data, onChange, { paperSize: v })}
        >
          <SelectTrigger className="h-7 w-20 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="A4">A4</SelectItem>
            <SelectItem value="A5">A5</SelectItem>
            <SelectItem value="Letter">Letter</SelectItem>
          </SelectContent>
        </Select>

        <Select
          value={data.orientation || "portrait"}
          onValueChange={(v) => updateSpreadsheetMeta(data, onChange, { orientation: v })}
        >
          <SelectTrigger className="h-7 w-20 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="portrait">竖版</SelectItem>
            <SelectItem value="landscape">横版</SelectItem>
          </SelectContent>
        </Select>

        <Separator orientation="vertical" className="h-5 mx-1" />

        {/* 字体 */}
        <Select
          value={currentCell.fontFamily || "宋体"}
          onValueChange={(v) => updateSelectedCells({ fontFamily: v })}
        >
          <SelectTrigger className="h-7 w-20 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="宋体">宋体</SelectItem>
            <SelectItem value="黑体">黑体</SelectItem>
            <SelectItem value="微软雅黑">微软雅黑</SelectItem>
            <SelectItem value="楷体">楷体</SelectItem>
            <SelectItem value="Arial">Arial</SelectItem>
            <SelectItem value="Times New Roman">Times New Roman</SelectItem>
          </SelectContent>
        </Select>

        {/* 字号 */}
        <Select
          value={String(currentCell.fontSize || 9)}
          onValueChange={(v) => updateSelectedCells({ fontSize: parseInt(v) })}
        >
          <SelectTrigger className="h-7 w-14 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            {[7, 8, 9, 10, 11, 12, 14, 16, 18, 20, 22, 24, 28, 36].map(s => (
              <SelectItem key={s} value={String(s)}>{s}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Separator orientation="vertical" className="h-5 mx-1" />

        {/* 加粗/斜体/下划线 */}
        <Button
          variant={currentCell.bold ? "default" : "ghost"}
          size="icon"
          className="h-7 w-7"
          onClick={() => updateSelectedCells({ bold: !currentCell.bold })}
        >
          <Bold className="h-3.5 w-3.5" />
        </Button>
        <Button
          variant={currentCell.italic ? "default" : "ghost"}
          size="icon"
          className="h-7 w-7"
          onClick={() => updateSelectedCells({ italic: !currentCell.italic })}
        >
          <Italic className="h-3.5 w-3.5" />
        </Button>
        <Button
          variant={currentCell.underline ? "default" : "ghost"}
          size="icon"
          className="h-7 w-7"
          onClick={() => updateSelectedCells({ underline: !currentCell.underline })}
        >
          <Underline className="h-3.5 w-3.5" />
        </Button>

        <Separator orientation="vertical" className="h-5 mx-1" />

        {/* 对齐 */}
        <Button
          variant={currentCell.textAlign === "left" ? "default" : "ghost"}
          size="icon"
          className="h-7 w-7"
          onClick={() => updateSelectedCells({ textAlign: "left" })}
        >
          <AlignLeft className="h-3.5 w-3.5" />
        </Button>
        <Button
          variant={currentCell.textAlign === "center" ? "default" : "ghost"}
          size="icon"
          className="h-7 w-7"
          onClick={() => updateSelectedCells({ textAlign: "center" })}
        >
          <AlignCenter className="h-3.5 w-3.5" />
        </Button>
        <Button
          variant={currentCell.textAlign === "right" ? "default" : "ghost"}
          size="icon"
          className="h-7 w-7"
          onClick={() => updateSelectedCells({ textAlign: "right" })}
        >
          <AlignRight className="h-3.5 w-3.5" />
        </Button>

        <Separator orientation="vertical" className="h-5 mx-1" />

        {/* 文字颜色 */}
        <div className="relative">
          <input
            type="color"
            value={currentCell.color || "#333333"}
            onChange={(e) => updateSelectedCells({ color: e.target.value })}
            className="absolute inset-0 opacity-0 cursor-pointer w-7 h-7"
          />
          <Button variant="ghost" size="icon" className="h-7 w-7">
            <Type className="h-3.5 w-3.5" />
          </Button>
        </div>

        {/* 背景色 */}
        <div className="relative">
          <input
            type="color"
            value={currentCell.bgColor || "#ffffff"}
            onChange={(e) => updateSelectedCells({ bgColor: e.target.value })}
            className="absolute inset-0 opacity-0 cursor-pointer w-7 h-7"
          />
          <Button variant="ghost" size="icon" className="h-7 w-7">
            <Paintbrush className="h-3.5 w-3.5" />
          </Button>
        </div>

        <Separator orientation="vertical" className="h-5 mx-1" />

        {/* 边框 */}
        <Button variant="ghost" size="icon" className="h-7 w-7" title="全部边框"
          onClick={() => setBorders("1px solid #000")}>
          <Grid3X3 className="h-3.5 w-3.5" />
        </Button>
        <Button variant="ghost" size="icon" className="h-7 w-7" title="无边框"
          onClick={() => setBorders("none")}>
          <span className="text-xs font-mono">⊘</span>
        </Button>

        <Separator orientation="vertical" className="h-5 mx-1" />

        {/* 合并/拆分 */}
        <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={mergeCells} title="合并单元格">
          <Merge className="h-3.5 w-3.5" /> 合并
        </Button>
        <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={unmerge} title="拆分单元格">
          <SplitSquareHorizontal className="h-3.5 w-3.5" /> 拆分
        </Button>

        <Separator orientation="vertical" className="h-5 mx-1" />

        {/* 行列操作 */}
        <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={addRow}>+行</Button>
        <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={addCol}>+列</Button>
        <Button variant="ghost" size="sm" className="h-7 text-xs text-red-500" onClick={deleteRow}>
          <Trash2 className="h-3 w-3 mr-0.5" />行
        </Button>
        <Button variant="ghost" size="sm" className="h-7 text-xs text-red-500" onClick={deleteCol}>
          <Trash2 className="h-3 w-3 mr-0.5" />列
        </Button>
      </div>

      {/* ==================== 公式栏 ==================== */}
      <div className="flex items-center gap-2 px-3 py-1 border-b bg-white">
        <span className="text-xs text-gray-500 w-12 shrink-0">
          {selectedCell ? `${colLabel(selectedCell.col)}${selectedCell.row + 1}` : ""}
        </span>
        <Input
          ref={editInputRef}
          value={editingCell ? editValue : (selectedCell ? getCell(selectedCell.row, selectedCell.col).value : "")}
          onChange={(e) => {
            if (editingCell) {
              setEditValue(e.target.value);
            } else if (selectedCell) {
              const key = cellKey(selectedCell.row, selectedCell.col);
              setEditingCell(key);
              setEditValue(e.target.value);
            }
          }}
          onBlur={commitEdit}
          onKeyDown={(e) => {
            if (e.key === "Enter") { commitEdit(); }
            if (e.key === "Escape") { setEditingCell(null); }
          }}
          className="h-7 text-xs font-mono flex-1"
          placeholder="单元格内容 / 输入 ${字段名} 插入变量"
        />
      </div>

      {/* ==================== 主体区域：左侧字段面板 + 右侧表格 ==================== */}
      <div className="flex flex-1 min-h-0">
        {/* 左侧字段面板 */}
        <div className="w-48 border-r bg-gray-50 flex flex-col min-h-0">
          <div className="px-3 py-2 border-b">
            <div className="text-xs font-semibold text-gray-600">表单字段</div>
            <div className="text-xs text-gray-400 mt-0.5">拖拽字段到表格中</div>
          </div>
          <div className="flex-1 overflow-y-scroll overflow-x-hidden">
            <div className="p-2 space-y-0.5">
              {fieldGroups.map((group) => (
                <div key={group.name}>
                  <button
                    className="flex items-center gap-1.5 w-full px-2 py-1.5 text-xs text-gray-700 hover:bg-gray-100 rounded"
                    onClick={() => toggleGroup(group.name)}
                  >
                    {expandedGroups[group.name] !== false ? (
                      <ChevronDown className="h-3 w-3 shrink-0" />
                    ) : (
                      <ChevronRight className="h-3 w-3 shrink-0" />
                    )}
                    <span className="font-medium">{group.name}</span>
                  </button>
                  {expandedGroups[group.name] !== false && (
                    <div className="ml-2 space-y-0.5">
                      {group.fields.map((field) => (
                        <div key={field.key}>
                          <div
                            draggable
                            onDragStart={(e) => handleFieldDragStart(field.key, e)}
                            className="flex items-center gap-1.5 px-2 py-1 text-xs text-gray-600 hover:bg-blue-50 hover:text-blue-700 rounded cursor-grab active:cursor-grabbing select-none"
                            title={`拖拽到表格中插入 \${${field.key}}`}
                          >
                            <span className="text-gray-400">
                              {field.type === "array" ? "📋" : field.type === "number" ? "🔢" : field.type === "date" ? "📅" : "📝"}
                            </span>
                            <span className="truncate">{field.label}</span>
                          </div>
                          {/* 数组子字段 */}
                          {field.type === "array" && field.children && (
                            <div className="ml-4 space-y-0.5">
                              {field.children.map((child) => (
                                <div
                                  key={child.key}
                                  draggable
                                  onDragStart={(e) => handleFieldDragStart(`${field.key}.${child.key}`, e)}
                                  className="flex items-center gap-1.5 px-2 py-1 text-xs text-gray-500 hover:bg-blue-50 hover:text-blue-700 rounded cursor-grab active:cursor-grabbing select-none"
                                  title={`拖拽到表格中插入 \${${field.key}.${child.key}}`}
                                >
                                  <span className="text-gray-300">└</span>
                                  <span className="truncate">{child.label}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 右侧表格编辑器 */}
        <div
          ref={tableRef}
          className="flex-1 overflow-auto relative select-none bg-slate-100"
          onMouseUp={handleMouseUp}
        >
          <div className="flex min-w-fit justify-center p-6">
            <div
              className="bg-white shadow-[0_12px_36px_rgba(15,23,42,0.12)] border border-slate-200"
              style={{
                width: `${paperMetrics.widthMm}mm`,
                minHeight: `${paperMetrics.heightMm}mm`,
                paddingTop: data.marginTop,
                paddingRight: data.marginRight,
                paddingBottom: data.marginBottom,
                paddingLeft: data.marginLeft,
                boxSizing: "border-box",
              }}
            >
              <table
                className="border-collapse"
                style={{ tableLayout: "fixed", width: gridWidth, minWidth: "100%" }}
              >
                {/* 列标题行 */}
                <thead>
                  <tr>
                    <th className="sticky top-0 left-0 z-20 bg-gray-100 border border-gray-300 w-10 h-6 text-xs text-gray-500" />
                    {Array.from({ length: data.colCount }, (_, c) => (
                      <th
                        key={c}
                        className="sticky top-0 z-10 bg-gray-100 border border-gray-300 text-xs text-gray-500 font-normal relative"
                        style={{ width: data.colWidths[c] || 100, minWidth: 30, height: 22 }}
                      >
                        {colLabel(c)}
                        <div
                          className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-blue-400"
                          onMouseDown={(e) => handleColResizeStart(c, e)}
                        />
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {Array.from({ length: data.rowCount }, (_, r) => (
                    <tr key={r}>
                      <td
                        className="sticky left-0 z-10 bg-gray-100 border border-gray-300 text-xs text-gray-500 text-center font-normal relative"
                        style={{ width: 40, height: data.rowHeights[r] || 24 }}
                      >
                        {r + 1}
                        <div
                          className="absolute left-0 right-0 bottom-0 h-1.5 cursor-row-resize hover:bg-blue-400"
                          onMouseDown={(e) => handleRowResizeStart(r, e)}
                        />
                      </td>
                      {Array.from({ length: data.colCount }, (_, c) => {
                        const key = cellKey(r, c);
                        const cell = data.cells[key];
                        if (cell?.merged) return null;

                        const cd = cell || getDefaultCell();
                        const isSelected = selectedCell?.row === r && selectedCell?.col === c;
                        const isEditing = editingCell === key;
                        const inSel = isInSelection(r, c);

                        return (
                          <td
                            key={c}
                            rowSpan={cd.rowSpan || 1}
                            colSpan={cd.colSpan || 1}
                            className={`relative ${isSelected ? "outline outline-2 outline-blue-500 z-10" : ""} ${inSel && !isSelected ? "bg-blue-50" : ""}`}
                            style={{
                              height: data.rowHeights[r] || 24,
                              padding: "1px 3px",
                              fontSize: `${cd.fontSize || 9}pt`,
                              fontFamily: cd.fontFamily || "宋体",
                              fontWeight: cd.bold ? "bold" : "normal",
                              fontStyle: cd.italic ? "italic" : "normal",
                              textDecoration: cd.underline ? "underline" : "none",
                              textAlign: cd.textAlign || "left",
                              verticalAlign: cd.verticalAlign || "middle",
                              backgroundColor: cd.bgColor || (isSelected ? "#e8f0fe" : "white"),
                              color: cd.color || "#333",
                              borderTop: cd.borderTop || "1px solid #d0d0d0",
                              borderRight: cd.borderRight || "1px solid #d0d0d0",
                              borderBottom: cd.borderBottom || "1px solid #d0d0d0",
                              borderLeft: cd.borderLeft || "1px solid #d0d0d0",
                              overflow: "hidden",
                              whiteSpace: "nowrap",
                              cursor: "cell",
                              minWidth: data.colWidths[c] || 100,
                            }}
                            onClick={(e) => handleCellClick(r, c, e)}
                            onDoubleClick={() => handleCellDoubleClick(r, c)}
                            onMouseDown={(e) => handleMouseDown(r, c, e)}
                            onMouseMove={() => handleMouseMove(r, c)}
                            onDragOver={handleDragOver}
                            onDrop={(e) => handleDrop(r, c, e)}
                          >
                            {isEditing ? (
                              <input
                                ref={editInputRef}
                                value={editValue}
                                onChange={(e) => setEditValue(e.target.value)}
                                onBlur={commitEdit}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") commitEdit();
                                  if (e.key === "Escape") setEditingCell(null);
                                  if (e.key === "Tab") {
                                    e.preventDefault();
                                    commitEdit();
                                    if (c < data.colCount - 1) setSelectedCell({ row: r, col: c + 1 });
                                  }
                                }}
                                className="w-full h-full border-none outline-none bg-transparent text-inherit font-inherit"
                                style={{ fontSize: "inherit", fontFamily: "inherit" }}
                                autoFocus
                              />
                            ) : (
                              <span className="block truncate">
                                {cd.value && cd.value.startsWith("${") ? (
                                  <span className="text-blue-600 bg-blue-50 px-0.5 rounded text-xs">
                                    {cd.value}
                                  </span>
                                ) : (
                                  cd.value
                                )}
                              </span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
