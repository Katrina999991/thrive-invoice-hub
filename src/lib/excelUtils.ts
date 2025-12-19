import * as XLSX from 'xlsx';

/**
 * Excel formatting utilities for professional report exports
 */

/**
 * Apply auto-column width and autofilter to any worksheet
 * Call this after creating a worksheet with XLSX.utils.aoa_to_sheet
 */
export const applyWorksheetFormatting = (
  ws: XLSX.WorkSheet,
  options: {
    headerRowIndex?: number; // 1-indexed row where headers start (for autofilter)
    skipAutoFilter?: boolean;
  } = {}
): void => {
  const { headerRowIndex = 1, skipAutoFilter = false } = options;
  
  // Get the range of the worksheet
  const range = XLSX.utils.decode_range(ws['!ref'] || 'A1');
  const numCols = range.e.c - range.s.c + 1;
  const numRows = range.e.r - range.s.r + 1;
  
  // Calculate column widths based on content
  const colWidths: number[] = [];
  for (let col = range.s.c; col <= range.e.c; col++) {
    let maxWidth = 8; // Minimum width
    for (let row = range.s.r; row <= range.e.r; row++) {
      const cellAddress = XLSX.utils.encode_cell({ r: row, c: col });
      const cell = ws[cellAddress];
      if (cell && cell.v !== undefined && cell.v !== null) {
        const cellValue = String(cell.v);
        maxWidth = Math.max(maxWidth, cellValue.length);
      }
    }
    // Add padding and cap the width
    colWidths.push(Math.min(maxWidth + 2, 45));
  }
  
  ws['!cols'] = colWidths.map(wch => ({ wch }));
  
  // Add autofilter if there's data and it's not skipped
  if (!skipAutoFilter && numRows > 1) {
    const lastCol = XLSX.utils.encode_col(range.e.c);
    ws['!autofilter'] = { ref: `A${headerRowIndex}:${lastCol}${numRows}` };
  }
};

/**
 * Format a sheet that has header info rows followed by a data table
 * Applies auto-widths and autofilter starting at the data table
 */
export const formatReportWorksheet = (
  ws: XLSX.WorkSheet,
  headerInfoRowCount: number
): void => {
  // Get the range of the worksheet
  const range = XLSX.utils.decode_range(ws['!ref'] || 'A1');
  const numCols = range.e.c - range.s.c + 1;
  const numRows = range.e.r - range.s.r + 1;
  
  // Calculate column widths based on content
  const colWidths: number[] = [];
  for (let col = range.s.c; col <= range.e.c; col++) {
    let maxWidth = 10;
    for (let row = range.s.r; row <= range.e.r; row++) {
      const cellAddress = XLSX.utils.encode_cell({ r: row, c: col });
      const cell = ws[cellAddress];
      if (cell && cell.v !== undefined && cell.v !== null) {
        const cellValue = String(cell.v);
        maxWidth = Math.max(maxWidth, cellValue.length);
      }
    }
    colWidths.push(Math.min(maxWidth + 2, 45));
  }
  
  ws['!cols'] = colWidths.map(wch => ({ wch }));
  
  // Add autofilter starting after header info rows (data table starts there)
  // headerInfoRowCount accounts for the info rows before the data table headers
  const dataTableHeaderRow = headerInfoRowCount + 1; // 1-indexed
  if (numRows > dataTableHeaderRow) {
    const lastCol = XLSX.utils.encode_col(range.e.c);
    ws['!autofilter'] = { ref: `A${dataTableHeaderRow}:${lastCol}${numRows}` };
  }
};

/**
 * Create a formatted data sheet with auto-widths and autofilter
 */
export const createFormattedSheet = (
  headers: string[],
  data: any[][],
  totalRow?: any[]
): XLSX.WorkSheet => {
  const allData = [headers, ...data];
  if (totalRow) {
    allData.push(totalRow);
  }
  
  const ws = XLSX.utils.aoa_to_sheet(allData);
  
  // Calculate column widths
  const colWidths = headers.map((header, idx) => {
    let maxWidth = header.length;
    data.forEach(row => {
      const cellValue = row[idx];
      if (cellValue !== null && cellValue !== undefined) {
        maxWidth = Math.max(maxWidth, String(cellValue).length);
      }
    });
    if (totalRow && totalRow[idx]) {
      maxWidth = Math.max(maxWidth, String(totalRow[idx]).length);
    }
    return { wch: Math.min(maxWidth + 2, 45) };
  });
  
  ws['!cols'] = colWidths;
  
  // Add autofilter
  const lastCol = XLSX.utils.encode_col(headers.length - 1);
  const lastRow = allData.length;
  ws['!autofilter'] = { ref: `A1:${lastCol}${lastRow}` };
  
  return ws;
};

/**
 * Save workbook to file
 */
export const saveWorkbook = (wb: XLSX.WorkBook, filename: string): void => {
  XLSX.writeFile(wb, filename);
};
