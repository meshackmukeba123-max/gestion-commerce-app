import ExcelJS from "exceljs";

export type ExcelColumn = { header: string; key: string; width?: number };

export async function buildExcelBuffer(
  sheetName: string,
  columns: ExcelColumn[],
  rows: Record<string, unknown>[]
) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Gestion Commerce App";
  workbook.created = new Date();

  const sheet = workbook.addWorksheet(sheetName);
  sheet.columns = columns.map((c) => ({ header: c.header, key: c.key, width: c.width ?? 20 }));
  sheet.getRow(1).font = { bold: true };
  rows.forEach((r) => sheet.addRow(r));

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

export type ExcelSheet = { name: string; columns: ExcelColumn[]; rows: Record<string, unknown>[] };

/** Classeur de plusieurs onglets (export complet des données d'une boutique). */
export async function buildWorkbookBuffer(sheets: ExcelSheet[]) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Gestion Commerce App";
  workbook.created = new Date();

  for (const s of sheets) {
    const sheet = workbook.addWorksheet(s.name);
    sheet.columns = s.columns.map((c) => ({ header: c.header, key: c.key, width: c.width ?? 18 }));
    sheet.getRow(1).font = { bold: true };
    sheet.views = [{ state: "frozen", ySplit: 1 }];
    s.rows.forEach((r) => sheet.addRow(r));
  }

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}
