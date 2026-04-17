import { User, Family, Child, TrainingPlan, GameConfig, TrainingSession, ProgressData, GameResult } from '../types';

const API_BASE = '/api';

function getToken(): string | null {
  return localStorage.getItem('token');
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: '请求失败' }));
    throw new Error(error.error || '请求失败');
  }

  return res.json();
}

// Auth
export async function login(phone: string, password: string) {
  return request<{ token: string; user: User; familyId: string }>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ phone, password }),
  });
}

export async function register(data: { phone: string; password: string; nickname?: string }) {
  return request<{ token: string; user: User; familyId: string }>('/auth/register', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function getMe(): Promise<User> {
  return request('/auth/me');
}

// Family
export async function getFamily(): Promise<Family> {
  return request('/family');
}

export async function getChildren(): Promise<Child[]> {
  return request('/family/children');
}

export async function addChild(data: Partial<Child>): Promise<{ id: string }> {
  return request('/family/children', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateChild(id: string, data: Partial<Child>): Promise<{ success: boolean }> {
  return request(`/family/children/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function deleteChild(id: string): Promise<{ success: boolean }> {
  return request(`/family/children/${id}`, { method: 'DELETE' });
}

export async function getTrainingPlan(childId: string): Promise<TrainingPlan | null> {
  return request(`/family/children/${childId}/plan`);
}

export async function updateTrainingPlan(childId: string, data: Partial<TrainingPlan>): Promise<{ success: boolean }> {
  return request(`/family/children/${childId}/plan`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function getGameConfigs(childId: string): Promise<GameConfig[]> {
  return request(`/family/children/${childId}/game-configs`);
}

export async function updateGameConfig(childId: string, gameId: string, data: Partial<GameConfig>): Promise<{ success: boolean }> {
  return request(`/family/children/${childId}/game-configs/${gameId}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

// Phase 3: Background config
export async function updateBackgroundConfig(childId: string, gameId: string, backgroundId: string): Promise<{ success: boolean }> {
  return request(`/family/children/${childId}/game-configs/${gameId}`, {
    method: 'PUT',
    body: JSON.stringify({ background_id: backgroundId }),
  });
}

export async function getBackgroundConfig(childId: string, gameId: string): Promise<string> {
  const configs = await request<GameConfig[]>(`/family/children/${childId}/game-configs`);
  const config = configs.find(c => c.game_id === gameId);
  return config?.background_id || 'default-dark';
}

// Training
export async function getGames() {
  return request('/training/games');
}

export async function startSession(data: {
  child_id: string;
  game_id: string;
  training_mode: string;
  dominant_eye: string;
  spatial_frequency: string;
  game_config?: Record<string, unknown>;
}): Promise<{ session_id: string }> {
  return request('/training/session/start', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateSessionScore(sessionId: string, data: {
  score: number;
  accuracy: number;
  combo_max: number;
  level_completed: number;
}): Promise<{ success: boolean }> {
  return request(`/training/session/${sessionId}/score`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function endSession(sessionId: string, data: Partial<GameResult>): Promise<{ success: boolean }> {
  return request(`/training/session/${sessionId}/end`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function getTrainingHistory(childId: string, limit = 50, offset = 0): Promise<TrainingSession[]> {
  return request(`/training/history/${childId}?limit=${limit}&offset=${offset}`);
}

export async function getProgress(childId: string, period: 'week' | 'month' = 'week'): Promise<ProgressData[]> {
  return request(`/training/progress/${childId}?period=${period}`);
}

export async function getDailySummary(childId: string) {
  return request(`/training/summary/${childId}/daily`);
}

export async function getWeeklyReport(childId: string) {
  return request(`/training/report/${childId}/weekly`);
}

export async function generateConsultationReport(childId: string): Promise<{
  report_id: string;
  share_token: string;
  expires_at: string;
}> {
  return request(`/training/report/${childId}/consultation`, { method: 'POST' });
}

// Doctor API
export async function doctorLogin(email: string, password: string) {
  return request<{ token: string; user: User; profile: any }>('/doctor/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
}

export async function doctorRegister(data: {
  email: string;
  password: string;
  nickname?: string;
  hospital?: string;
  specialty?: string;
  license_number?: string;
}) {
  return request<{ token: string; user: User }>('/doctor/register', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function getDoctorProfile(): Promise<any> {
  return request('/doctor/profile');
}

export async function updateDoctorProfile(data: any): Promise<{ success: boolean }> {
  return request('/doctor/profile', {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function getDoctorPatients(): Promise<any[]> {
  return request('/doctor/patients');
}

export async function addDoctorPatient(childId: string): Promise<{ id: string }> {
  return request('/doctor/patients', {
    method: 'POST',
    body: JSON.stringify({ child_id: childId }),
  });
}

export async function removeDoctorPatient(childId: string): Promise<{ success: boolean }> {
  return request(`/doctor/patients/${childId}`, { method: 'DELETE' });
}

export async function getPatientSessions(childId: string, limit = 50, offset = 0): Promise<any[]> {
  return request(`/doctor/patients/${childId}/sessions?limit=${limit}&offset=${offset}`);
}

export async function getPatientProgress(childId: string, period = 'week'): Promise<any[]> {
  return request(`/doctor/patients/${childId}/progress?period=${period}`);
}

export async function getPatientReport(childId: string): Promise<any> {
  return request(`/doctor/patients/${childId}/report`);
}

export async function updatePatientPlan(childId: string, data: any): Promise<{ success: boolean }> {
  return request(`/doctor/patients/${childId}/plan`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function sendPatientReminder(childId: string, message: string): Promise<{ success: boolean }> {
  return request(`/doctor/patients/${childId}/remind`, {
    method: 'POST',
    body: JSON.stringify({ message }),
  });
}

export async function searchPatients(query: string): Promise<any[]> {
  return request(`/doctor/search-patients?q=${encodeURIComponent(query)}`);
}

export async function getFhirPatient(childId: string): Promise<any> {
  return request(`/doctor/fhir/Patient/${childId}`);
}

export async function getFhirObservations(params: {
  childId?: string;
  dateFrom?: string;
  dateTo?: string;
  _count?: number;
}): Promise<any> {
  const qs = new URLSearchParams();
  if (params.childId) qs.set('childId', params.childId);
  if (params.dateFrom) qs.set('dateFrom', params.dateFrom);
  if (params.dateTo) qs.set('dateTo', params.dateTo);
  if (params._count) qs.set('_count', String(params._count));
  return request(`/doctor/fhir/Observation?${qs.toString()}`);
}

export async function getFhirCarePlan(childId: string): Promise<any> {
  return request(`/doctor/fhir/CarePlan/${childId}`);
}

// Prescriptions
export async function createPrescription(data: {
  child_id: string;
  plan_name?: string;
  daily_duration?: number;
  spatial_frequency_level?: string;
  training_mode?: string;
  dominant_eye?: string;
  allowed_games?: string[];
  instructions?: string;
  start_date?: string;
  end_date?: string;
}): Promise<{ id: string; success: boolean }> {
  return request('/doctor/prescriptions', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function getPrescription(id: string): Promise<any> {
  return request(`/doctor/prescriptions/${id}`);
}

export async function updatePrescription(id: string, data: any): Promise<{ success: boolean }> {
  return request(`/doctor/prescriptions/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function getPatientPrescriptions(childId: string): Promise<any[]> {
  return request(`/doctor/patients/${childId}/prescriptions`);
}

export async function getFhirExport(childId: string): Promise<any> {
  return request(`/doctor/patients/${childId}/fhir-export`);
}
