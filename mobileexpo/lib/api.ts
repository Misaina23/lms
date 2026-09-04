import AsyncStorage from '@react-native-async-storage/async-storage';

const API_BASE = process.env.EXPO_PUBLIC_API_URL || 'http://10.0.2.2:8000/api';

export type PaginatedResponse<T> = {
  count: number
  next: string | null
  previous: string | null
  results: T[]
}

async function getAuthToken(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem('auth_token');
  } catch {
    return null;
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = await getAuthToken();

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
      throw new Error('Impossible de se connecter au serveur. Vérifiez votre connexion.');
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
};

// Types
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

// Teacher Assignment Types
export type TeacherAssignment = {
  id: number;
  professeur: number;
  classe: number;
  matiere: number;
  academic_year: string;
  is_main_teacher: boolean;
  created_at: string;
  professeur_detail: {
    id: number;
    matricule: string;
    name: string;
  };
  classe_detail: {
    id: number;
    nom: string;
    niveau: string;
  };
  matiere_detail: {
    id: number;
    nom: string;
    code: string;
  };
};

// Room Types
export type Room = {
  id: number;
  nom: string;
  capacite: number;
  batiment: string;
  equipement: string;
  created_at: string;
};

// School Config Types
export type SchoolConfig = {
  id: number;
  academic_year: string;
  school_name: string;
  school_address: string;
  school_phone: string;
  school_email: string;
  devise: string;
  frais_inscription_defaut: string | null;
  ecolage_annuel_defaut: string | null;
  tolerance_retard_minutes: number;
  heure_debut_cours: string | null;
  heure_fin_cours: string | null;
  active: boolean;
  created_at: string;
  updated_at: string;
};

// Matiere Coefficient Types
export type MatiereCoefficient = {
  id: number;
  matiere: number;
  matiere_detail: {
    id: number;
    nom: string;
    code: string;
  };
  niveau: string;
  stream: string | null;
  coefficient: string;
  created_at: string;
  updated_at: string;
};

// Chat Types
export type ChatGroup = {
  id: string;
  name: string;
  group_type: string;
  classe: number | null;
  matiere: number | null;
  is_readonly: boolean;
  members: ChatGroupMember[];
  created_at: string;
  updated_at: string;
};

export type ChatGroupMember = {
  id: number;
  group: string;
  user: number;
  is_admin: boolean;
  joined_at: string;
  user_detail: {
    id: number;
    matricule: string;
    name: string;
  };
};

export type ChatMessage = {
  id: string;
  group: string;
  sender: number | null;
  sender_name: string;
  content: string;
  attachment: string | null;
  mentions: number[];
  is_deleted: boolean;
  deleted_by: number | null;
  created_at: string;
};