import AsyncStorage from '@react-native-async-storage/async-storage';

export const API_BASE = process.env.EXPO_PUBLIC_API_URL || 'https://lms-dfs2.onrender.com/api';

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
  surveillant_type: string | null;
  status: string;
  date_of_birth: string | null;
  address: string;
  base_salary: string | null;
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
  user_detail?: {
    id: number;
    matricule: string;
    first_name: string;
    last_name: string;
    full_name: string;
    email: string;
    phone: string;
  };
  classe: number | null;
  classe_detail?: {
    id: number;
    nom: string;
    niveau: string;
    stream: string | null;
  };
  date_inscription: string;
  statut: string;
  actif: boolean;
  created_at: string;
  updated_at: string;
};

export type Enrollment = {
  id: string;
  student: number;
  student_detail?: Etudiant;
  classe: number | null;
  classe_detail?: {
    id: number;
    nom: string;
    niveau: string;
    stream: string | null;
  };
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
  etudiant_detail?: {
    user_detail: {
      id: number;
      matricule: string;
      first_name: string;
      last_name: string;
      full_name: string;
      email: string;
      phone: string;
    };
    classe_detail: {
      id: number;
      nom: string;
      niveau: string;
      stream: string | null;
    };
  };
  matiere: number;
  matiere_detail?: {
    id: number;
    nom: string;
    code: string;
  };
  professeur: number;
  exam_period: number | null;
  exam_period_detail?: {
    id: number;
    code: string;
    label: string;
    period_type: string;
    start_date: string;
    end_date: string;
    weight_note_1: string;
    weight_note_2: string;
    is_locked: boolean;
  };
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
  classe_name?: string;
  matiere: number;
  matiere_name?: string;
  professeur: number | null;
  professeur_name?: string;
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
  messages?: ChatMessage[];
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
  sender_name?: string;
  content: string;
  attachment: string | null;
  mentions: number[];
  is_deleted: boolean;
  deleted_by: number | null;
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

// Budget Types
export type BudgetCategory = {
  id: number;
  name: string;
  category_type: 'REVENUE' | 'EXPENSE';
  description: string;
  is_system: boolean;
  created_at: string;
  updated_at: string;
};

export type BudgetItem = {
  id: string;
  item_type: 'REVENUE' | 'EXPENSE';
  category: number;
  category_detail: BudgetCategory;
  academic_year: string;
  date: string;
  amount: string;
  devise: string;
  description: string;
  designation: string;
  reference_number: string;
  revenue_source: string | null;
  expense_type: string | null;
  related_enrollment: string | null;
  related_enrollment_detail: { id: string; student: string | null; receipt_number: string } | null;
  related_teacher_assignment: string | null;
  related_teacher_assignment_detail: { id: string; teacher: string; classe: string; matiere: string } | null;
  created_by: number;
  validated_by: number | null;
  is_validated: boolean;
  created_at: string;
  updated_at: string;
};

export type BudgetReport = {
  id: string;
  academic_year: string;
  period_type: 'MONTHLY' | 'QUARTERLY' | 'YEARLY';
  period_start: string;
  period_end: string;
  status: 'GENERATING' | 'READY' | 'FAILED';
  file: string | null;
  data_json: Record<string, unknown> | null;
  generated_by: number;
  created_at: string;
  completed_at: string | null;
};