import { app, BrowserWindow, ipcMain, shell } from 'electron';
import * as path from 'path';
import * as fs from 'fs';
import { initDatabase, closeDatabase, query, queryOne, execute, getShipmentFolderPath } from './database';
import { IPC_CHANNELS } from '../shared/ipc-channels';
import { selectExcelFile, parseExcelFile, openFolder, selectFolder } from './fileSystem';
import * as Scale from './scale';
import * as Reports from './reports';
import { hashPassword, verifyPassword } from './auth';
import { ocr } from 'windows-media-ocr';
import sharp from 'sharp';

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
          require_weight, require_country, require_photos, require_serial_numbers,
          packed_by, created_date, password, user_id, custom_folder_path
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          shipmentData.shipment_number,
          shipmentData.destination,
          shipmentData.notes || null,
          Date.now(),
          'in_progress',
          shipmentData.require_weight ? 1 : 0,
          shipmentData.require_country ? 1 : 0,
          shipmentData.require_photos ? 1 : 0,
          shipmentData.require_serial_numbers ? 1 : 0,
          shipmentData.packed_by || null,
          new Date().toISOString().split('T')[0], // YYYY-MM-DD
          shipmentData.password || null,
          shipmentData.user_id || null,
          shipmentData.custom_folder_path || null,
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
      const users = query(`SELECT id, name, surname, login, report_language, role, active, created_at, last_login, force_password_change FROM users WHERE active = 1 ORDER BY surname ASC, name ASC`);
      return { success: true, data: users };
    } catch (error: any) {
      console.error('Get users error:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle(IPC_CHANNELS.DB_CREATE_USER, async (_event, userData: { name: string; surname: string; login: string; password: string; report_language: string; role?: string }) => {
    try {
      const { name, surname, login, password, report_language, role = 'user' } = userData;

      // Check if login already exists
      const existingUser = queryOne<any>(`SELECT id FROM users WHERE login = ?`, [login]);
      if (existingUser) {
        return { success: false, error: 'Login już istnieje. Wybierz inny login.' };
      }

      // Hash password (required)
      const passwordHash = await hashPassword(password);

      const result = execute(
        `INSERT INTO users (name, surname, login, password_hash, report_language, role, created_at, active) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [name, surname, login, passwordHash, report_language, role, Date.now(), 1]
      );

      return { success: true, data: { id: result.lastInsertRowid } };
    } catch (error: any) {
      console.error('Create user error:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle(IPC_CHANNELS.DB_LOGIN_USER, async (_event, credentials: { login: string; password: string }) => {
    try {
      const { login, password } = credentials;

      // Find user by login
      const user = queryOne<any>(`SELECT * FROM users WHERE login = ? AND active = 1`, [login]);

      if (!user) {
        return { success: false, error: 'Nieprawidłowy login lub hasło' };
      }

      // Verify password
      const isValid = await verifyPassword(password, user.password_hash);
      if (!isValid) {
        return { success: false, error: 'Nieprawidłowy login lub hasło' };
      }

      // Update last login time
      execute(`UPDATE users SET last_login = ? WHERE id = ?`, [Date.now(), user.id]);

      // Return user data (without password hash)
      return {
        success: true,
        data: {
          id: user.id,
          name: user.name,
          surname: user.surname,
          login: user.login,
          report_language: user.report_language,
          role: user.role,
          created_at: user.created_at,
          last_login: Date.now(),
          active: user.active,
          force_password_change: Boolean(user.force_password_change)
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

  ipcMain.handle(IPC_CHANNELS.DB_CHANGE_PASSWORD, async (_event, data: { userId: number; currentPassword: string; newPassword: string }) => {
    try {
      const { userId, currentPassword, newPassword } = data;

      // Get user
      const user = queryOne<any>(`SELECT * FROM users WHERE id = ?`, [userId]);
      if (!user) {
        return { success: false, error: 'Użytkownik nie istnieje' };
      }

      // Verify current password
      const isValid = await verifyPassword(currentPassword, user.password_hash);
      if (!isValid) {
        return { success: false, error: 'Nieprawidłowe obecne hasło' };
      }

      // Hash new password
      const newPasswordHash = await hashPassword(newPassword);

      // Update password and clear force_password_change flag
      execute(`UPDATE users SET password_hash = ?, force_password_change = 0 WHERE id = ?`, [newPasswordHash, userId]);

      return { success: true };
    } catch (error: any) {
      console.error('Change password error:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle(IPC_CHANNELS.DB_RESET_USER_PASSWORD, async (_event, userId: number) => {
    try {
      // Reset password to 'Start.123' and set force_password_change flag
      const defaultPassword = 'Start.123';
      const passwordHash = await hashPassword(defaultPassword);

      execute(`UPDATE users SET password_hash = ?, force_password_change = 1 WHERE id = ?`, [passwordHash, userId]);

      return { success: true };
    } catch (error: any) {
      console.error('Reset user password error:', error);
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

  ipcMain.handle(IPC_CHANNELS.FILE_SELECT_FOLDER, async () => {
    try {
      const result = await selectFolder();
      return { success: true, data: result };
    } catch (error: any) {
      console.error('Select folder error:', error);
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
                s.shipment_number, s.destination, s.created_date, s.custom_folder_path
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
        part.created_date,
        part.custom_folder_path
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

  ipcMain.handle(IPC_CHANNELS.DB_DELETE_PHOTO, async (_event, photoId: number) => {
    try {
      // Get photo path from database
      const photo = queryOne<any>('SELECT photo_path FROM photos WHERE id = ?', [photoId]);

      if (!photo) {
        return { success: false, error: 'Photo not found' };
      }

      // Delete file from disk if it exists
      if (fs.existsSync(photo.photo_path)) {
        fs.unlinkSync(photo.photo_path);
        console.log('Deleted photo file:', photo.photo_path);
      } else {
        console.warn('Photo file not found on disk:', photo.photo_path);
      }

      // Delete from database
      execute('DELETE FROM photos WHERE id = ?', [photoId]);

      return { success: true };
    } catch (error: any) {
      console.error('Delete photo error:', error);
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

  // OCR operations
  ipcMain.handle(IPC_CHANNELS.OCR_PROCESS_IMAGE, async (_event, imageData: string) => {
    const tempImagePaths: string[] = [];

    try {
      console.log('[OCR] Starting OCR processing with image preprocessing...');

      // Remove data URL prefix (data:image/jpeg;base64,)
      const base64Data = imageData.replace(/^data:image\/\w+;base64,/, '');
      const buffer = Buffer.from(base64Data, 'base64');

      console.log('[OCR] Image buffer size:', buffer.length, 'bytes');

      const tempDir = app.getPath('temp');
      const timestamp = Date.now();

      // Define preprocessing variants to try in order
      const preprocessingVariants = [
        {
          name: 'high-contrast',
          process: (img: sharp.Sharp) =>
            img
              .resize(1600, 1200, { fit: 'inside', withoutEnlargement: false })
              .grayscale()
              .normalize()
              .sharpen()
              .threshold(128)
        },
        {
          name: 'enhanced',
          process: (img: sharp.Sharp) =>
            img
              .resize(2000, 1500, { fit: 'inside', withoutEnlargement: false })
              .grayscale()
              .normalize()
              .linear(1.5, -(128 * 0.5)) // Increase contrast
              .sharpen({ sigma: 2 })
        },
        {
          name: 'basic',
          process: (img: sharp.Sharp) =>
            img
              .resize(1600, 1200, { fit: 'inside', withoutEnlargement: false })
              .grayscale()
              .normalize()
        },
        {
          name: 'large',
          process: (img: sharp.Sharp) =>
            img
              .resize(2400, 1800, { fit: 'inside', withoutEnlargement: false })
              .grayscale()
              .sharpen()
        }
      ];

      let bestResult: any = null;
      let bestText = '';

      // Try each preprocessing variant
      for (const variant of preprocessingVariants) {
        try {
          console.log(`[OCR] Trying preprocessing variant: ${variant.name}...`);

          // Preprocess image
          const processedBuffer = await variant.process(sharp(buffer)).png().toBuffer();

          // Save preprocessed image
          const tempImagePath = path.join(tempDir, `ocr_temp_${timestamp}_${variant.name}.png`);
          fs.writeFileSync(tempImagePath, processedBuffer);
          tempImagePaths.push(tempImagePath);

          console.log(`[OCR] Preprocessed image saved (${variant.name}):`, tempImagePath);
          console.log(`[OCR] Processed file size: ${processedBuffer.length} bytes`);

          // Process with Windows OCR
          console.log(`[OCR] Calling Windows OCR for variant: ${variant.name}...`);
          const result = await ocr(tempImagePath);

          console.log(`[OCR] Result for ${variant.name}:`, JSON.stringify(result, null, 2));

          // Extract text from result
          const text = result.Text || '';
          const lines = result.Lines || [];

          console.log(`[OCR] Extracted text (${variant.name}):`, text);
          console.log(`[OCR] Line count (${variant.name}):`, lines.length);

          // If we found text, use this result
          if (text.trim().length > bestText.length) {
            bestText = text.trim();
            bestResult = {
              text: text.trim(),
              lines: lines,
              variant: variant.name,
              rawResult: result
            };

            console.log(`[OCR] New best result from variant: ${variant.name} (${text.trim().length} chars)`);

            // If we got good text, stop trying other variants
            if (text.trim().length > 3) {
              console.log('[OCR] Good text found, stopping variant search');
              break;
            }
          }
        } catch (variantError: any) {
          console.error(`[OCR] Error with variant ${variant.name}:`, variantError.message);
          // Continue to next variant
        }
      }

      // Clean up temp files
      for (const tempPath of tempImagePaths) {
        if (fs.existsSync(tempPath)) {
          try {
            fs.unlinkSync(tempPath);
            console.log('[OCR] Temp file cleaned up:', tempPath);
          } catch (cleanupError) {
            console.error('[OCR] Cleanup error for', tempPath, ':', cleanupError);
          }
        }
      }

      // Return best result found
      if (bestResult) {
        console.log('[OCR] Final result - text length:', bestText.length);
        return {
          success: true,
          data: {
            text: bestResult.text,
            lines: bestResult.lines,
            confidence: 0.9,
            variant: bestResult.variant,
            rawResult: bestResult.rawResult
          }
        };
      } else {
        console.log('[OCR] No text detected in any variant');
        return {
          success: true,
          data: {
            text: '',
            lines: [],
            confidence: 0,
            variant: 'none',
            message: 'No text detected'
          }
        };
      }
    } catch (error: any) {
      console.error('[OCR] Processing error:', error);
      console.error('[OCR] Error stack:', error.stack);

      // Clean up temp files on error
      for (const tempPath of tempImagePaths) {
        if (fs.existsSync(tempPath)) {
          try {
            fs.unlinkSync(tempPath);
          } catch (cleanupError) {
            console.error('[OCR] Cleanup error:', cleanupError);
          }
        }
      }

      return {
        success: false,
        error: error.message || 'Unknown OCR error',
        errorDetails: {
          message: error.message,
          stack: error.stack,
          name: error.name
        }
      };
    }
  });

  // Save serial number photo with _SN suffix
  ipcMain.handle(IPC_CHANNELS.OCR_SAVE_SN_PHOTO, async (_event, partId: number, imageData: string, snSequence: number) => {
    try {
      // Get part data and shipment info
      const part = queryOne<any>(
        `SELECT p.sap_index, p.excel_row_number, p.shipment_id,
                s.shipment_number, s.destination, s.created_date, s.custom_folder_path
         FROM parts p
         INNER JOIN shipments s ON p.shipment_id = s.id
         WHERE p.id = ?`,
        [partId]
      );

      if (!part) {
        return { success: false, error: 'Part not found' };
      }

      // Get shipment folder path
      const shipmentFolderPath = getShipmentFolderPath(
        part.shipment_number,
        part.destination,
        part.created_date,
        part.custom_folder_path
      );

      // Create photos subdirectory inside shipment folder
      const photosDir = path.join(shipmentFolderPath, 'photos');
      if (!fs.existsSync(photosDir)) {
        fs.mkdirSync(photosDir, { recursive: true });
      }

      // Sanitize SAP index for filename
      const safeSapIndex = part.sap_index
        .replace(/[<>:"/\\|?*]/g, '_')
        .replace(/\s+/g, '_')
        .trim();

      // Generate filename: line_[rowNumber]_SAP_[sapIndex]_SN[sequence].jpg
      const lineNumber = part.excel_row_number || 0;
      const filename = `line_${lineNumber}_SAP_${safeSapIndex}_SN${snSequence}.jpg`;
      const photoPath = path.join(photosDir, filename);

      // Remove data URL prefix
      const base64Data = imageData.replace(/^data:image\/\w+;base64,/, '');
      const buffer = Buffer.from(base64Data, 'base64');

      // Save file
      fs.writeFileSync(photoPath, buffer);

      return { success: true, data: { path: photoPath } };
    } catch (error: any) {
      console.error('Save SN photo error:', error);
      return { success: false, error: error.message };
    }
  });
}
