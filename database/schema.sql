-- Users table
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    surname TEXT NOT NULL,
    login TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    report_language TEXT NOT NULL DEFAULT 'pl',  -- 'pl' or 'en'
    role TEXT NOT NULL DEFAULT 'user',  -- 'admin' or 'user'
    created_at INTEGER NOT NULL,
    last_login INTEGER,
    active BOOLEAN NOT NULL DEFAULT 1
);

-- Main shipments table
CREATE TABLE IF NOT EXISTS shipments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    shipment_number TEXT NOT NULL UNIQUE,
    destination TEXT NOT NULL,
    notes TEXT,
    created_at INTEGER NOT NULL,
    completed_at INTEGER,
    status TEXT NOT NULL DEFAULT 'in_progress',

    -- Configuration for this shipment
    require_weight BOOLEAN NOT NULL DEFAULT 0,
    require_country BOOLEAN NOT NULL DEFAULT 0,
    require_photos BOOLEAN NOT NULL DEFAULT 0,

    -- Metadata
    packed_by TEXT,
    packing_time_seconds INTEGER,

    -- Excel file reference
    excel_file_path TEXT,

    -- Password protection (optional)
    password TEXT,

    created_date TEXT NOT NULL,

    -- User ownership
    user_id INTEGER,
    archived BOOLEAN NOT NULL DEFAULT 0,

    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Parts in shipment
CREATE TABLE IF NOT EXISTS parts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    shipment_id INTEGER NOT NULL,

    -- From Excel
    sap_index TEXT NOT NULL,
    description TEXT NOT NULL,
    quantity REAL NOT NULL,
    unit TEXT NOT NULL,

    -- Packing status
    status TEXT NOT NULL DEFAULT 'pending',
    packed_at INTEGER,
    packing_time_seconds INTEGER,

    -- Optional data
    weight_total REAL,
    weight_per_unit REAL,
    weight_quantity REAL,
    country_of_origin TEXT,

    -- Excel metadata
    excel_row_number INTEGER,

    FOREIGN KEY (shipment_id) REFERENCES shipments(id) ON DELETE CASCADE
);

-- Photos attached to parts
CREATE TABLE IF NOT EXISTS photos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    part_id INTEGER NOT NULL,

    photo_path TEXT NOT NULL,
    thumbnail_path TEXT,

    created_at INTEGER NOT NULL,
    file_size INTEGER,

    FOREIGN KEY (part_id) REFERENCES parts(id) ON DELETE CASCADE
);

-- Autosave snapshots
CREATE TABLE IF NOT EXISTS autosaves (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    shipment_id INTEGER NOT NULL,

    snapshot_data TEXT NOT NULL,
    created_at INTEGER NOT NULL,

    FOREIGN KEY (shipment_id) REFERENCES shipments(id) ON DELETE CASCADE
);

-- User statistics
CREATE TABLE IF NOT EXISTS user_stats (
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    total_shipments INTEGER NOT NULL DEFAULT 0,
    total_parts INTEGER NOT NULL DEFAULT 0,
    total_packing_time_seconds INTEGER NOT NULL DEFAULT 0,

    fastest_part_time_seconds INTEGER,
    fastest_shipment_time_seconds INTEGER,

    last_updated INTEGER NOT NULL
);

-- Achievements
CREATE TABLE IF NOT EXISTS achievements (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    achievement_id TEXT NOT NULL UNIQUE,
    unlocked_at INTEGER NOT NULL,
    shipment_id INTEGER
);

-- App settings
CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_surname ON users(surname);
CREATE INDEX IF NOT EXISTS idx_users_login ON users(login);
CREATE INDEX IF NOT EXISTS idx_parts_shipment ON parts(shipment_id);
CREATE INDEX IF NOT EXISTS idx_parts_status ON parts(status);
CREATE INDEX IF NOT EXISTS idx_photos_part ON photos(part_id);
CREATE INDEX IF NOT EXISTS idx_shipments_status ON shipments(status);
CREATE INDEX IF NOT EXISTS idx_shipments_date ON shipments(created_date);
CREATE INDEX IF NOT EXISTS idx_shipments_user ON shipments(user_id);

-- Initial data
INSERT OR IGNORE INTO user_stats (id, total_shipments, total_parts, total_packing_time_seconds, last_updated)
VALUES (1, 0, 0, 0, strftime('%s', 'now'));

-- Default settings
INSERT OR IGNORE INTO settings (key, value) VALUES ('scale_com_port', '');
INSERT OR IGNORE INTO settings (key, value) VALUES ('scale_baud_rate', '9600');
INSERT OR IGNORE INTO settings (key, value) VALUES ('scale_auto_detect', 'true');
INSERT OR IGNORE INTO settings (key, value) VALUES ('network_drive_path', '');
INSERT OR IGNORE INTO settings (key, value) VALUES ('enable_network_export', 'false');
INSERT OR IGNORE INTO settings (key, value) VALUES ('auto_export_on_complete', 'false');
INSERT OR IGNORE INTO settings (key, value) VALUES ('enable_voice', 'true');
INSERT OR IGNORE INTO settings (key, value) VALUES ('voice_volume', '80');
INSERT OR IGNORE INTO settings (key, value) VALUES ('voice_language', 'pl-PL');
INSERT OR IGNORE INTO settings (key, value) VALUES ('sound_volume', '70');
INSERT OR IGNORE INTO settings (key, value) VALUES ('user_name', '');
INSERT OR IGNORE INTO settings (key, value) VALUES ('user_surname', '');
INSERT OR IGNORE INTO settings (key, value) VALUES ('report_language', 'pl');
INSERT OR IGNORE INTO settings (key, value) VALUES ('theme', 'dark');
INSERT OR IGNORE INTO settings (key, value) VALUES ('color_scheme', 'default');
INSERT OR IGNORE INTO settings (key, value) VALUES ('animations_enabled', 'true');
INSERT OR IGNORE INTO settings (key, value) VALUES ('sound_effects_enabled', 'true');
INSERT OR IGNORE INTO settings (key, value) VALUES ('autosave_interval', '2');
INSERT OR IGNORE INTO settings (key, value) VALUES ('show_statistics', 'true');
INSERT OR IGNORE INTO settings (key, value) VALUES ('enable_achievements', 'true');
INSERT OR IGNORE INTO settings (key, value) VALUES ('debug_mode', 'false');
INSERT OR IGNORE INTO settings (key, value) VALUES ('log_level', 'info');
