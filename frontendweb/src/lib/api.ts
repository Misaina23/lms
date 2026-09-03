const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';

export type PaginatedResponse<T> = {
  count: number
  next: string | null
  previous: string | null
  results: T[]
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Token ${token}` } : {}),
    ...options.headers,
  };

  try {
    const response = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Erreur réseau' }));
      throw new Error(error.detail || `Erreur ${response.status}`);
    }

    if (response.status === 204) return {} as T;
    return response.json();
  } catch (error) {
    if (error instanceof TypeError && error.message === 'Failed to fetch') {
      const pathParts = path.split('/');
      const resource = pathParts[pathParts.length - 2] || 'items';
      return {
        count: 0,
        next: null,
        previous: null,
        results: [],
      } as T;
    }
    throw error;
  }
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, data: unknown) =>
    request<T>(path, { method: 'POST', body: JSON.stringify(data) }),
  put: <T>(path: string, data: unknown) =>
    request<T>(path, { method: 'PUT', body: JSON.stringify(data) }),
  patch: <T>(path: string, data: unknown) =>
    request<T>(path, { method: 'PATCH', body: JSON.stringify(data) }),
  delete: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
}

export type User = {
  id: number;
  username: string;
  matricule: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  role: string;
  teacher_type: string | null;
  status: string;
  date_of_birth: string | null;
  address: string;
  created_at: string;
  updated_at: string;
};

export type Classe = {
  id: number;
  nom: string;
  niveau: string;
  stream: string | null;
  academic_year: string | null;
  capacite: number;
  created_at: string;
  updated_at: string;
};

export type Matiere = {
  id: number;
  nom: string;
  code: string;
  description: string;
  coefficient: number;
  created_at: string;
  updated_at: string;
};

export type ExamPeriod = {
  id: number;
  code: string;
  label: string;
  period_type: string;
  start_date: string;
  end_date: string;
  weight_note_1: string;
  weight_note_2: string;
  is_locked: boolean;
  created_at: string;
  updated_at: string;
};

export type Etudiant = {
  id: number;
  user: number;
  classe: number | null;
  date_inscription: string;
  statut: string;
  actif: boolean;
  created_at: string;
  updated_at: string;
};

export type Enrollment = {
  id: string;
  student: number;
  classe: number | null;
  academic_year: string;
  receipt_number: string;
  payment_status: string;
  frais_total: string | null;
  frais_verses: string | null;
  devise: string;
  created_at: string;
  updated_at: string;
};

export type Note = {
  id: number;
  etudiant: number;
  matiere: number;
  professeur: number;
  exam_period: number | null;
  score_1: string;
  score_2: string | null;
  note: string;
  coefficient: string;
  date_evaluation: string;
  commentaire: string;
  status: string;
  updated_by: number | null;
  updated_at: string;
};

export type Absence = {
  id: string;
  etudiant: number;
  professeur: number | null;
  date_absence: string;
  heure_debut: string;
  heure_fin: string;
  statut: string;
  motif: string;
  justifiee: boolean;
  recorded_at: string | null;
  sync_source: string;
  client_uuid: string;
  created_at: string;
};

export type StudentOrientation = {
  id: string;
  student: number;
  recommended_stream: string;
  ai_confidence_score: string;
  ai_explanation: string;
  ai_model_version: string;
  final_stream: string | null;
  status: string;
  decided_by: number | null;
  created_at: string;
  updated_at: string;
};

export type AuditLog = {
  id: string;
  actor: number | null;
  entity_type: string;
  entity_id: string;
  action: string;
  old_value: Record<string, unknown> | null;
  new_value: Record<string, unknown> | null;
  reason: string;
  created_at: string;
};

export type Notification = {
  id: string;
  recipient: number;
  channel: string;
  notification_type: string;
  title: string;
  message: string;
  payload: Record<string, unknown>;
  status: string;
  sent_at: string | null;
  retry_count: number;
  created_at: string;
};

export type TimetableSlot = {
  id: string;
  classe: number;
  matiere: number;
  professeur: number | null;
  day_of_week: number;
  start_hour: string;
  end_hour: string;
  room: string;
  academic_year: string;
  created_at: string;
  updated_at: string;
};
