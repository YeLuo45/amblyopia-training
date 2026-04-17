import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import { LocalStore } from './localStore';

dotenv.config();

type StorageMode = 'mysql' | 'local';
type DataProvider = 'auto' | 'mysql' | 'local';

const connectionConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT || '3306'),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
};

const databaseName = process.env.DB_NAME || 'amblyopia_training';

const poolConfig = {
  ...connectionConfig,
  database: databaseName,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
};

let storageMode: StorageMode = 'mysql';
let mysqlPool: mysql.Pool | null = null;
let localStore: LocalStore | null = null;

const dataProvider = (process.env.DATA_PROVIDER || 'auto') as DataProvider;

export const pool = {
  async query(sql: string, params: any[] = []) {
    if (storageMode === 'mysql') {
      if (!mysqlPool) {
        throw new Error('MySQL pool 未初始化');
      }
      return mysqlPool.query(sql, params);
    }
    if (!localStore) {
      throw new Error('本地存储未初始化');
    }
    return localStore.query(sql, params);
  },
};

export function getStorageMode(): StorageMode {
  return storageMode;
}

export async function initDatabase() {
  if (dataProvider === 'local') {
    localStore = new LocalStore(process.env.LOCAL_DATA_FILE);
    await localStore.init();
    storageMode = 'local';
    console.log(`Using local JSON storage: ${localStore.getFilePath()}`);
    return;
  }

  try {
    const bootstrap = await mysql.createConnection(connectionConfig);
    try {
      await bootstrap.query(`CREATE DATABASE IF NOT EXISTS \`${databaseName}\``);
      await bootstrap.query(`USE \`${databaseName}\``);
      await ensureTables(bootstrap);
    } finally {
      await bootstrap.end();
    }

    mysqlPool = mysql.createPool(poolConfig);
    storageMode = 'mysql';
    console.log('Database tables initialized successfully');
  } catch (error) {
    if (dataProvider === 'mysql') {
      throw error;
    }
    const fallbackPath = process.env.LOCAL_DATA_FILE;
    localStore = new LocalStore(fallbackPath);
    await localStore.init();
    storageMode = 'local';
    console.warn('MySQL unavailable, using local JSON storage instead.');
    console.warn(error);
    console.log(`Local storage file: ${localStore.getFilePath()}`);
  }
}

async function ensureTables(connection: mysql.Connection) {
  // Users table (家长账号)
  await connection.query(`
    CREATE TABLE IF NOT EXISTS users (
      id VARCHAR(36) PRIMARY KEY,
      phone VARCHAR(20) UNIQUE,
      email VARCHAR(100) UNIQUE,
      password_hash VARCHAR(255) NOT NULL,
      nickname VARCHAR(50),
      avatar VARCHAR(500),
      wechat_union_id VARCHAR(100),
      wechat_open_id VARCHAR(100),
      role ENUM('parent', 'doctor', 'admin') DEFAULT 'parent',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )
  `);

  // Family table
  await connection.query(`
    CREATE TABLE IF NOT EXISTS families (
      id VARCHAR(36) PRIMARY KEY,
      name VARCHAR(100),
      owner_id VARCHAR(36) NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (owner_id) REFERENCES users(id)
    )
  `);

  // Family members (link users to families)
  await connection.query(`
    CREATE TABLE IF NOT EXISTS family_members (
      id VARCHAR(36) PRIMARY KEY,
      family_id VARCHAR(36) NOT NULL,
      user_id VARCHAR(36) NOT NULL,
      role ENUM('owner', 'member') DEFAULT 'member',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (family_id) REFERENCES families(id),
      FOREIGN KEY (user_id) REFERENCES users(id),
      UNIQUE KEY unique_family_user (family_id, user_id)
    )
  `);

  // Children profiles
  await connection.query(`
    CREATE TABLE IF NOT EXISTS children (
      id VARCHAR(36) PRIMARY KEY,
      family_id VARCHAR(36) NOT NULL,
      name VARCHAR(50) NOT NULL,
      gender ENUM('male', 'female', 'other') DEFAULT 'other',
      birth_date DATE,
      avatar VARCHAR(500),
      eye_condition ENUM('refractive', 'strabismic', 'deprivation', 'mixed', 'unknown') DEFAULT 'unknown',
      diagnosis_date DATE,
      treatment_phase ENUM('initial', 'intensive', 'maintenance') DEFAULT 'initial',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (family_id) REFERENCES families(id)
    )
  `);

  // Training plans
  await connection.query(`
    CREATE TABLE IF NOT EXISTS training_plans (
      id VARCHAR(36) PRIMARY KEY,
      child_id VARCHAR(36) NOT NULL,
      plan_name VARCHAR(100) DEFAULT '默认计划',
      phase ENUM('initial', 'intensive', 'maintenance') DEFAULT 'initial',
      daily_duration INT DEFAULT 20 COMMENT 'minutes',
      weekly_frequency INT DEFAULT 7,
      spatial_frequency_level ENUM('low', 'medium', 'high') DEFAULT 'medium',
      training_mode ENUM('monocular', 'binocular') DEFAULT 'monocular',
      dominant_eye ENUM('left', 'right', 'both') DEFAULT 'both',
      allowed_games JSON,
      start_date DATE,
      end_date DATE,
      is_active BOOLEAN DEFAULT TRUE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (child_id) REFERENCES children(id)
    )
  `);

  // Game configurations per child
  await connection.query(`
    CREATE TABLE IF NOT EXISTS game_configs (
      id VARCHAR(36) PRIMARY KEY,
      child_id VARCHAR(36) NOT NULL,
      game_id VARCHAR(50) NOT NULL,
      spatial_frequency ENUM('low', 'medium', 'high') DEFAULT 'medium',
      contrast ENUM('low', 'medium', 'high') DEFAULT 'medium',
      target_size ENUM('small', 'medium', 'large') DEFAULT 'medium',
      speed ENUM('slow', 'medium', 'fast') DEFAULT 'medium',
      is_enabled BOOLEAN DEFAULT TRUE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (child_id) REFERENCES children(id)
    )
  `);

  // Training sessions
  await connection.query(`
    CREATE TABLE IF NOT EXISTS training_sessions (
      id VARCHAR(36) PRIMARY KEY,
      child_id VARCHAR(36) NOT NULL,
      plan_id VARCHAR(36),
      game_id VARCHAR(50) NOT NULL,
      training_mode ENUM('monocular', 'binocular') DEFAULT 'monocular',
      dominant_eye ENUM('left', 'right', 'both') DEFAULT 'both',
      spatial_frequency ENUM('low', 'medium', 'high') DEFAULT 'medium',
      score INT DEFAULT 0,
      duration INT DEFAULT 0 COMMENT 'seconds',
      accuracy DECIMAL(5,2) DEFAULT 0,
      combo_max INT DEFAULT 0,
      level_completed INT DEFAULT 0,
      game_config JSON,
      started_at TIMESTAMP,
      ended_at TIMESTAMP,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (child_id) REFERENCES children(id),
      FOREIGN KEY (plan_id) REFERENCES training_plans(id)
    )
  `);

  // Game records (detailed per-game events)
  await connection.query(`
    CREATE TABLE IF NOT EXISTS game_records (
      id VARCHAR(36) PRIMARY KEY,
      session_id VARCHAR(36) NOT NULL,
      event_type VARCHAR(50) NOT NULL,
      event_data JSON,
      timestamp_ms INT DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (session_id) REFERENCES training_sessions(id)
    )
  `);

  // Reports
  await connection.query(`
    CREATE TABLE IF NOT EXISTS reports (
      id VARCHAR(36) PRIMARY KEY,
      child_id VARCHAR(36) NOT NULL,
      report_type ENUM('daily', 'weekly', 'monthly', 'consultation') NOT NULL,
      period_start DATE,
      period_end DATE,
      summary_data JSON,
      progress_data JSON,
      recommendations JSON,
      generated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (child_id) REFERENCES children(id)
    )
  `);

  // Report share tokens
  await connection.query(`
    CREATE TABLE IF NOT EXISTS report_tokens (
      id VARCHAR(36) PRIMARY KEY,
      report_id VARCHAR(36) NOT NULL,
      token VARCHAR(100) NOT NULL UNIQUE,
      expires_at TIMESTAMP NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (report_id) REFERENCES reports(id)
    )
  `);

  // Notification/reminder settings
  await connection.query(`
    CREATE TABLE IF NOT EXISTS notification_settings (
      id VARCHAR(36) PRIMARY KEY,
      family_id VARCHAR(36) NOT NULL,
      reminder_enabled BOOLEAN DEFAULT TRUE,
      reminder_times JSON,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (family_id) REFERENCES families(id)
    )
  `);

  // Doctor profiles
  await connection.query(`
    CREATE TABLE IF NOT EXISTS doctor_profiles (
      id VARCHAR(36) PRIMARY KEY,
      user_id VARCHAR(36) NOT NULL UNIQUE,
      hospital VARCHAR(200),
      specialty VARCHAR(100),
      license_number VARCHAR(100),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);

  // Doctor-patient assignments
  await connection.query(`
    CREATE TABLE IF NOT EXISTS doctor_patients (
      id VARCHAR(36) PRIMARY KEY,
      doctor_id VARCHAR(36) NOT NULL,
      child_id VARCHAR(36) NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (doctor_id) REFERENCES users(id),
      FOREIGN KEY (child_id) REFERENCES children(id),
      UNIQUE KEY unique_doctor_child (doctor_id, child_id)
    )
  `);

  // Doctor reminders/notifications to families
  await connection.query(`
    CREATE TABLE IF NOT EXISTS doctor_reminders (
      id VARCHAR(36) PRIMARY KEY,
      doctor_id VARCHAR(36) NOT NULL,
      child_id VARCHAR(36) NOT NULL,
      message TEXT,
      is_read BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (doctor_id) REFERENCES users(id),
      FOREIGN KEY (child_id) REFERENCES children(id)
    )
  `);

  // Prescriptions table
  await connection.query(`
    CREATE TABLE IF NOT EXISTS prescriptions (
      id VARCHAR(36) PRIMARY KEY,
      doctor_id VARCHAR(36) NOT NULL,
      child_id VARCHAR(36) NOT NULL,
      plan_name VARCHAR(200),
      daily_duration INT DEFAULT 20,
      spatial_frequency_level ENUM('low','medium','high') DEFAULT 'medium',
      training_mode ENUM('monocular','binocular') DEFAULT 'monocular',
      dominant_eye ENUM('left','right','both') DEFAULT 'both',
      allowed_games JSON,
      instructions TEXT,
      status ENUM('active','paused','completed') DEFAULT 'active',
      start_date DATE,
      end_date DATE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (doctor_id) REFERENCES users(id),
      FOREIGN KEY (child_id) REFERENCES children(id)
    )
  `);
}

export default pool;
