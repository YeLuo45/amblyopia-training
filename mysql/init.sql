-- Initialize Amblyopia Training Database
-- This script is run automatically when MySQL container starts

-- Create database if not exists
CREATE DATABASE IF NOT EXISTS amblyopia_training CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

USE amblyopia_training;

-- Set timezone
SET time_zone = '+00:00';

-- Users table
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
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_phone (phone),
  INDEX idx_email (email),
  INDEX idx_wechat_union_id (wechat_union_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Families table
CREATE TABLE IF NOT EXISTS families (
  id VARCHAR(36) PRIMARY KEY,
  name VARCHAR(100),
  owner_id VARCHAR(36) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_owner (owner_id),
  FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Family members
CREATE TABLE IF NOT EXISTS family_members (
  id VARCHAR(36) PRIMARY KEY,
  family_id VARCHAR(36) NOT NULL,
  user_id VARCHAR(36) NOT NULL,
  role ENUM('owner', 'member') DEFAULT 'member',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_family (family_id),
  INDEX idx_user (user_id),
  FOREIGN KEY (family_id) REFERENCES families(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE KEY unique_family_user (family_id, user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Children profiles
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
  INDEX idx_family (family_id),
  INDEX idx_treatment_phase (treatment_phase),
  FOREIGN KEY (family_id) REFERENCES families(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Training plans
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
  INDEX idx_child (child_id),
  INDEX idx_is_active (is_active),
  FOREIGN KEY (child_id) REFERENCES children(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Game configurations
CREATE TABLE IF NOT EXISTS game_configs (
  id VARCHAR(36) PRIMARY KEY,
  child_id VARCHAR(36) NOT NULL,
  game_id VARCHAR(50) NOT NULL,
  spatial_frequency ENUM('low', 'medium', 'high') DEFAULT 'medium',
  contrast ENUM('low', 'medium', 'high') DEFAULT 'medium',
  target_size ENUM('small', 'medium', 'large') DEFAULT 'medium',
  speed ENUM('slow', 'medium', 'fast') DEFAULT 'medium',
  is_enabled BOOLEAN DEFAULT TRUE,
  background_id VARCHAR(50) DEFAULT 'default-dark' COMMENT 'Phase 3: background scene id',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_child_game (child_id, game_id),
  FOREIGN KEY (child_id) REFERENCES children(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Training sessions
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
  INDEX idx_child (child_id),
  INDEX idx_started_at (started_at),
  INDEX idx_game (game_id),
  FOREIGN KEY (child_id) REFERENCES children(id) ON DELETE CASCADE,
  FOREIGN KEY (plan_id) REFERENCES training_plans(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Game records (events)
CREATE TABLE IF NOT EXISTS game_records (
  id VARCHAR(36) PRIMARY KEY,
  session_id VARCHAR(36) NOT NULL,
  event_type VARCHAR(50) NOT NULL,
  event_data JSON,
  timestamp_ms INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_session (session_id),
  INDEX idx_event_type (event_type),
  FOREIGN KEY (session_id) REFERENCES training_sessions(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Reports
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
  INDEX idx_child (child_id),
  INDEX idx_report_type (report_type),
  INDEX idx_generated_at (generated_at),
  FOREIGN KEY (child_id) REFERENCES children(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Report share tokens
CREATE TABLE IF NOT EXISTS report_tokens (
  id VARCHAR(36) PRIMARY KEY,
  report_id VARCHAR(36) NOT NULL,
  token VARCHAR(100) NOT NULL UNIQUE,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_token (token),
  INDEX idx_expires (expires_at),
  FOREIGN KEY (report_id) REFERENCES reports(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Notification settings
CREATE TABLE IF NOT EXISTS notification_settings (
  id VARCHAR(36) PRIMARY KEY,
  family_id VARCHAR(36) NOT NULL,
  reminder_enabled BOOLEAN DEFAULT TRUE,
  reminder_times JSON DEFAULT '[]',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_family (family_id),
  FOREIGN KEY (family_id) REFERENCES families(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Doctors table
CREATE TABLE IF NOT EXISTS doctors (
  id VARCHAR(36) PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  name VARCHAR(100),
  hospital VARCHAR(200),
  specialty VARCHAR(100),
  license_number VARCHAR(100),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Doctor-Patient relationships
CREATE TABLE IF NOT EXISTS doctor_patients (
  id VARCHAR(36) PRIMARY KEY,
  doctor_id VARCHAR(36) NOT NULL,
  child_id VARCHAR(36) NOT NULL,
  relationship VARCHAR(50),
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_doctor (doctor_id),
  INDEX idx_child (child_id),
  UNIQUE KEY unique_doctor_child (doctor_id, child_id),
  FOREIGN KEY (doctor_id) REFERENCES doctors(id),
  FOREIGN KEY (child_id) REFERENCES children(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Prescriptions
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
  INDEX idx_doctor (doctor_id),
  INDEX idx_child (child_id),
  INDEX idx_status (status),
  FOREIGN KEY (doctor_id) REFERENCES doctors(id),
  FOREIGN KEY (child_id) REFERENCES children(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Doctor reminders
CREATE TABLE IF NOT EXISTS doctor_reminders (
  id VARCHAR(36) PRIMARY KEY,
  doctor_id VARCHAR(36) NOT NULL,
  child_id VARCHAR(36) NOT NULL,
  message TEXT,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_doctor (doctor_id),
  INDEX idx_child (child_id),
  FOREIGN KEY (doctor_id) REFERENCES doctors(id),
  FOREIGN KEY (child_id) REFERENCES children(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Grant privileges (only for root user)
FLUSH PRIVILEGES;
