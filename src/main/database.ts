import initSqlJs, { Database as SqlJsDatabase } from 'sql.js';
import * as path from 'path';
import * as fs from 'fs';
import { app } from 'electron';

let db: SqlJsDatabase | null = null;
let SQL: any = null;

/**
 * Get the path to the user data directory
 */
export function getUserDataPath(): string {
  const userDataPath = app.getPath('userData');
  const dataDir = path.join(userDataPath, 'data');

  // Create data directory if it doesn't exist
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  return dataDir;
}

/**
 * Get the path to a shipment's folder
 * Format: Wysyłka_nr_[shipmentNumber]_[destination]_[date]
 */
export function getShipmentFolderPath(shipmentNumber: string, destination: string, createdDate: string): string {
  const userDataPath = app.getPath('userData');
  const shipmentsDir = path.join(userDataPath, 'shipments');

  // Sanitize folder name components
  const safeShipmentNumber = shipmentNumber.replace(/[<>:"/\\|?*]/g, '_').trim();
  const safeDestination = destination.replace(/[<>:"/\\|?*]/g, '_').trim();
  const safeDate = createdDate.replace(/[<>:"/\\|?*]/g, '_').trim();

  // Create folder name: Wysyłka_nr_xxxx_Lokalizacja_data
  const folderName = `Wysyłka_nr_${safeShipmentNumber}_${safeDestination}_${safeDate}`;
  const folderPath = path.join(shipmentsDir, folderName);

  // Create shipments directory if it doesn't exist
  if (!fs.existsSync(shipmentsDir)) {
    fs.mkdirSync(shipmentsDir, { recursive: true });
  }

  // Create shipment folder if it doesn't exist
  if (!fs.existsSync(folderPath)) {
    fs.mkdirSync(folderPath, { recursive: true });
  }

  return folderPath;
}

/**
 * Save database to disk
 */
function saveDatabase(): void {
  if (!db) return;

  const dbPath = path.join(getUserDataPath(), 'warehouse.db');
  const data = db.export();
  const buffer = Buffer.from(data);
  fs.writeFileSync(dbPath, buffer);
}

/**
 * Run database migrations
 */
function runMigrations(): void {
  if (!db) return;

  console.log('Running database migrations...');

  // Migration 1: Add weight_quantity column to parts table
  try {
    const tableInfo = db.exec("PRAGMA table_info(parts)");
    const columns = tableInfo[0]?.values || [];
    const hasWeightQuantity = columns.some((col: any) => col[1] === 'weight_quantity');

    if (!hasWeightQuantity) {
      console.log('Adding weight_quantity column to parts table');
      db.run('ALTER TABLE parts ADD COLUMN weight_quantity REAL');
      saveDatabase();
      console.log('Migration completed: added weight_quantity column');
    } else {
      console.log('weight_quantity column already exists');
    }
  } catch (error) {
    console.error('Migration error:', error);
  }

  // Migration 2: Add color_scheme setting
  try {
    const settingExists = db.exec("SELECT value FROM settings WHERE key = 'color_scheme'");

    if (!settingExists || settingExists.length === 0 || settingExists[0]?.values.length === 0) {
      console.log('Adding color_scheme setting');
      db.run("INSERT OR IGNORE INTO settings (key, value) VALUES ('color_scheme', 'default')");
      saveDatabase();
      console.log('Migration completed: added color_scheme setting');
    } else {
      console.log('color_scheme setting already exists');
    }
  } catch (error) {
    console.error('Migration error:', error);
  }

  // Migration 3: Add sound_volume setting
  try {
    const settingExists = db.exec("SELECT value FROM settings WHERE key = 'sound_volume'");

    if (!settingExists || settingExists.length === 0 || settingExists[0]?.values.length === 0) {
      console.log('Adding sound_volume setting');
      db.run("INSERT OR IGNORE INTO settings (key, value) VALUES ('sound_volume', '70')");
      saveDatabase();
      console.log('Migration completed: added sound_volume setting');
    } else {
      console.log('sound_volume setting already exists');
    }
  } catch (error) {
    console.error('Migration error:', error);
  }

  // Migration 4: Add password column to shipments table
  try {
    const tableInfo = db.exec("PRAGMA table_info(shipments)");
    const columns = tableInfo[0]?.values || [];
    const hasPassword = columns.some((col: any) => col[1] === 'password');

    if (!hasPassword) {
      console.log('Adding password column to shipments table');
      db.run('ALTER TABLE shipments ADD COLUMN password TEXT');
      saveDatabase();
      console.log('Migration completed: added password column');
    } else {
      console.log('password column already exists');
    }
  } catch (error) {
    console.error('Migration error:', error);
  }

  // Migration 5: Add report_language setting
  try {
    const settingExists = db.exec("SELECT value FROM settings WHERE key = 'report_language'");

    if (!settingExists || settingExists.length === 0 || settingExists[0]?.values.length === 0) {
      console.log('Adding report_language setting');
      db.run("INSERT OR IGNORE INTO settings (key, value) VALUES ('report_language', 'pl')");
      saveDatabase();
      console.log('Migration completed: added report_language setting');
    } else {
      console.log('report_language setting already exists');
    }
  } catch (error) {
    console.error('Migration error:', error);
  }

  // Migration 6: Add archived column to shipments table
  try {
    const tableInfo = db.exec("PRAGMA table_info(shipments)");
    const columns = tableInfo[0]?.values || [];
    const hasArchived = columns.some((col: any) => col[1] === 'archived');

    if (!hasArchived) {
      console.log('Adding archived column to shipments table');
      db.run('ALTER TABLE shipments ADD COLUMN archived INTEGER DEFAULT 0');
      saveDatabase();
      console.log('Migration completed: added archived column');
    } else {
      console.log('archived column already exists');
    }
  } catch (error) {
    console.error('Migration error:', error);
  }

  // Migration 7: Create users table
  try {
    const tableExists = db.exec("SELECT name FROM sqlite_master WHERE type='table' AND name='users'");

    if (!tableExists || tableExists.length === 0 || tableExists[0]?.values.length === 0) {
      console.log('Creating users table');
      db.run(`
        CREATE TABLE users (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          surname TEXT,
          password_hash TEXT,
          created_at INTEGER NOT NULL,
          last_login_at INTEGER
        )
      `);
      saveDatabase();
      console.log('Migration completed: created users table');
    } else {
      console.log('users table already exists');
    }
  } catch (error) {
    console.error('Migration error:', error);
  }

  // Migration 8: Add role and active columns to users table
  try {
    const tableInfo = db.exec("PRAGMA table_info(users)");
    const columns = tableInfo[0]?.values || [];
    const hasRole = columns.some((col: any) => col[1] === 'role');
    const hasActive = columns.some((col: any) => col[1] === 'active');

    if (!hasRole) {
      console.log('Adding role column to users table');
      db.run("ALTER TABLE users ADD COLUMN role TEXT NOT NULL DEFAULT 'user'");
      saveDatabase();
      console.log('Migration completed: added role column');
    }

    if (!hasActive) {
      console.log('Adding active column to users table');
      db.run('ALTER TABLE users ADD COLUMN active INTEGER NOT NULL DEFAULT 1');
      saveDatabase();
      console.log('Migration completed: added active column');
    }

    if (hasRole && hasActive) {
      console.log('role and active columns already exist');
    }
  } catch (error) {
    console.error('Migration error:', error);
  }

  // Migration 9: Rename last_login_at to last_login in users table
  try {
    const tableInfo = db.exec("PRAGMA table_info(users)");
    const columns = tableInfo[0]?.values || [];
    const hasLastLoginAt = columns.some((col: any) => col[1] === 'last_login_at');
    const hasLastLogin = columns.some((col: any) => col[1] === 'last_login');

    // SQLite doesn't support column rename, so we copy data if needed
    if (hasLastLoginAt && !hasLastLogin) {
      console.log('Migrating last_login_at to last_login');
      db.run('ALTER TABLE users ADD COLUMN last_login INTEGER');
      db.run('UPDATE users SET last_login = last_login_at');
      // Note: We can't drop columns in SQLite easily, so we'll just leave last_login_at
      saveDatabase();
      console.log('Migration completed: added last_login column');
    } else if (!hasLastLogin && !hasLastLoginAt) {
      console.log('Adding last_login column to users table');
      db.run('ALTER TABLE users ADD COLUMN last_login INTEGER');
      saveDatabase();
      console.log('Migration completed: added last_login column');
    } else {
      console.log('last_login column already exists');
    }
  } catch (error) {
    console.error('Migration error:', error);
  }

  // Migration 10: Add user_id column to shipments table
  try {
    const tableInfo = db.exec("PRAGMA table_info(shipments)");
    const columns = tableInfo[0]?.values || [];
    const hasUserId = columns.some((col: any) => col[1] === 'user_id');

    if (!hasUserId) {
      console.log('Adding user_id column to shipments table');
      db.run('ALTER TABLE shipments ADD COLUMN user_id INTEGER');
      saveDatabase();
      console.log('Migration completed: added user_id column');
    } else {
      console.log('user_id column already exists');
    }
  } catch (error) {
    console.error('Migration error:', error);
  }

  console.log('Migrations complete');
}

/**
 * Initialize the database
 */
export async function initDatabase(): Promise<SqlJsDatabase> {
  if (db) {
    return db;
  }

  // Initialize sql.js
  if (!SQL) {
    SQL = await initSqlJs({
      // This will load the wasm binary from node_modules
      locateFile: (file: string) => {
        return path.join(__dirname, '../../node_modules/sql.js/dist', file);
      }
    });
  }

  const dbPath = path.join(getUserDataPath(), 'warehouse.db');
  console.log('Database path:', dbPath);

  // Load existing database or create new one
  if (fs.existsSync(dbPath)) {
    const buffer = fs.readFileSync(dbPath);
    db = new SQL.Database(buffer);
    console.log('Loaded existing database');
  } else {
    db = new SQL.Database();
    console.log('Created new database');

    // Run schema for new database
    const schemaPath = path.join(__dirname, '../../database/schema.sql');

    // In development, schema is in the project root
    // In production, it's in resources
    let schemaSQL: string;

    if (fs.existsSync(schemaPath)) {
      schemaSQL = fs.readFileSync(schemaPath, 'utf-8');
    } else {
      // Try production path
      const prodSchemaPath = path.join(process.resourcesPath!, 'schema.sql');
      if (fs.existsSync(prodSchemaPath)) {
        schemaSQL = fs.readFileSync(prodSchemaPath, 'utf-8');
      } else {
        throw new Error('Database schema file not found');
      }
    }

    // db is guaranteed to be non-null here
    if (!db) {
      throw new Error('Failed to create database');
    }

    db.run(schemaSQL);
    console.log('Database schema initialized');

    // Save the new database
    saveDatabase();
  }

  // Run migrations for existing databases
  runMigrations();

  console.log('Database initialized successfully');

  // db is guaranteed to be non-null at this point
  if (!db) {
    throw new Error('Database initialization failed');
  }

  return db;
}

/**
 * Get the database instance
 */
export function getDatabase(): SqlJsDatabase {
  if (!db) {
    throw new Error('Database not initialized. Call initDatabase() first.');
  }
  return db;
}

/**
 * Close the database connection
 */
export function closeDatabase(): void {
  if (db) {
    saveDatabase();
    db.close();
    db = null;
    console.log('Database closed');
  }
}

/**
 * Run a query that returns multiple rows
 */
export function query<T = any>(sql: string, params: any[] = []): T[] {
  const database = getDatabase();
  const results: T[] = [];

  const stmt = database.prepare(sql);
  stmt.bind(params);

  while (stmt.step()) {
    const row = stmt.getAsObject();
    results.push(row as T);
  }

  stmt.free();

  // Save database after read operations (in case there were any writes)
  saveDatabase();

  return results;
}

/**
 * Run a query that returns a single row
 */
export function queryOne<T = any>(sql: string, params: any[] = []): T | undefined {
  const database = getDatabase();

  const stmt = database.prepare(sql);
  stmt.bind(params);

  let result: T | undefined = undefined;

  if (stmt.step()) {
    result = stmt.getAsObject() as T;
  }

  stmt.free();

  // Save database after read operations (in case there were any writes)
  saveDatabase();

  return result;
}

export interface RunResult {
  changes: number;
  lastInsertRowid: number;
}

/**
 * Execute a statement (INSERT, UPDATE, DELETE)
 */
export function execute(sql: string, params: any[] = []): RunResult {
  const database = getDatabase();

  database.run(sql, params);

  // Get the last insert rowid and changes
  const lastInsertRowid = database.exec("SELECT last_insert_rowid() as id")[0]?.values[0]?.[0] as number || 0;
  const changes = database.getRowsModified();

  // Save database after write operations
  saveDatabase();

  return {
    changes,
    lastInsertRowid
  };
}

/**
 * Execute multiple statements in a transaction
 */
export function transaction<T>(callback: () => T): T {
  const database = getDatabase();

  try {
    database.run('BEGIN TRANSACTION');
    const result = callback();
    database.run('COMMIT');

    // Save database after transaction
    saveDatabase();

    return result;
  } catch (error) {
    database.run('ROLLBACK');
    throw error;
  }
}
