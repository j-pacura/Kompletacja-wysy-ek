import * as ExcelJS from 'exceljs';
import * as fs from 'fs';
import * as path from 'path';
import { app } from 'electron';
import { queryOne, getShipmentFolderPath } from './database';

/**
 * Get user full name from settings
 */
async function getUserFullName(): Promise<string> {
  try {
    const nameResult = queryOne<any>("SELECT value FROM settings WHERE key = 'user_name'", []);
    const surnameResult = queryOne<any>("SELECT value FROM settings WHERE key = 'user_surname'", []);

    const name = nameResult?.value || '';
    const surname = surnameResult?.value || '';

    if (name || surname) {
      return `${name} ${surname}`.trim();
    }
    return 'N/A';
  } catch (error) {
    console.error('Error getting user name:', error);
    return 'N/A';
  }
}

/**
 * Export shipment report to Excel
 */
export async function exportToExcel(_shipmentId: number, shipmentData: any, parts: any[]): Promise<string> {
  const userFullName = await getUserFullName();
  try {
    // Create new workbook
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Pakowanie');

    // Add header info
    worksheet.mergeCells('A1:I1');
    const titleCell = worksheet.getCell('A1');
    titleCell.value = `Raport pakowania - ${shipmentData.shipment_number}`;
    titleCell.font = { size: 16, bold: true };
    titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
    titleCell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF1DB954' }
    };

    worksheet.getRow(1).height = 30;

    // Add shipment info
    worksheet.addRow([]);
    worksheet.addRow(['Wysyłka:', shipmentData.shipment_number]);
    worksheet.addRow(['Kierunek:', shipmentData.destination]);
    worksheet.addRow(['Data utworzenia:', new Date(shipmentData.created_at).toLocaleString('pl-PL')]);
    worksheet.addRow(['Pakował:', userFullName]);
    worksheet.addRow(['Status:', shipmentData.status === 'completed' ? 'Ukończona' : 'W trakcie']);
    worksheet.addRow([]);

    // Add column headers
    const headerRow = worksheet.addRow([
      'Nr wiersza',
      'Indeks SAP',
      'Opis',
      'Ilość',
      'Jednostka',
      'Status',
      'Waga całkowita [kg]',
      'Waga jednostkowa [kg]',
      'Ilość ważona [szt]'
    ]);

    // Style header row
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF2C2C2C' }
    };
    headerRow.alignment = { horizontal: 'center', vertical: 'middle' };
    headerRow.height = 25;

    // Add data rows
    parts.forEach((part) => {
      const row = worksheet.addRow([
        part.excel_row_number,
        part.sap_index,
        part.description,
        part.quantity,
        part.unit,
        part.status === 'packed' ? 'Spakowano' : 'Oczekuje',
        part.weight_total ? part.weight_total.toFixed(3) : '-',
        part.weight_per_unit ? part.weight_per_unit.toFixed(4) : '-',
        part.weight_quantity || '-'
      ]);

      // Color code by status
      if (part.status === 'packed') {
        row.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFE8F5E9' }
        };
      }
    });

    // Set column widths
    worksheet.columns = [
      { width: 12 },  // Nr wiersza
      { width: 15 },  // Indeks SAP
      { width: 40 },  // Opis
      { width: 10 },  // Ilość
      { width: 12 },  // Jednostka
      { width: 12 },  // Status
      { width: 18 },  // Waga całkowita
      { width: 20 },  // Waga jednostkowa
      { width: 18 }   // Ilość ważona
    ];

    // Add borders to all cells with data
    worksheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
      if (rowNumber > 1) {
        row.eachCell((cell) => {
          cell.border = {
            top: { style: 'thin' },
            left: { style: 'thin' },
            bottom: { style: 'thin' },
            right: { style: 'thin' }
          };
        });
      }
    });

    // Add summary at the bottom
    const summaryStartRow = worksheet.rowCount + 2;
    worksheet.addRow([]);
    worksheet.addRow(['Podsumowanie:']);
    worksheet.addRow(['Wszystkich pozycji:', parts.length]);
    worksheet.addRow(['Spakowanych:', parts.filter(p => p.status === 'packed').length]);
    worksheet.addRow(['Oczekujących:', parts.filter(p => p.status === 'pending').length]);

    const totalWeight = parts.reduce((sum, p) => sum + (p.weight_total || 0), 0);
    worksheet.addRow(['Łączna waga:', `${totalWeight.toFixed(3)} kg`]);

    // Bold summary
    for (let i = summaryStartRow; i <= worksheet.rowCount; i++) {
      const row = worksheet.getRow(i);
      row.font = { bold: true };
    }

    // Get shipment folder path
    const shipmentFolderPath = getShipmentFolderPath(
      shipmentData.shipment_number,
      shipmentData.destination,
      shipmentData.created_date
    );

    // Generate filename
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
    const fileName = `Raport_${shipmentData.shipment_number}_${timestamp}.xlsx`;
    const outputPath = path.join(shipmentFolderPath, fileName);

    // Save file
    await workbook.xlsx.writeFile(outputPath);

    return outputPath;
  } catch (error) {
    console.error('Excel export error:', error);
    throw error;
  }
}

/**
 * Export shipment report to PDF
 */
export async function exportToPDF(_shipmentId: number, _shipmentData: any, _parts: any[]): Promise<string> {
  // TODO: Implement PDF export with jspdf
  throw new Error('PDF export not implemented yet');
}

/**
 * Export shipment report to HTML
 */
export async function exportToHTML(_shipmentId: number, shipmentData: any, parts: any[]): Promise<string> {
  const userFullName = await getUserFullName();
  try {
    // Generate HTML content
    const html = `
<!DOCTYPE html>
<html lang="pl">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Raport pakowania - ${shipmentData.shipment_number}</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: #0a0e27;
            color: #e0e0e0;
            padding: 40px;
        }
        .container {
            max-width: 1400px;
            margin: 0 auto;
            background: #1e1e1e;
            border-radius: 16px;
            padding: 40px;
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
        }
        h1 {
            color: #1db954;
            font-size: 32px;
            margin-bottom: 30px;
            text-align: center;
        }
        .info-grid {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 20px;
            margin-bottom: 40px;
            background: #2c2c2c;
            padding: 20px;
            border-radius: 12px;
        }
        .info-item {
            display: flex;
            gap: 10px;
        }
        .info-label {
            font-weight: bold;
            color: #1db954;
            min-width: 150px;
        }
        .info-value {
            color: #e0e0e0;
        }
        table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 40px;
            background: #2c2c2c;
            border-radius: 12px;
            overflow: hidden;
        }
        thead {
            background: #1db954;
            color: white;
        }
        th, td {
            padding: 14px;
            text-align: left;
            border-bottom: 1px solid #3c3c3c;
        }
        th {
            font-weight: 600;
            text-transform: uppercase;
            font-size: 13px;
            letter-spacing: 0.5px;
        }
        tr:hover {
            background: #333;
        }
        .status-packed {
            background: rgba(29, 185, 84, 0.15);
            color: #1db954;
            padding: 4px 12px;
            border-radius: 12px;
            font-size: 12px;
            font-weight: 600;
            display: inline-block;
        }
        .status-pending {
            background: rgba(234, 179, 8, 0.15);
            color: #eab308;
            padding: 4px 12px;
            border-radius: 12px;
            font-size: 12px;
            font-weight: 600;
            display: inline-block;
        }
        .summary {
            background: #2c2c2c;
            padding: 30px;
            border-radius: 12px;
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
        }
        .summary-item {
            text-align: center;
        }
        .summary-label {
            color: #888;
            font-size: 14px;
            margin-bottom: 8px;
        }
        .summary-value {
            color: #1db954;
            font-size: 32px;
            font-weight: bold;
        }
        @media print {
            body { background: white; color: black; }
            .container { box-shadow: none; }
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>📦 Raport pakowania</h1>

        <div class="info-grid">
            <div class="info-item">
                <span class="info-label">Numer wysyłki:</span>
                <span class="info-value">${shipmentData.shipment_number}</span>
            </div>
            <div class="info-item">
                <span class="info-label">Kierunek:</span>
                <span class="info-value">${shipmentData.destination}</span>
            </div>
            <div class="info-item">
                <span class="info-label">Data utworzenia:</span>
                <span class="info-value">${new Date(shipmentData.created_at).toLocaleString('pl-PL')}</span>
            </div>
            <div class="info-item">
                <span class="info-label">Pakował:</span>
                <span class="info-value">${userFullName}</span>
            </div>
            <div class="info-item">
                <span class="info-label">Status:</span>
                <span class="info-value">${shipmentData.status === 'completed' ? 'Ukończona' : 'W trakcie'}</span>
            </div>
        </div>

        <table>
            <thead>
                <tr>
                    <th>Nr</th>
                    <th>Indeks SAP</th>
                    <th>Opis</th>
                    <th>Ilość</th>
                    <th>Jedn.</th>
                    <th>Status</th>
                    <th>Waga całk. [kg]</th>
                    <th>Waga jedn. [kg]</th>
                    <th>Ilość waż.</th>
                </tr>
            </thead>
            <tbody>
                ${parts.map(part => `
                    <tr>
                        <td>${part.excel_row_number}</td>
                        <td><strong>${part.sap_index}</strong></td>
                        <td>${part.description}</td>
                        <td>${part.quantity}</td>
                        <td>${part.unit}</td>
                        <td>
                            <span class="${part.status === 'packed' ? 'status-packed' : 'status-pending'}">
                                ${part.status === 'packed' ? 'Spakowano' : 'Oczekuje'}
                            </span>
                        </td>
                        <td>${part.weight_total ? part.weight_total.toFixed(3) : '-'}</td>
                        <td>${part.weight_per_unit ? part.weight_per_unit.toFixed(4) : '-'}</td>
                        <td>${part.weight_quantity || '-'}</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>

        <div class="summary">
            <div class="summary-item">
                <div class="summary-label">Wszystkich pozycji</div>
                <div class="summary-value">${parts.length}</div>
            </div>
            <div class="summary-item">
                <div class="summary-label">Spakowanych</div>
                <div class="summary-value">${parts.filter(p => p.status === 'packed').length}</div>
            </div>
            <div class="summary-item">
                <div class="summary-label">Oczekujących</div>
                <div class="summary-value">${parts.filter(p => p.status === 'pending').length}</div>
            </div>
            <div class="summary-item">
                <div class="summary-label">Łączna waga [kg]</div>
                <div class="summary-value">${parts.reduce((sum, p) => sum + (p.weight_total || 0), 0).toFixed(3)}</div>
            </div>
        </div>
    </div>
</body>
</html>
    `;

    // Get shipment folder path
    const shipmentFolderPath = getShipmentFolderPath(
      shipmentData.shipment_number,
      shipmentData.destination,
      shipmentData.created_date
    );

    // Generate filename
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
    const fileName = `Raport_${shipmentData.shipment_number}_${timestamp}.html`;
    const outputPath = path.join(shipmentFolderPath, fileName);

    // Save file
    fs.writeFileSync(outputPath, html, 'utf-8');

    return outputPath;
  } catch (error) {
    console.error('HTML export error:', error);
    throw error;
  }
}
