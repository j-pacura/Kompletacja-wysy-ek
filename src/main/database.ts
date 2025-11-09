import Database from 'better-sqlite3';
import * as path from 'path';
import * as fs from 'fs';
import { app } from 'electron';

let db: Database.Database | null = null;

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
 * Initialize the database
 */
export function initDatabase(): Database.Database {
  if (db) {
    return db;
  }

  const dbPath = path.join(getUserDataPath(), 'warehouse.db');
  console.log('Database path:', dbPath);

  db = new Database(dbPath);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  // Run schema
  const schemaPath = path.join(__dirname, '../../database/schema.sql');

  // In development, schema is in the project root
  // In production, it's in resources
  let schemaSQL: string;

  if (fs.existsSync(schemaPath)) {
    schemaSQL = fs.readFileSync(schemaPath, 'utf-8');
  } else {
    // Try production path
    const prodSchemaPath = path.join(process.resourcesPath, 'schema.sql');
    if (fs.existsSync(prodSchemaPath)) {
      schemaSQL = fs.readFileSync(prodSchemaPath, 'utf-8');
    } else {
      throw new Error('Database schema file not found');
    }
  }

  db.exec(schemaSQL);
  console.log('Database initialized successfully');

  return db;
}

/**
 * Get the database instance
 */
export function getDatabase(): Database.Database {
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
  const stmt = database.prepare(sql);
  return stmt.all(...params) as T[];
}

/**
 * Run a query that returns a single row
 */
export function queryOne<T = any>(sql: string, params: any[] = []): T | undefined {
  const database = getDatabase();
  const stmt = database.prepare(sql);
  return stmt.get(...params) as T | undefined;
}

/**
 * Execute a statement (INSERT, UPDATE, DELETE)
 */
export function execute(sql: string, params: any[] = []): Database.RunResult {
  const database = getDatabase();
  const stmt = database.prepare(sql);
  return stmt.run(...params);
}

/**
 * Execute multiple statements in a transaction
 */
export function transaction<T>(callback: () => T): T {
  const database = getDatabase();
  const txn = database.transaction(callback);
  return txn();
}
