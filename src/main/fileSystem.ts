import { dialog } from 'electron';
import * as ExcelJS from 'exceljs';
import * as path from 'path';
import * as fs from 'fs';

export interface ExcelParseResult {
  parts: Array<{
    sap_index: string;
    description: string;
    quantity: number;
    unit: string;
    country_of_origin?: string;
    excel_row_number: number;
  }>;
  hasCountryColumn: boolean;
}

/**
 * Show file dialog to select Excel file
 */
export async function selectExcelFile(): Promise<{ path: string; name: string } | null> {
  const result = await dialog.showOpenDialog({
    properties: ['openFile'],
    filters: [
      { name: 'Excel Files', extensions: ['xlsx', 'xls'] },
      { name: 'All Files', extensions: ['*'] }
    ],
    title: 'Wybierz plik Excel z listą części'
  });

  if (result.canceled || result.filePaths.length === 0) {
    return null;
  }

  const filePath = result.filePaths[0];
  const fileName = path.basename(filePath);

  return { path: filePath, name: fileName };
}

/**
 * Parse Excel file and extract parts data
 */
export async function parseExcelFile(filePath: string): Promise<ExcelParseResult> {
  if (!fs.existsSync(filePath)) {
    throw new Error('Plik nie istnieje');
  }

  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(filePath);

  // Get first worksheet
  const worksheet = workbook.worksheets[0];

  if (!worksheet) {
    throw new Error('Plik Excel jest pusty');
  }

  // Find header row (usually first row)
  const headerRow = worksheet.getRow(1);
  const headers: string[] = [];

  headerRow.eachCell({ includeEmpty: false }, (cell, colNumber) => {
    headers[colNumber - 1] = String(cell.value).trim().toLowerCase();
  });

  // Detect columns
  let sapIndexCol = -1;
  let descriptionCol = -1;
  let quantityCol = -1;
  let unitCol = -1;
  let countryCol = -1;

  headers.forEach((header, index) => {
    if (header.includes('sap') || header.includes('index') || header === 'a') {
      sapIndexCol = index;
    } else if (header.includes('descr') || header.includes('opis') || header === 'b') {
      descriptionCol = index;
    } else if (header.includes('quant') || header.includes('ilo') || header.includes('qty') || header === 'c') {
      quantityCol = index;
    } else if (header.includes('unit') || header.includes('jedn') || header === 'd') {
      unitCol = index;
    } else if (header.includes('country') || header.includes('kraj') || header.includes('coo') || header === 'e') {
      countryCol = index;
    }
  });

  // If columns not found by header, use default positions
  if (sapIndexCol === -1) sapIndexCol = 0; // Column A
  if (descriptionCol === -1) descriptionCol = 1; // Column B
  if (quantityCol === -1) quantityCol = 2; // Column C
  if (unitCol === -1) unitCol = 3; // Column D

  // Validate required columns
  if (sapIndexCol === -1 || descriptionCol === -1 || quantityCol === -1 || unitCol === -1) {
    throw new Error('Brak wymaganych kolumn w pliku Excel');
  }

  const parts: ExcelParseResult['parts'] = [];
  let hasCountryColumn = countryCol !== -1;
  let dataRowNumber = 0; // Counter for data rows (starting from 1)

  // Read data rows (skip header)
  worksheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
    if (rowNumber === 1) return; // Skip header

    const sapIndex = row.getCell(sapIndexCol + 1).value;
    const description = row.getCell(descriptionCol + 1).value;
    const quantity = row.getCell(quantityCol + 1).value;
    const unit = row.getCell(unitCol + 1).value;
    const country = countryCol !== -1 ? row.getCell(countryCol + 1).value : null;

    // Validate row
    if (!sapIndex || !description || !quantity || !unit) {
      console.warn(`Row ${rowNumber}: Missing required data, skipping`);
      return;
    }

    // Parse quantity
    let parsedQuantity = 0;
    if (typeof quantity === 'number') {
      parsedQuantity = quantity;
    } else if (typeof quantity === 'string') {
      parsedQuantity = parseFloat(quantity.replace(',', '.'));
    }

    if (isNaN(parsedQuantity) || parsedQuantity <= 0) {
      console.warn(`Row ${rowNumber}: Invalid quantity, skipping`);
      return;
    }

    // Increment data row counter for valid rows
    dataRowNumber++;

    parts.push({
      sap_index: String(sapIndex).trim(),
      description: String(description).trim(),
      quantity: parsedQuantity,
      unit: String(unit).trim(),
      country_of_origin: country ? String(country).trim() : undefined,
      excel_row_number: dataRowNumber,
    });
  });

  if (parts.length === 0) {
    throw new Error('Nie znaleziono żadnych części w pliku Excel');
  }

  return {
    parts,
    hasCountryColumn,
  };
}

/**
 * Open folder in file explorer
 */
export async function openFolder(folderPath: string): Promise<void> {
  const { shell } = require('electron');
  await shell.openPath(folderPath);
}
