import fs from 'fs';
import path from 'path';
import { GAMES } from '../types';

type UserRole = 'parent' | 'doctor' | 'admin';
type Gender = 'male' | 'female' | 'other';
type EyeCondition = 'refractive' | 'strabismic' | 'deprivation' | 'mixed' | 'unknown';
type TreatmentPhase = 'initial' | 'intensive' | 'maintenance';
type TrainingMode = 'monocular' | 'binocular';
type DominantEye = 'left' | 'right' | 'both';
type Level3 = 'low' | 'medium' | 'high';
type Size3 = 'small' | 'medium' | 'large';
type Speed3 = 'slow' | 'medium' | 'fast';

interface LocalUser {
  id: string;
  phone: string | null;
  email: string | null;
  password_hash: string;
  nickname: string | null;
  avatar: string | null;
  role: UserRole;
  created_at: string;
  updated_at: string;
}

interface LocalFamily {
  id: string;
  name: string | null;
  owner_id: string;
  created_at: string;
  updated_at: string;
}

interface LocalFamilyMember {
  id: string;
  family_id: string;
  user_id: string;
  role: 'owner' | 'member';
  created_at: string;
}

interface LocalChild {
  id: string;
  family_id: string;
  name: string;
  gender: Gender;
  birth_date: string | null;
  avatar: string | null;
  eye_condition: EyeCondition;
  diagnosis_date: string | null;
  treatment_phase: TreatmentPhase;
  created_at: string;
  updated_at: string;
}

interface LocalTrainingPlan {
  id: string;
  child_id: string;
  plan_name: string;
  phase: TreatmentPhase;
  daily_duration: number;
  weekly_frequency: number;
  spatial_frequency_level: Level3;
  training_mode: TrainingMode;
  dominant_eye: DominantEye;
  allowed_games: string[];
  start_date: string | null;
  end_date: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface LocalGameConfig {
  id: string;
  child_id: string;
  game_id: string;
  spatial_frequency: Level3;
  contrast: Level3;
  target_size: Size3;
  speed: Speed3;
  is_enabled: boolean;
  created_at: string;
  updated_at: string;
}

interface LocalTrainingSession {
  id: string;
  child_id: string;
  plan_id: string | null;
  game_id: string;
  training_mode: TrainingMode;
  dominant_eye: DominantEye;
  spatial_frequency: Level3;
  score: number;
  duration: number;
  accuracy: number;
  combo_max: number;
  level_completed: number;
  game_config: Record<string, unknown>;
  started_at: string;
  ended_at: string | null;
  created_at: string;
}

interface LocalGameRecord {
  id: string;
  session_id: string;
  event_type: string;
  event_data: Record<string, unknown>;
  timestamp_ms: number;
  created_at: string;
}

interface LocalReport {
  id: string;
  child_id: string;
  report_type: 'daily' | 'weekly' | 'monthly' | 'consultation';
  period_start: string | null;
  period_end: string | null;
  summary_data: Record<string, unknown>;
  progress_data: unknown[];
  generated_at: string;
}

interface LocalReportToken {
  id: string;
  report_id: string;
  token: string;
  expires_at: string;
  created_at: string;
}

interface LocalNotificationSettings {
  id: string;
  family_id: string;
  reminder_enabled: boolean;
  reminder_times: string[];
  created_at: string;
  updated_at: string;
}

interface LocalDatabaseData {
  users: LocalUser[];
  families: LocalFamily[];
  familyMembers: LocalFamilyMember[];
  children: LocalChild[];
  trainingPlans: LocalTrainingPlan[];
  gameConfigs: LocalGameConfig[];
  trainingSessions: LocalTrainingSession[];
  gameRecords: LocalGameRecord[];
  reports: LocalReport[];
  reportTokens: LocalReportToken[];
  notificationSettings: LocalNotificationSettings[];
}

function nowIso(): string {
  return new Date().toISOString();
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function normalizeSql(sql: string): string {
  return sql.replace(/\s+/g, ' ').trim().toLowerCase();
}

function parseJsonObject(value: unknown): Record<string, unknown> {
  if (!value) {
    return {};
  }
  if (typeof value === 'string') {
    try {
      return JSON.parse(value) as Record<string, unknown>;
    } catch {
      return {};
    }
  }
  return value as Record<string, unknown>;
}

function parseJsonArray(value: unknown): unknown[] {
  if (!value) {
    return [];
  }
  if (typeof value === 'string') {
    try {
      return JSON.parse(value) as unknown[];
    } catch {
      return [];
    }
  }
  if (Array.isArray(value)) {
    return value;
  }
  return [];
}

function startOfDayIso(value: string): string {
  return value.slice(0, 10);
}

function isWithinDays(iso: string, days: number): boolean {
  const since = Date.now() - days * 24 * 60 * 60 * 1000;
  return new Date(iso).getTime() >= since;
}

export class LocalStore {
  private readonly filePath: string;

  private data: LocalDatabaseData = {
    users: [],
    families: [],
    familyMembers: [],
    children: [],
    trainingPlans: [],
    gameConfigs: [],
    trainingSessions: [],
    gameRecords: [],
    reports: [],
    reportTokens: [],
    notificationSettings: [],
  };

  constructor(filePath?: string) {
    this.filePath = filePath || path.resolve(process.cwd(), '..', '.local-data.json');
  }

  getFilePath(): string {
    return this.filePath;
  }

  async init(): Promise<void> {
    fs.mkdirSync(path.dirname(this.filePath), { recursive: true });
    if (fs.existsSync(this.filePath)) {
      const raw = fs.readFileSync(this.filePath, 'utf8');
      if (raw.trim()) {
        this.data = JSON.parse(raw) as LocalDatabaseData;
      }
    } else {
      this.save();
    }
  }

  async query(sql: string, params: any[] = []): Promise<[any, any]> {
    const normalized = normalizeSql(sql);

    if (normalized.startsWith('select id from users where phone = ? or email = ?')) {
      const [phone, email] = params;
      const rows = this.data.users
        .filter((user) => this.matchesUser(user, phone, email))
        .map((user) => ({ id: user.id }));
      return [clone(rows), undefined];
    }

    if (normalized.startsWith('select * from users where phone = ? or email = ?')) {
      const [phone, email] = params;
      const rows = this.data.users.filter((user) => this.matchesUser(user, phone, email));
      return [clone(rows), undefined];
    }

    if (normalized.startsWith('select * from users where id = ?')) {
      const [userId] = params;
      const rows = this.data.users.filter((user) => user.id === userId);
      return [clone(rows), undefined];
    }

    if (normalized.startsWith('insert into users')) {
      const [id, phone, email, passwordHash, nickname, role] = params;
      const timestamp = nowIso();
      this.data.users.push({
        id,
        phone: phone ?? null,
        email: email ?? null,
        password_hash: passwordHash,
        nickname: nickname ?? null,
        avatar: null,
        role,
        created_at: timestamp,
        updated_at: timestamp,
      });
      this.save();
      return [this.affected(1), undefined];
    }

    if (normalized.startsWith('update users set nickname = coalesce(?, nickname), avatar = coalesce(?, avatar) where id = ?')) {
      const [nickname, avatar, userId] = params;
      const user = this.data.users.find((item) => item.id === userId);
      if (!user) {
        return [this.affected(0), undefined];
      }
      if (nickname !== null && nickname !== undefined) {
        user.nickname = nickname;
      }
      if (avatar !== null && avatar !== undefined) {
        user.avatar = avatar;
      }
      user.updated_at = nowIso();
      this.save();
      return [this.affected(1), undefined];
    }

    if (normalized.startsWith('insert into families')) {
      const [id, name, ownerId] = params;
      const timestamp = nowIso();
      this.data.families.push({
        id,
        name: name ?? null,
        owner_id: ownerId,
        created_at: timestamp,
        updated_at: timestamp,
      });
      this.save();
      return [this.affected(1), undefined];
    }

    if (normalized.startsWith('insert into family_members')) {
      const [id, familyId, userId, role] = params;
      this.data.familyMembers.push({
        id,
        family_id: familyId,
        user_id: userId,
        role,
        created_at: nowIso(),
      });
      this.save();
      return [this.affected(1), undefined];
    }

    if (normalized.includes('from families f join family_members fm on fm.family_id = f.id where fm.user_id = ?')) {
      const [userId] = params;
      const requireOwner = normalized.includes("fm.role = 'owner'");
      const membership = this.data.familyMembers.find((item) => item.user_id === userId && (!requireOwner || item.role === 'owner'));
      if (!membership) {
        return [[], undefined];
      }
      const family = this.data.families.find((item) => item.id === membership.family_id);
      if (!family) {
        return [[], undefined];
      }
      if (normalized.startsWith('select f.id from families')) {
        return [[{ id: family.id }], undefined];
      }
      return [[clone(family)], undefined];
    }

    if (normalized.startsWith('insert into notification_settings') && normalized.includes('on duplicate key update')) {
      const [id, familyId, reminderEnabled, reminderTimes, reminderEnabledUpdate, reminderTimesUpdate] = params;
      const existing = this.data.notificationSettings.find((item) => item.family_id === familyId);
      if (existing) {
        if (reminderEnabledUpdate !== null && reminderEnabledUpdate !== undefined) {
          existing.reminder_enabled = Boolean(reminderEnabledUpdate);
        }
        if (reminderTimesUpdate !== null && reminderTimesUpdate !== undefined) {
          existing.reminder_times = parseJsonArray(reminderTimesUpdate).map(String);
        }
        existing.updated_at = nowIso();
      } else {
        const timestamp = nowIso();
        this.data.notificationSettings.push({
          id,
          family_id: familyId,
          reminder_enabled: reminderEnabled !== null && reminderEnabled !== undefined ? Boolean(reminderEnabled) : true,
          reminder_times: parseJsonArray(reminderTimes).map(String),
          created_at: timestamp,
          updated_at: timestamp,
        });
      }
      this.save();
      return [this.affected(1), undefined];
    }

    if (normalized.startsWith('insert into notification_settings')) {
      const [id, familyId, reminderTimes] = params;
      const timestamp = nowIso();
      this.data.notificationSettings.push({
        id,
        family_id: familyId,
        reminder_enabled: true,
        reminder_times: parseJsonArray(reminderTimes).map(String),
        created_at: timestamp,
        updated_at: timestamp,
      });
      this.save();
      return [this.affected(1), undefined];
    }

    if (normalized.startsWith('select * from notification_settings where family_id = ? limit 1')) {
      const [familyId] = params;
      const row = this.data.notificationSettings.find((item) => item.family_id === familyId);
      return [row ? [clone(row)] : [], undefined];
    }

    if (normalized.startsWith('select * from children where family_id = ? order by created_at desc')) {
      const [familyId] = params;
      const rows = this.data.children
        .filter((item) => item.family_id === familyId)
        .sort((a, b) => b.created_at.localeCompare(a.created_at));
      return [clone(rows), undefined];
    }

    if (normalized.startsWith('select * from children where id = ?')) {
      const [childId] = params;
      const rows = this.data.children.filter((item) => item.id === childId);
      return [clone(rows), undefined];
    }

    if (normalized.startsWith('insert into children')) {
      const [id, familyId, name, gender, birthDate, eyeCondition, diagnosisDate, treatmentPhase] = params;
      const timestamp = nowIso();
      this.data.children.push({
        id,
        family_id: familyId,
        name,
        gender: gender ?? 'other',
        birth_date: birthDate ?? null,
        avatar: null,
        eye_condition: eyeCondition ?? 'unknown',
        diagnosis_date: diagnosisDate ?? null,
        treatment_phase: treatmentPhase ?? 'initial',
        created_at: timestamp,
        updated_at: timestamp,
      });
      this.save();
      return [this.affected(1), undefined];
    }

    if (normalized.startsWith('update children set')) {
      const [name, gender, birthDate, eyeCondition, diagnosisDate, treatmentPhase, avatar, childId] = params;
      const child = this.data.children.find((item) => item.id === childId);
      if (!child) {
        return [this.affected(0), undefined];
      }
      if (name !== null && name !== undefined) child.name = name;
      if (gender !== null && gender !== undefined) child.gender = gender;
      if (birthDate !== null && birthDate !== undefined) child.birth_date = birthDate;
      if (eyeCondition !== null && eyeCondition !== undefined) child.eye_condition = eyeCondition;
      if (diagnosisDate !== null && diagnosisDate !== undefined) child.diagnosis_date = diagnosisDate;
      if (treatmentPhase !== null && treatmentPhase !== undefined) child.treatment_phase = treatmentPhase;
      if (avatar !== null && avatar !== undefined) child.avatar = avatar;
      child.updated_at = nowIso();
      this.save();
      return [this.affected(1), undefined];
    }

    if (normalized.startsWith('delete from children where id = ?')) {
      const [childId] = params;
      this.data.children = this.data.children.filter((item) => item.id !== childId);
      this.data.trainingPlans = this.data.trainingPlans.filter((item) => item.child_id !== childId);
      this.data.gameConfigs = this.data.gameConfigs.filter((item) => item.child_id !== childId);
      const sessionIds = this.data.trainingSessions.filter((item) => item.child_id === childId).map((item) => item.id);
      this.data.trainingSessions = this.data.trainingSessions.filter((item) => item.child_id !== childId);
      this.data.gameRecords = this.data.gameRecords.filter((item) => !sessionIds.includes(item.session_id));
      this.data.reports = this.data.reports.filter((item) => item.child_id !== childId);
      const reportIds = this.data.reports.filter((item) => item.child_id === childId).map((item) => item.id);
      this.data.reportTokens = this.data.reportTokens.filter((item) => !reportIds.includes(item.report_id));
      this.save();
      return [this.affected(1), undefined];
    }

    if (normalized.startsWith('select * from training_plans where child_id = ? and is_active = true limit 1')) {
      const [childId] = params;
      const row = this.data.trainingPlans.find((item) => item.child_id === childId && item.is_active);
      return [row ? [clone(row)] : [], undefined];
    }

    if (normalized.startsWith('update training_plans set is_active = false where child_id = ?')) {
      const [childId] = params;
      this.data.trainingPlans.forEach((item) => {
        if (item.child_id === childId) {
          item.is_active = false;
          item.updated_at = nowIso();
        }
      });
      this.save();
      return [this.affected(1), undefined];
    }

    if (normalized.startsWith('insert into training_plans')) {
      const timestamp = nowIso();
      if (params.length === 7) {
        const [id, childId, planName, dailyDuration, spatialFrequencyLevel, trainingMode, isActive] = params;
        this.data.trainingPlans.push({
          id,
          child_id: childId,
          plan_name: planName ?? '默认计划',
          phase: 'initial',
          daily_duration: Number(dailyDuration ?? 20),
          weekly_frequency: 7,
          spatial_frequency_level: spatialFrequencyLevel ?? 'medium',
          training_mode: trainingMode ?? 'monocular',
          dominant_eye: 'both',
          allowed_games: [],
          start_date: null,
          end_date: null,
          is_active: Boolean(isActive),
          created_at: timestamp,
          updated_at: timestamp,
        });
      } else {
        const [
          id,
          childId,
          planName,
          phase,
          dailyDuration,
          weeklyFrequency,
          spatialFrequencyLevel,
          trainingMode,
          dominantEye,
          allowedGames,
          startDate,
          endDate,
          isActive,
        ] = params;
        this.data.trainingPlans.push({
          id,
          child_id: childId,
          plan_name: planName ?? '默认计划',
          phase: phase ?? 'initial',
          daily_duration: Number(dailyDuration ?? 20),
          weekly_frequency: Number(weeklyFrequency ?? 7),
          spatial_frequency_level: spatialFrequencyLevel ?? 'medium',
          training_mode: trainingMode ?? 'monocular',
          dominant_eye: dominantEye ?? 'both',
          allowed_games: parseJsonArray(allowedGames).map(String),
          start_date: startDate ?? null,
          end_date: endDate ?? null,
          is_active: Boolean(isActive),
          created_at: timestamp,
          updated_at: timestamp,
        });
      }
      this.save();
      return [this.affected(1), undefined];
    }

    if (normalized.startsWith('select * from game_configs where child_id = ?')) {
      const [childId] = params;
      const rows = this.data.gameConfigs.filter((item) => item.child_id === childId);
      return [clone(rows), undefined];
    }

    if (normalized.startsWith('insert into game_configs')) {
      const [id, childId, gameId, spatialFrequency, contrast, targetSize, speed, isEnabled] = params;
      const timestamp = nowIso();
      this.data.gameConfigs.push({
        id,
        child_id: childId,
        game_id: gameId,
        spatial_frequency: spatialFrequency ?? 'medium',
        contrast: contrast ?? 'medium',
        target_size: targetSize ?? 'medium',
        speed: speed ?? 'medium',
        is_enabled: Boolean(isEnabled),
        created_at: timestamp,
        updated_at: timestamp,
      });
      this.save();
      return [this.affected(1), undefined];
    }

    if (normalized.startsWith('update game_configs set')) {
      const [spatialFrequency, contrast, targetSize, speed, isEnabled, childId, gameId] = params;
      const config = this.data.gameConfigs.find((item) => item.child_id === childId && item.game_id === gameId);
      if (!config) {
        return [this.affected(0), undefined];
      }
      if (spatialFrequency !== null && spatialFrequency !== undefined) config.spatial_frequency = spatialFrequency;
      if (contrast !== null && contrast !== undefined) config.contrast = contrast;
      if (targetSize !== null && targetSize !== undefined) config.target_size = targetSize;
      if (speed !== null && speed !== undefined) config.speed = speed;
      if (isEnabled !== null && isEnabled !== undefined) config.is_enabled = Boolean(isEnabled);
      config.updated_at = nowIso();
      this.save();
      return [this.affected(1), undefined];
    }

    if (normalized.startsWith('insert into training_sessions')) {
      const [
        id,
        childId,
        planId,
        gameId,
        trainingMode,
        dominantEye,
        spatialFrequency,
        score,
        gameConfig,
      ] = params;
      const timestamp = nowIso();
      this.data.trainingSessions.push({
        id,
        child_id: childId,
        plan_id: planId ?? null,
        game_id: gameId,
        training_mode: trainingMode ?? 'monocular',
        dominant_eye: dominantEye ?? 'both',
        spatial_frequency: spatialFrequency ?? 'medium',
        score: Number(score ?? 0),
        duration: 0,
        accuracy: 0,
        combo_max: 0,
        level_completed: 0,
        game_config: parseJsonObject(gameConfig),
        started_at: timestamp,
        ended_at: null,
        created_at: timestamp,
      });
      this.save();
      return [this.affected(1), undefined];
    }

    if (normalized.startsWith('update training_sessions set score = ?, accuracy = ?, combo_max = greatest(combo_max, ?) where id = ?')) {
      const [score, accuracy, combo, sessionId] = params;
      const session = this.data.trainingSessions.find((item) => item.id === sessionId);
      if (!session) {
        return [this.affected(0), undefined];
      }
      session.score = Number(score ?? session.score);
      session.accuracy = Number(accuracy ?? session.accuracy);
      session.combo_max = Math.max(session.combo_max, Number(combo ?? session.combo_max));
      this.save();
      return [this.affected(1), undefined];
    }

    if (normalized.startsWith('update training_sessions set ended_at = now() where id = ? and ended_at is null')) {
      const [sessionId] = params;
      const session = this.data.trainingSessions.find((item) => item.id === sessionId && item.ended_at === null);
      if (!session) {
        return [this.affected(0), undefined];
      }
      session.ended_at = nowIso();
      this.save();
      return [this.affected(1), undefined];
    }

    if (normalized.startsWith('update training_sessions set score = coalesce(?, score), accuracy = coalesce(?, accuracy), combo_max = coalesce(?, combo_max), level_completed = coalesce(?, level_completed) where id = ?')) {
      const [score, accuracy, comboMax, levelCompleted, sessionId] = params;
      const session = this.data.trainingSessions.find((item) => item.id === sessionId);
      if (!session) {
        return [this.affected(0), undefined];
      }
      if (score !== null && score !== undefined) session.score = Number(score);
      if (accuracy !== null && accuracy !== undefined) session.accuracy = Number(accuracy);
      if (comboMax !== null && comboMax !== undefined) session.combo_max = Number(comboMax);
      if (levelCompleted !== null && levelCompleted !== undefined) session.level_completed = Number(levelCompleted);
      this.save();
      return [this.affected(1), undefined];
    }

    if (normalized.startsWith('update training_sessions set score = coalesce(?, score), duration = coalesce(?, duration), accuracy = coalesce(?, accuracy), combo_max = coalesce(?, combo_max), level_completed = coalesce(?, level_completed), ended_at = now() where id = ?')) {
      const [score, duration, accuracy, comboMax, levelCompleted, sessionId] = params;
      return this.completeSession(sessionId, { score, duration, accuracy, comboMax, levelCompleted });
    }

    if (normalized.startsWith('update training_sessions set score = ?, duration = ?, accuracy = ?, combo_max = ?, level_completed = ?, ended_at = now() where id = ?')) {
      const [score, duration, accuracy, comboMax, levelCompleted, sessionId] = params;
      return this.completeSession(sessionId, { score, duration, accuracy, comboMax, levelCompleted });
    }

    if (normalized.startsWith('insert into game_records')) {
      const [id, sessionId, eventType, eventData, timestampMs] = params;
      this.data.gameRecords.push({
        id,
        session_id: sessionId,
        event_type: eventType,
        event_data: parseJsonObject(eventData),
        timestamp_ms: Number(timestampMs ?? 0),
        created_at: nowIso(),
      });
      this.save();
      return [this.affected(1), undefined];
    }

    if (normalized.startsWith('select ts.*, g.name as game_name, g.name_cn as game_name_cn from training_sessions ts')) {
      const [childId, userId, limit, offset] = params;
      const rows = this.getUserChildSessions(userId, childId)
        .sort((a, b) => b.started_at.localeCompare(a.started_at))
        .slice(Number(offset), Number(offset) + Number(limit))
        .map((session) => {
          const game = GAMES.find((item) => item.id === session.game_id);
          return {
            ...session,
            game_name: game?.name || session.game_id,
            game_name_cn: game?.name_cn || session.game_id,
          };
        });
      return [clone(rows), undefined];
    }

    if (normalized.startsWith('select date(started_at) as date, count(*) as sessions, sum(duration) as total_minutes')) {
      const [childId, userId] = params;
      const today = startOfDayIso(nowIso());
      const rows = this.getUserChildSessions(userId, childId).filter((item) => startOfDayIso(item.started_at) === today);
      if (rows.length === 0) {
        return [[], undefined];
      }
      const summary = {
        date: today,
        sessions: rows.length,
        total_minutes: rows.reduce((sum, item) => sum + item.duration, 0) / 60,
        avg_score: rows.reduce((sum, item) => sum + item.score, 0) / rows.length,
        games_played: [...new Set(rows.map((item) => item.game_id))].join(','),
      };
      return [[summary], undefined];
    }

    if (normalized.startsWith('select yearweek(started_at, 1) as year_week, count(*) as total_sessions')) {
      const [childId, userId] = params;
      const rows = this.getUserChildSessions(userId, childId).filter((item) => isWithinDays(item.started_at, 7));
      if (rows.length === 0) {
        return [[], undefined];
      }
      const trainingDays = new Set(rows.map((item) => startOfDayIso(item.started_at)));
      const summary = {
        year_week: this.yearWeek(rows[0].started_at),
        total_sessions: rows.length,
        total_minutes: rows.reduce((sum, item) => sum + item.duration, 0) / 60,
        avg_score: rows.reduce((sum, item) => sum + item.score, 0) / rows.length,
        avg_accuracy: rows.reduce((sum, item) => sum + item.accuracy, 0) / rows.length,
        training_days: trainingDays.size,
      };
      return [[summary], undefined];
    }

    if (normalized.startsWith('select game_id, count(*) as sessions, avg(score) as avg_score')) {
      const [childId, userId] = params;
      const rows = this.getUserChildSessions(userId, childId).filter((item) => isWithinDays(item.started_at, 7));
      const grouped = new Map<string, LocalTrainingSession[]>();
      rows.forEach((item) => {
        const list = grouped.get(item.game_id) || [];
        list.push(item);
        grouped.set(item.game_id, list);
      });
      const result = [...grouped.entries()].map(([gameId, sessions]) => ({
        game_id: gameId,
        sessions: sessions.length,
        avg_score: sessions.reduce((sum, item) => sum + item.score, 0) / sessions.length,
        total_minutes: sessions.reduce((sum, item) => sum + item.duration, 0) / 60,
      }));
      return [clone(result), undefined];
    }

    if (normalized.startsWith('select * from training_sessions ts join children c on c.id = ts.child_id join family_members fm on fm.family_id = c.family_id where ts.child_id = ? and fm.user_id = ? and started_at >= date_sub(curdate(), interval 30 day) order by started_at desc')) {
      const [childId, userId] = params;
      const rows = this.getUserChildSessions(userId, childId)
        .filter((item) => isWithinDays(item.started_at, 30))
        .sort((a, b) => b.started_at.localeCompare(a.started_at));
      return [clone(rows), undefined];
    }

    if (normalized.startsWith('select c.* from children c join family_members fm on fm.family_id = c.family_id where c.id = ? and fm.user_id = ?')) {
      const [childId, userId] = params;
      const child = this.data.children.find((item) => item.id === childId);
      if (!child || !this.userOwnsFamily(userId, child.family_id)) {
        return [[], undefined];
      }
      return [[clone(child)], undefined];
    }

    if (normalized.startsWith('select ') && normalized.includes('from training_sessions ts join children c on c.id = ts.child_id join family_members fm on fm.family_id = c.family_id where ts.child_id = ? and fm.user_id = ? group by')) {
      const [childId, userId] = params;
      const byMonth = normalized.includes('date_format(started_at');
      const grouped = new Map<string, LocalTrainingSession[]>();
      this.getUserChildSessions(userId, childId).forEach((item) => {
        const key = byMonth ? item.started_at.slice(0, 7) : item.started_at.slice(0, 10);
        const list = grouped.get(key) || [];
        list.push(item);
        grouped.set(key, list);
      });
      const result = [...grouped.entries()]
        .map(([period, sessions]) => ({
          period,
          session_count: sessions.length,
          total_duration: sessions.reduce((sum, item) => sum + item.duration, 0),
          avg_score: sessions.reduce((sum, item) => sum + item.score, 0) / sessions.length,
          avg_accuracy: sessions.reduce((sum, item) => sum + item.accuracy, 0) / sessions.length,
          max_score: sessions.reduce((max, item) => Math.max(max, item.score), 0),
        }))
        .sort((a, b) => b.period.localeCompare(a.period))
        .slice(0, 30);
      return [clone(result), undefined];
    }

    if (normalized.startsWith('insert into reports')) {
      const [id, childId, summaryData, progressData] = params;
      this.data.reports.push({
        id,
        child_id: childId,
        report_type: 'consultation',
        period_start: null,
        period_end: null,
        summary_data: parseJsonObject(summaryData),
        progress_data: parseJsonArray(progressData),
        generated_at: nowIso(),
      });
      this.save();
      return [this.affected(1), undefined];
    }

    if (normalized.startsWith('insert into report_tokens')) {
      const [id, reportId, token, expiresAt] = params;
      this.data.reportTokens.push({
        id,
        report_id: reportId,
        token,
        expires_at: new Date(expiresAt).toISOString(),
        created_at: nowIso(),
      });
      this.save();
      return [this.affected(1), undefined];
    }

    if (normalized.startsWith('select r.* from report_tokens rt join reports r on r.id = rt.report_id where rt.token = ? and rt.expires_at > now()')) {
      const [token] = params;
      const reportToken = this.data.reportTokens.find((item) => item.token === token && new Date(item.expires_at).getTime() > Date.now());
      if (!reportToken) {
        return [[], undefined];
      }
      const report = this.data.reports.find((item) => item.id === reportToken.report_id);
      return [report ? [clone(report)] : [], undefined];
    }

    if (normalized.startsWith('select ts.*, c.name as child_name from training_sessions ts join children c on c.id = ts.child_id where 1=1')) {
      const patientId = params[0];
      const date = params[1];
      const rows = this.data.trainingSessions
        .filter((item) => {
          if (patientId && item.child_id !== patientId) {
            return false;
          }
          if (date && startOfDayIso(item.started_at) !== String(date)) {
            return false;
          }
          return true;
        })
        .sort((a, b) => b.started_at.localeCompare(a.started_at))
        .slice(0, 50)
        .map((item) => ({
          ...item,
          child_name: this.data.children.find((child) => child.id === item.child_id)?.name || item.child_id,
        }));
      return [clone(rows), undefined];
    }

    throw new Error(`Local storage does not support query: ${sql}`);
  }

  private matchesUser(user: LocalUser, phone: unknown, email: unknown): boolean {
    const hasPhone = phone !== null && phone !== undefined;
    const hasEmail = email !== null && email !== undefined;
    return (hasPhone && user.phone === phone) || (hasEmail && user.email === email);
  }

  private userOwnsFamily(userId: string, familyId: string): boolean {
    return this.data.familyMembers.some((item) => item.user_id === userId && item.family_id === familyId);
  }

  private getUserChildSessions(userId: string, childId: string): LocalTrainingSession[] {
    const child = this.data.children.find((item) => item.id === childId);
    if (!child || !this.userOwnsFamily(userId, child.family_id)) {
      return [];
    }
    return this.data.trainingSessions.filter((item) => item.child_id === childId);
  }

  private completeSession(
    sessionId: string,
    values: { score: unknown; duration: unknown; accuracy: unknown; comboMax: unknown; levelCompleted: unknown; }
  ): [any, any] {
    const session = this.data.trainingSessions.find((item) => item.id === sessionId);
    if (!session) {
      return [this.affected(0), undefined];
    }
    if (values.score !== null && values.score !== undefined) session.score = Number(values.score);
    if (values.duration !== null && values.duration !== undefined) session.duration = Number(values.duration);
    if (values.accuracy !== null && values.accuracy !== undefined) session.accuracy = Number(values.accuracy);
    if (values.comboMax !== null && values.comboMax !== undefined) session.combo_max = Number(values.comboMax);
    if (values.levelCompleted !== null && values.levelCompleted !== undefined) session.level_completed = Number(values.levelCompleted);
    session.ended_at = nowIso();
    this.save();
    return [this.affected(1), undefined];
  }

  private yearWeek(iso: string): string {
    const date = new Date(iso);
    const start = new Date(date.getFullYear(), 0, 1);
    const dayOfYear = Math.floor((date.getTime() - start.getTime()) / 86400000) + 1;
    const week = Math.ceil(dayOfYear / 7);
    return `${date.getFullYear()}${String(week).padStart(2, '0')}`;
  }

  private affected(affectedRows: number): { affectedRows: number } {
    return { affectedRows };
  }

  private save(): void {
    fs.writeFileSync(this.filePath, JSON.stringify(this.data, null, 2), 'utf8');
  }
}
