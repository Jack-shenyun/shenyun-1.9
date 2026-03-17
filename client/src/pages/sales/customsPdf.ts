import { PDFDocument, rgb } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";

const cjkPdfFontUrl = new URL("../../../../server/assets/NotoSansCJKsc-Regular.otf", import.meta.url).href;
const A4_PORTRAIT: [number, number] = [595.28, 841.89];
const A4_LANDSCAPE: [number, number] = [841.89, 595.28];

function splitPdfLines(text: string, maxWidth: number, font: any, size: number) {
  const lines: string[] = [];
  String(text || "-").replace(/\r/g, "").split("\n").forEach((rawLine) => {
    let current = "";
    Array.from(rawLine || "-").forEach((char) => {
      const next = `${current}${char}`;
      if (font.widthOfTextAtSize(next, size) <= maxWidth || current.length === 0) {
        current = next;
      } else {
        lines.push(current);
        current = char;
      }
    });
    lines.push(current || "-");
  });
  return lines;
}

function drawText(page: any, text: string, x: number, y: number, font: any, size: number, color = rgb(0.12, 0.12, 0.12)) {
  page.drawText(String(text || "-"), { x, y, font, size, color });
}

function drawWrappedText(page: any, text: string, x: number, y: number, maxWidth: number, font: any, size: number, lineHeight = 10) {
  const lines = splitPdfLines(text, maxWidth, font, size);
  lines.forEach((line, index) => drawText(page, line, x, y - index * lineHeight, font, size));
  return y - lines.length * lineHeight;
}

function drawHeader(page: any, font: any, companyInfo: any, title: string, docNo: string, docDate: string, showCompany = true) {
  const width = page.getWidth();
  let y = page.getHeight() - 40;
  if (showCompany) {
    drawText(page, companyInfo?.companyNameEn || companyInfo?.companyNameCn || "Suzhou Shenyun Medical Equipment Co., Ltd.", 36, y, font, 16);
    y -= 18;
    drawText(page, companyInfo?.addressEn || companyInfo?.addressCn || "-", 36, y, font, 8.5, rgb(0.35, 0.35, 0.35));
    y -= 12;
  }
  drawText(page, title, width / 2 - font.widthOfTextAtSize(title, 15) / 2, y, font, 15);
  y -= 18;
  page.drawLine({ start: { x: 36, y }, end: { x: width - 36, y }, thickness: 1, color: rgb(0.75, 0.75, 0.75) });
  y -= 16;
  drawText(page, `No: ${docNo || "-"}`, 36, y, font, 9);
  drawText(page, `Date: ${docDate || "-"}`, width - 160, y, font, 9);
  return y - 18;
}

function drawFieldGrid(page: any, font: any, fields: Array<[string, string]>, startY: number, cols = 2, labelWidth = 78) {
  const pageWidth = page.getWidth();
  const gap = 16;
  const blockWidth = (pageWidth - 72 - ((cols - 1) * gap)) / cols;
  let lowestY = startY;
  fields.forEach((field, index) => {
    const col = index % cols;
    const row = Math.floor(index / cols);
    const x = 36 + col * (blockWidth + gap);
    const rowY = startY - row * 28;
    drawText(page, `${field[0]}:`, x, rowY, font, 8.5, rgb(0.35, 0.35, 0.35));
    drawWrappedText(page, field[1] || "-", x + labelWidth, rowY, blockWidth - labelWidth - 4, font, 8.5);
    lowestY = Math.min(lowestY, rowY - 28);
  });
  return lowestY;
}

function drawTable(page: any, font: any, columns: Array<{ label: string; width: number; key: string }>, rows: Array<Record<string, unknown>>, startX: number, startY: number, fontSize = 8) {
  const headerHeight = 20;
  let cursorY = startY;
  let cursorX = startX;
  columns.forEach((column) => {
    page.drawRectangle({
      x: cursorX,
      y: cursorY - headerHeight,
      width: column.width,
      height: headerHeight,
      borderWidth: 1,
      borderColor: rgb(0.55, 0.55, 0.55),
      color: rgb(0.97, 0.97, 0.97),
    });
    drawText(page, column.label, cursorX + 4, cursorY - 13, font, 8);
    cursorX += column.width;
  });
  cursorY -= headerHeight;

  rows.forEach((row) => {
    const lineCounts = columns.map((column) => splitPdfLines(String(row[column.key] ?? "-"), column.width - 8, font, fontSize).length);
    const rowHeight = Math.max(22, Math.max(...lineCounts) * 11 + 6);
    cursorX = startX;
    columns.forEach((column) => {
      page.drawRectangle({
        x: cursorX,
        y: cursorY - rowHeight,
        width: column.width,
        height: rowHeight,
        borderWidth: 1,
        borderColor: rgb(0.75, 0.75, 0.75),
      });
      splitPdfLines(String(row[column.key] ?? "-"), column.width - 8, font, fontSize).forEach((line, index) => {
        drawText(page, line, cursorX + 4, cursorY - 14 - index * 10, font, fontSize);
      });
      cursorX += column.width;
    });
    cursorY -= rowHeight;
  });

  return cursorY;
}

export async function buildMergedCustomsPdf({
  companyInfo,
  record,
  state,
}: {
  companyInfo: any;
  record: any;
  state: any;
}) {
  const pdfDoc = await PDFDocument.create();
  pdfDoc.registerFontkit(fontkit);
  const fontBytes = await fetch(cjkPdfFontUrl).then((res) => res.arrayBuffer());
  const font = await pdfDoc.embedFont(fontBytes);
  const invoice = state.documents.commercialInvoice;
  const packing = state.documents.packingList;
  const declaration = state.documents.declarationElements;
  const customs = state.documents.customsDeclaration;
  const items = state.customsItems || [];

  let page = pdfDoc.addPage(A4_PORTRAIT);
  let y = drawHeader(page, font, companyInfo, "Commercial Invoice", invoice.invoiceNo, invoice.invoiceDate, true);
  y = drawFieldGrid(page, font, [
    ["Buyer", state.customsMain.buyerName],
    ["Trade Term", state.customsMain.tradeTerm],
    ["Buyer Address", state.customsMain.buyerAddress],
    ["Payment Term", state.customsMain.paymentTerm],
    ["Contract No.", state.customsMain.contractNo],
    ["Currency", state.customsMain.currency],
  ], y, 2, 84);
  y = drawTable(page, font, [
    { key: "itemNo", label: "Item", width: 30 },
    { key: "productName", label: "Product Name", width: 122 },
    { key: "model", label: "Model", width: 78 },
    { key: "descriptionEn", label: "Description", width: 110 },
    { key: "quantity", label: "Qty", width: 40 },
    { key: "unit", label: "Unit", width: 36 },
    { key: "unitPrice", label: "Unit Price", width: 64 },
    { key: "totalPrice", label: "Amount", width: 64 },
  ], items, 36, y - 8, 7.5);
  drawFieldGrid(page, font, [
    ["Subtotal", invoice.subtotal],
    ["Freight", invoice.freight],
    ["Insurance", invoice.insurance],
    ["Total Amount", invoice.totalAmount],
  ], y - 20, 2, 78);
  drawWrappedText(page, invoice.bankInfo || "-", 36, 120, page.getWidth() - 72, font, 8, 10);

  page = pdfDoc.addPage(A4_PORTRAIT);
  y = drawHeader(page, font, companyInfo, "Packing List", packing.packingListNo, packing.packingDate, true);
  y = drawFieldGrid(page, font, [
    ["Consignee", state.customsMain.consignee],
    ["Notify Party", state.customsMain.notifyParty],
    ["Contract No.", state.customsMain.contractNo],
    ["Package Type", packing.packageType],
    ["Total Packages", state.customsMain.totalPackages],
    ["Total Volume", state.customsMain.totalVolume],
    ["Gross Weight", state.customsMain.grossWeight],
    ["Net Weight", state.customsMain.netWeight],
  ], y, 2, 86);
  drawTable(page, font, [
    { key: "itemNo", label: "Item", width: 30 },
    { key: "productName", label: "Product Name", width: 132 },
    { key: "model", label: "Model", width: 80 },
    { key: "cartonNo", label: "Carton No.", width: 74 },
    { key: "qtyPerCarton", label: "Qty/Carton", width: 60 },
    { key: "totalQuantity", label: "Total Qty", width: 58 },
    { key: "unit", label: "Unit", width: 36 },
    { key: "packingNote", label: "Packing Note", width: 89 },
  ], items, 36, y - 8, 7.5);

  page = pdfDoc.addPage(A4_PORTRAIT);
  y = drawHeader(page, font, companyInfo, "申报要素", state.customsMain.contractNo, invoice.invoiceDate || packing.packingDate, true);
  y = drawFieldGrid(page, font, [
    ["币制", state.customsMain.currency],
    ["出口享惠情况", declaration.exportBenefit],
    ["征免", items[0]?.exemptionNature || ""],
    ["品牌类型", items[0]?.brandType || ""],
    ["申报要素", items[0]?.declarationElements || ""],
    ["用途", items[0]?.usage || ""],
    ["组成或构成", items[0]?.material || ""],
    ["品牌", items[0]?.brand || ""],
    ["型号", items[0]?.model || ""],
    ["注册编号", items[0]?.registrationNo || ""],
    ["GTIN", items[0]?.gtin || ""],
    ["CAS", items[0]?.cas || ""],
    ["其他", items[0]?.otherNote || ""],
  ], y, 2, 86);
  drawTable(page, font, [
    { key: "itemNo", label: "项号", width: 32 },
    { key: "hsCode", label: "商品编号", width: 88 },
    { key: "productNameCn", label: "商品名称", width: 96 },
    { key: "specificationModel", label: "规格型号", width: 96 },
    { key: "quantityUnit", label: "数量及单位", width: 82 },
    { key: "finalDestinationCountry", label: "最终目的国", width: 64 },
    { key: "unitPrice", label: "单价USD", width: 56 },
    { key: "totalPrice", label: "总价USD", width: 57 },
  ], items, 36, y - 8, 7.5);

  page = pdfDoc.addPage(A4_LANDSCAPE);
  y = drawHeader(page, font, companyInfo, "中华人民共和国海关出口货物报关单", customs.declarationNo || record.declarationNo, customs.declareDate, false);
  y = drawFieldGrid(page, font, [
    ["出境关别", customs.customsPort],
    ["出口日期", customs.exportDate],
    ["申报日期", customs.declareDate],
    ["备案号", customs.recordNo],
    ["境外收货人", customs.overseasConsignee],
    ["运输方式", customs.transportMode],
    ["运输工具名称及航次号", customs.transportTool],
    ["提运单号", customs.billNo],
    ["生产销售单位", customs.productionSalesUnit],
    ["监管方式", customs.supervisionMode],
    ["征免性质", customs.levyNature],
    ["许可证号", customs.licenseNo],
    ["合同协议号", state.customsMain.contractNo],
    ["贸易国（地区）", customs.tradeCountry],
    ["运抵国（地区）", customs.destinationCountry],
    ["指运港", customs.domesticDestination],
    ["离境口岸", state.customsMain.loadingPort],
    ["包装种类", customs.packageType],
    ["件数", state.customsMain.totalPackages],
    ["毛重(千克)", state.customsMain.grossWeight],
    ["净重(千克)", state.customsMain.netWeight],
    ["成交方式", customs.transactionMethod],
    ["运费", customs.freight],
    ["保费", customs.insurance],
    ["杂费", customs.incidentalFee],
  ], y, 3, 78);
  drawTable(page, font, [
    { key: "itemNo", label: "项号", width: 28 },
    { key: "hsCode", label: "商品编号", width: 72 },
    { key: "productName", label: "商品名称", width: 82 },
    { key: "specificationModel", label: "规格型号", width: 88 },
    { key: "quantityUnit", label: "数量及单位", width: 72 },
    { key: "unitPrice", label: "单价", width: 48 },
    { key: "totalPrice", label: "总价", width: 56 },
    { key: "currency", label: "币制", width: 42 },
    { key: "countryOfOrigin", label: "原产国", width: 52 },
    { key: "finalDestinationCountry", label: "最终目的国", width: 62 },
    { key: "domesticSource", label: "境内货源地", width: 64 },
    { key: "exemptionNature", label: "征免", width: 48 },
  ], items, 36, y - 8, 7);
  drawWrappedText(page, customs.marksRemarks || "-", 36, 56, page.getWidth() - 72, font, 8, 10);

  return pdfDoc.save();
}
