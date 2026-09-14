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
