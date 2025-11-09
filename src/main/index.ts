import { app, BrowserWindow, ipcMain } from 'electron';
import * as path from 'path';
import { initDatabase, closeDatabase, query, queryOne, execute } from './database';
import { IPC_CHANNELS } from '../shared/ipc-channels';
import { selectExcelFile, parseExcelFile, openFolder } from './fileSystem';

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
app.whenReady().then(() => {
  console.log('App is ready');

  // Initialize database
  try {
    initDatabase();
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
          packed_by, created_date
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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

  // App version
  ipcMain.handle(IPC_CHANNELS.APP_GET_VERSION, async () => {
    return { success: true, data: app.getVersion() };
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
}
