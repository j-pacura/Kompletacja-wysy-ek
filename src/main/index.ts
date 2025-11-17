import { app, BrowserWindow, ipcMain, shell } from 'electron';
import * as path from 'path';
import * as fs from 'fs';
import { initDatabase, closeDatabase, query, queryOne, execute, getShipmentFolderPath } from './database';
import { IPC_CHANNELS } from '../shared/ipc-channels';
import { selectExcelFile, parseExcelFile, openFolder } from './fileSystem';
import * as Scale from './scale';
import * as Reports from './reports';
import { hashPassword, verifyPassword } from './auth';

let mainWindow: BrowserWindow | null = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1024,
    minHeight: 768,
    backgroundColor: '#0a0e27',
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
    autoHideMenuBar: true,
    icon: path.join(__dirname, '../../resources/icon.ico'),
  });

  // Load the app
  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL('http://localhost:3000');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// Initialize app
app.whenReady().then(async () => {
  console.log('App is ready');

  // Initialize database
  try {
    await initDatabase();
    console.log('Database initialized');
  } catch (error) {
    console.error('Failed to initialize database:', error);
    app.quit();
    return;
  }

  // Setup IPC handlers
  setupIPCHandlers();

  // Create window
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  closeDatabase();
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', () => {
  closeDatabase();
});

/**
 * Setup IPC handlers for communication with renderer
 */
function setupIPCHandlers() {
  // Generic query handler
  ipcMain.handle(IPC_CHANNELS.DB_QUERY, async (_event, sql: string, params: any[] = []) => {
    try {
      return { success: true, data: query(sql, params) };
    } catch (error: any) {
      console.error('Query error:', error);
      return { success: false, error: error.message };
    }
  });

  // Generic execute handler
  ipcMain.handle(IPC_CHANNELS.DB_EXECUTE, async (_event, sql: string, params: any[] = []) => {
    try {
      const result = execute(sql, params);
      return { success: true, data: result };
    } catch (error: any) {
      console.error('Execute error:', error);
      return { success: false, error: error.message };
    }
  });

  // Get all shipments
  ipcMain.handle(IPC_CHANNELS.DB_GET_SHIPMENTS, async () => {
    try {
      const shipments = query(
        `SELECT * FROM shipments ORDER BY created_at DESC`
      );
      return { success: true, data: shipments };
    } catch (error: any) {
      console.error('Get shipments error:', error);
      return { success: false, error: error.message };
    }
  });

  // Get single shipment
  ipcMain.handle(IPC_CHANNELS.DB_GET_SHIPMENT, async (_event, id: number) => {
    try {
      const shipment = queryOne(
        `SELECT * FROM shipments WHERE id = ?`,
        [id]
      );
      return { success: true, data: shipment };
    } catch (error: any) {
      console.error('Get shipment error:', error);
      return { success: false, error: error.message };
    }
  });

  // Create shipment
  ipcMain.handle(IPC_CHANNELS.DB_CREATE_SHIPMENT, async (_event, shipmentData: any) => {
    try {
      const result = execute(
        `INSERT INTO shipments (
          shipment_number, destination, notes, created_at, status,
          require_weight, require_country, require_photos,
          packed_by, created_date, password
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          shipmentData.shipment_number,
          shipmentData.destination,
          shipmentData.notes || null,
          Date.now(),
          'in_progress',
          shipmentData.require_weight ? 1 : 0,
          shipmentData.require_country ? 1 : 0,
          shipmentData.require_photos ? 1 : 0,
          shipmentData.packed_by || null,
          new Date().toISOString().split('T')[0], // YYYY-MM-DD
          shipmentData.password || null,
        ]
      );
      return { success: true, data: { id: result.lastInsertRowid } };
    } catch (error: any) {
      console.error('Create shipment error:', error);
      return { success: false, error: error.message };
    }
  });

  // Update shipment
  ipcMain.handle(IPC_CHANNELS.DB_UPDATE_SHIPMENT, async (_event, id: number, updates: any) => {
    try {
      const fields: string[] = [];
      const values: any[] = [];

      Object.keys(updates).forEach(key => {
        fields.push(`${key} = ?`);
        values.push(updates[key]);
      });

      values.push(id);

      const result = execute(
        `UPDATE shipments SET ${fields.join(', ')} WHERE id = ?`,
        values
      );
      return { success: true, data: result };
    } catch (error: any) {
      console.error('Update shipment error:', error);
      return { success: false, error: error.message };
    }
  });

  // Delete shipment
  ipcMain.handle(IPC_CHANNELS.DB_DELETE_SHIPMENT, async (_event, id: number) => {
    try {
      // Delete shipment (CASCADE will delete parts and photos automatically)
      execute('DELETE FROM shipments WHERE id = ?', [id]);
      return { success: true };
    } catch (error: any) {
      console.error('Delete shipment error:', error);
      return { success: false, error: error.message };
    }
  });

  // Archive shipment
  ipcMain.handle(IPC_CHANNELS.DB_ARCHIVE_SHIPMENT, async (_event, id: number) => {
    try {
      execute('UPDATE shipments SET archived = 1 WHERE id = ?', [id]);
      return { success: true };
    } catch (error: any) {
      console.error('Archive shipment error:', error);
      return { success: false, error: error.message };
    }
  });

  // Get parts for shipment
  ipcMain.handle(IPC_CHANNELS.DB_GET_PARTS, async (_event, shipmentId: number) => {
    try {
      const parts = query(
        `SELECT * FROM parts WHERE shipment_id = ? ORDER BY status ASC, id ASC`,
        [shipmentId]
      );
      return { success: true, data: parts };
    } catch (error: any) {
      console.error('Get parts error:', error);
      return { success: false, error: error.message };
    }
  });

  // Update part
  ipcMain.handle(IPC_CHANNELS.DB_UPDATE_PART, async (_event, id: number, updates: any) => {
    try {
      const fields: string[] = [];
      const values: any[] = [];

      Object.keys(updates).forEach(key => {
        fields.push(`${key} = ?`);
        values.push(updates[key]);
      });

      values.push(id);

      const result = execute(
        `UPDATE parts SET ${fields.join(', ')} WHERE id = ?`,
        values
      );
      return { success: true, data: result };
    } catch (error: any) {
      console.error('Update part error:', error);
      return { success: false, error: error.message };
    }
  });

  // Get settings
  ipcMain.handle(IPC_CHANNELS.DB_GET_SETTINGS, async () => {
    try {
      const settings = query(`SELECT * FROM settings`);
      const settingsObj: Record<string, string> = {};
      settings.forEach((s: any) => {
        settingsObj[s.key] = s.value;
      });
      return { success: true, data: settingsObj };
    } catch (error: any) {
      console.error('Get settings error:', error);
      return { success: false, error: error.message };
    }
  });

  // Update setting
  ipcMain.handle(IPC_CHANNELS.DB_UPDATE_SETTING, async (_event, key: string, value: string) => {
    try {
      const result = execute(
        `INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)`,
        [key, value]
      );
      return { success: true, data: result };
    } catch (error: any) {
      console.error('Update setting error:', error);
      return { success: false, error: error.message };
    }
  });

  // Get stats
  ipcMain.handle(IPC_CHANNELS.DB_GET_STATS, async () => {
    try {
      const stats = queryOne(`SELECT * FROM user_stats WHERE id = 1`);
      return { success: true, data: stats };
    } catch (error: any) {
      console.error('Get stats error:', error);
      return { success: false, error: error.message };
    }
  });

  // User operations
  ipcMain.handle(IPC_CHANNELS.DB_GET_USERS, async () => {
    try {
      const users = query(`SELECT id, name, surname, created_at, last_login_at FROM users ORDER BY name ASC`);
      return { success: true, data: users };
    } catch (error: any) {
      console.error('Get users error:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle(IPC_CHANNELS.DB_CREATE_USER, async (_event, name: string, surname: string, password?: string) => {
    try {
      let passwordHash = null;

      // Hash password if provided
      if (password && password.trim()) {
        passwordHash = await hashPassword(password);
      }

      const result = execute(
        `INSERT INTO users (name, surname, password_hash, created_at) VALUES (?, ?, ?, ?)`,
        [name, surname || null, passwordHash, Date.now()]
      );

      return { success: true, data: { id: result.lastInsertRowid } };
    } catch (error: any) {
      console.error('Create user error:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle(IPC_CHANNELS.DB_LOGIN_USER, async (_event, userId: number, password?: string) => {
    try {
      const user = queryOne<any>(`SELECT * FROM users WHERE id = ?`, [userId]);

      if (!user) {
        return { success: false, error: 'User not found' };
      }

      // Check password if user has one set
      if (user.password_hash) {
        if (!password) {
          return { success: false, error: 'Password required', needsPassword: true };
        }

        const isValid = await verifyPassword(password, user.password_hash);
        if (!isValid) {
          return { success: false, error: 'Invalid password' };
        }
      }

      // Update last login time
      execute(`UPDATE users SET last_login_at = ? WHERE id = ?`, [Date.now(), userId]);

      // Return user data (without password hash)
      return {
        success: true,
        data: {
          id: user.id,
          name: user.name,
          surname: user.surname,
          created_at: user.created_at,
          last_login_at: Date.now()
        }
      };
    } catch (error: any) {
      console.error('Login user error:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle(IPC_CHANNELS.DB_DELETE_USER, async (_event, userId: number) => {
    try {
      execute(`DELETE FROM users WHERE id = ?`, [userId]);
      return { success: true };
    } catch (error: any) {
      console.error('Delete user error:', error);
      return { success: false, error: error.message };
    }
  });

  // App version
  ipcMain.handle(IPC_CHANNELS.APP_GET_VERSION, async () => {
    return { success: true, data: app.getVersion() };
  });

  // Notification operations
  ipcMain.handle(IPC_CHANNELS.NOTIFICATION_SEND, async (_event, title: string, body: string) => {
    try {
      const { Notification } = require('electron');

      if (Notification.isSupported()) {
        const notification = new Notification({
          title,
          body,
          icon: path.join(__dirname, '../../resources/icon.png'), // Optional: add app icon
        });

        notification.show();
        return { success: true };
      } else {
        return { success: false, error: 'Notifications not supported' };
      }
    } catch (error: any) {
      console.error('Notification error:', error);
      return { success: false, error: error.message };
    }
  });

  // App paths
  ipcMain.handle(IPC_CHANNELS.APP_GET_PATH, async (_event, name: string) => {
    try {
      const appPath = app.getPath(name as any);
      return { success: true, data: appPath };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  // File operations
  ipcMain.handle(IPC_CHANNELS.FILE_SELECT_EXCEL, async () => {
    try {
      const result = await selectExcelFile();
      return { success: true, data: result };
    } catch (error: any) {
      console.error('Select Excel error:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle(IPC_CHANNELS.FILE_PARSE_EXCEL, async (_event, filePath: string) => {
    try {
      const result = await parseExcelFile(filePath);
      return { success: true, data: result };
    } catch (error: any) {
      console.error('Parse Excel error:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle(IPC_CHANNELS.FILE_OPEN_FOLDER, async (_event, folderPath: string) => {
    try {
      await openFolder(folderPath);
      return { success: true };
    } catch (error: any) {
      console.error('Open folder error:', error);
      return { success: false, error: error.message };
    }
  });

  // Scale operations
  ipcMain.handle(IPC_CHANNELS.SCALE_LIST_PORTS, async () => {
    try {
      const ports = await Scale.listPorts();
      return { success: true, data: ports };
    } catch (error: any) {
      console.error('List ports error:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle(IPC_CHANNELS.SCALE_CONNECT, async (_event, portPath: string, baudRate: number = 9600) => {
    try {
      const connected = await Scale.connect(portPath, baudRate);
      return { success: connected, data: connected };
    } catch (error: any) {
      console.error('Scale connect error:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle(IPC_CHANNELS.SCALE_DISCONNECT, async () => {
    try {
      await Scale.disconnect();
      return { success: true };
    } catch (error: any) {
      console.error('Scale disconnect error:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle(IPC_CHANNELS.SCALE_GET_WEIGHT, async (_event, immediate: boolean = true) => {
    try {
      const reading = immediate ? await Scale.getImmediate() : await Scale.getStable();

      if ('message' in reading) {
        // Error
        return { success: false, error: reading.message, code: reading.code };
      }

      // Valid reading
      return { success: true, data: reading };
    } catch (error: any) {
      console.error('Scale get weight error:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle(IPC_CHANNELS.SCALE_ZERO, async () => {
    try {
      const result = await Scale.zero();
      return { success: result };
    } catch (error: any) {
      console.error('Scale zero error:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle(IPC_CHANNELS.SCALE_TARE, async () => {
    try {
      const result = await Scale.tare();
      return { success: result };
    } catch (error: any) {
      console.error('Scale tare error:', error);
      return { success: false, error: error.message };
    }
  });

  // Photo operations
  ipcMain.handle(IPC_CHANNELS.DB_SAVE_PHOTO, async (_event, partId: number, imageData: string) => {
    try {
      // Get part data and shipment info
      const part = queryOne<any>(
        `SELECT p.sap_index, p.excel_row_number, p.shipment_id,
                s.shipment_number, s.destination, s.created_date
         FROM parts p
         INNER JOIN shipments s ON p.shipment_id = s.id
         WHERE p.id = ?`,
        [partId]
      );

      if (!part) {
        return { success: false, error: 'Part not found' };
      }

      // Count existing photos for this part to determine sequence letter
      const photoCountResult = queryOne<any>(
        `SELECT COUNT(*) as count FROM photos WHERE part_id = ?`,
        [partId]
      );
      const photoCount = photoCountResult?.count || 0;

      // Convert photo count to sequence letter (0 -> A, 1 -> B, 2 -> C, etc.)
      const sequenceLetter = String.fromCharCode(65 + photoCount); // 65 is ASCII for 'A'

      // Get shipment folder path
      const shipmentFolderPath = getShipmentFolderPath(
        part.shipment_number,
        part.destination,
        part.created_date
      );

      // Create photos subdirectory inside shipment folder
      const photosDir = path.join(shipmentFolderPath, 'photos');
      if (!fs.existsSync(photosDir)) {
        fs.mkdirSync(photosDir, { recursive: true });
      }

      // Sanitize SAP index for filename (remove/replace unsafe characters)
      const safeSapIndex = part.sap_index
        .replace(/[<>:"/\\|?*]/g, '_')  // Replace unsafe chars with underscore
        .replace(/\s+/g, '_')             // Replace spaces with underscore
        .trim();

      // Generate filename: line_[rowNumber][sequenceLetter]_SAP_[sapIndex].jpg
      const timestamp = Date.now();
      const lineNumber = part.excel_row_number || 0;
      const filename = `line_${lineNumber}${sequenceLetter}_SAP_${safeSapIndex}.jpg`;
      const photoPath = path.join(photosDir, filename);

      // Remove data URL prefix (data:image/jpeg;base64,)
      const base64Data = imageData.replace(/^data:image\/\w+;base64,/, '');
      const buffer = Buffer.from(base64Data, 'base64');

      // Save file
      fs.writeFileSync(photoPath, buffer);

      // Save to database
      const result = execute(
        `INSERT INTO photos (part_id, photo_path, created_at, file_size) VALUES (?, ?, ?, ?)`,
        [partId, photoPath, timestamp, buffer.length]
      );

      return { success: true, data: { id: result.lastInsertRowid, path: photoPath } };
    } catch (error: any) {
      console.error('Save photo error:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle(IPC_CHANNELS.DB_GET_PHOTOS, async (_event, partId: number) => {
    try {
      const photos = query(
        `SELECT * FROM photos WHERE part_id = ? ORDER BY created_at DESC`,
        [partId]
      );
      return { success: true, data: photos };
    } catch (error: any) {
      console.error('Get photos error:', error);
      return { success: false, error: error.message };
    }
  });

  // Export operations
  ipcMain.handle(IPC_CHANNELS.FILE_EXPORT_EXCEL, async (_event, shipmentId: number) => {
    try {
      // Get shipment data
      const shipment = queryOne(`SELECT * FROM shipments WHERE id = ?`, [shipmentId]);
      if (!shipment) {
        return { success: false, error: 'Shipment not found' };
      }

      // Get parts data
      const parts = query(`SELECT * FROM parts WHERE shipment_id = ? ORDER BY excel_row_number ASC`, [shipmentId]);

      // Export to Excel
      const filePath = await Reports.exportToExcel(shipmentId, shipment, parts);

      // Open file location
      shell.showItemInFolder(filePath);

      return { success: true, data: { path: filePath } };
    } catch (error: any) {
      console.error('Excel export error:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle(IPC_CHANNELS.FILE_EXPORT_HTML, async (_event, shipmentId: number) => {
    try {
      // Get shipment data
      const shipment = queryOne(`SELECT * FROM shipments WHERE id = ?`, [shipmentId]);
      if (!shipment) {
        return { success: false, error: 'Shipment not found' };
      }

      // Get parts data
      const parts = query(`SELECT * FROM parts WHERE shipment_id = ? ORDER BY excel_row_number ASC`, [shipmentId]);

      // Export to HTML
      const filePath = await Reports.exportToHTML(shipmentId, shipment, parts);

      // Open file in default browser
      shell.openPath(filePath);

      return { success: true, data: { path: filePath } };
    } catch (error: any) {
      console.error('HTML export error:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle(IPC_CHANNELS.FILE_EXPORT_ALL, async (_event, shipmentId: number) => {
    try {
      // Get shipment data
      const shipment = queryOne(`SELECT * FROM shipments WHERE id = ?`, [shipmentId]);
      if (!shipment) {
        return { success: false, error: 'Shipment not found' };
      }

      // Get parts data
      const parts = query(`SELECT * FROM parts WHERE shipment_id = ? ORDER BY excel_row_number ASC`, [shipmentId]);

      // Export all formats
      const excelPath = await Reports.exportToExcel(shipmentId, shipment, parts);
      const htmlPath = await Reports.exportToHTML(shipmentId, shipment, parts);

      // Open folder with reports
      const reportsDir = path.dirname(excelPath);
      shell.openPath(reportsDir);

      return {
        success: true,
        data: {
          excel: excelPath,
          html: htmlPath
        }
      };
    } catch (error: any) {
      console.error('Export all error:', error);
      return { success: false, error: error.message };
    }
  });
}
