import ExcelJS from "exceljs";
import type { ExcelColumn, ExcelRowData } from "../types";

/**
 * Generates an Excel buffer from JSON data
 * @param data Array of objects containing the data
 * @param columns Array of column configurations (header, key, width)
 * @param sheetName Name of the worksheet
 * @returns Promise<Buffer>
 */
export async function generateExcelBuffer(
  data: ExcelRowData[],
  columns: ExcelColumn[],
  sheetName = "Sheet 1",
): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet(sheetName);

  worksheet.columns = columns.map((col) => ({
    header: col.header,
    key: col.key,
    width: col.width || 20,
  }));

  worksheet.addRows(data);

  // Apply basic styling to header row
  const headerRow = worksheet.getRow(1);
  headerRow.font = { bold: true, color: { argb: "FFFFFFFF" } };
  headerRow.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF4F46E5" }, // Indigo-600
  };
  headerRow.alignment = { vertical: "middle", horizontal: "center" };

  const buffer = await workbook.xlsx.writeBuffer();
  // Cast through unknown to resolve Buffer type mismatch between exceljs internal types and global node types without using 'any'
  return buffer as unknown as Buffer;
}
