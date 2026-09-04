import { useState, useEffect } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  YStack,
  XStack,
  ScrollView,
  Card,
  Button,
  Input,
  H1,
  H2,
  H3,
  Paragraph,
  SizableText,
  Avatar,
  ClipboardCheck,
  Users,
  BookOpen,
  CheckCircle2,
  XCircle,
  Clock,
  Search,
  Filter,
  ChevronRight,
  UserPlus,
  Settings2,
  Bell,
  Menu,
  RefreshControl,
} from '@blinkdotnew/mobile-ui';
import { useTheme } from '@/lib/theme';
import { useAuth } from '@/hooks/useAuth';
import { api } from '@/lib/api';

// Types
interface Teacher {
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
  // Computed stats
  classes_count: number;
  students_count: number;
  subjects_count: number;
}

interface TeacherStats {
  total: number;
  active: number;
  pending: number;
  rejected: number;
}

interface UseTeachersResult {
  teachers: Teacher[];
  stats: TeacherStats;
  loading: boolean;
  error: string | null;
  fetchTeachers: () => Promise<void>;
  approveTeacher: (id: number) => Promise<void>;
  rejectTeacher: (id: number, reason: string) => Promise<void>;
  setStatusFilter: (filter: string) => void;
  setSearchQuery: (query: string) => void;
  statusFilter: string;
  searchQuery: string;
}

// Hook for managing teachers data
function useTeachers(): UseTeachersResult {
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [stats, setStats] = useState<TeacherStats>({
    total: 0,
    active: 0,
    pending: 0,
    rejected: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const fetchTeachers = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        role: 'PROFESSEUR',
        ...(statusFilter !== 'ALL' && { status: statusFilter }),
      });

      const response = await api.get<{
        results: Teacher[];
        count: number;
      }>(`/api/users/?${params.toString()}`);

      const teacherData = response.data.results || [];
      
      // Calculate stats
      const total = teacherData.length;
      const active = teacherData.filter(t => t.status === 'ACTIVE').length;
      const pending = teacherData.filter(t => t.status === 'PENDING_VERIFICATION').length;
      const rejected = teacherData.filter(t => t.status === 'REJECTED').length;

      // Fetch additional stats for each teacher (classes, students, subjects)
      const teachersWithStats = await Promise.all(
        teacherData.map(async (teacher) => {
          try {
            const [classesRes, studentsRes, subjectsRes] = await Promise.all([
              api.get(`/api/teacher-assignments/?professeur=${teacher.id}`).catch(() => ({ results: [] })),
              api.get(`/api/etudiants/?classe__teacher_assignments__professeur=${teacher.id}`).catch(() => ({ results: [] })),
              api.get(`/api/teacher-assignments/?professeur=${teacher.id}`).catch(() => ({ results: [] })),
            ]);

            const classesCount = classesRes.data?.results?.length || 0;
            const studentsCount = studentsRes.data?.results?.length || 0;
            const subjectsCount = new Set(
              (classesRes.data?.results || []).map((a: any) => a.matiere).filter(Boolean)
            ).size;

            return {
              ...teacher,
              classes_count: classesCount,
              students_count: studentsCount,
              subjects_count: subjectsCount,
            };
          } catch {
            return {
              ...teacher,
              classes_count: 0,
              students_count: 0,
              subjects_count: 0,
            };
          }
        })
      );

      setTeachers(teachersWithStats);
      setStats({ total, active, pending, rejected });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors du chargement des enseignants');
    } finally {
      setLoading(false);
    }
  };

  const approveTeacher = async (id: number) => {
    try {
      await api.post(`/api/users/${id}/approve/`);
      setTeachers(prev => prev.map(t => t.id === id ? { ...t, status: 'ACTIVE' } : t));
      setStats(prev => ({
        ...prev,
        active: prev.active + 1,
        pending: Math.max(0, prev.pending - 1),
      }));
    } catch (err) {
      throw new Error(err instanceof Error ? err.message : 'Erreur lors de la validation');
    }
  };

  const rejectTeacher = async (id: number, reason: string) => {
    try {
      await api.post(`/api/users/${id}/reject/`, { reason });
      setTeachers(prev => prev.map(t => t.id === id ? { ...t, status: 'REJECTED' } : t));
      setStats(prev => ({
        ...prev,
        rejected: prev.rejected + 1,
        pending: Math.max(0, prev.pending - 1),
      }));
    } catch (err) {
      throw new Error(err instanceof Error ? err.message : 'Erreur lors du rejet');
    }
  };

  useEffect(() => {
    fetchTeachers();
  }, [statusFilter, searchQuery]);

  return {
    teachers,
    stats,
    loading,
    error,
    fetchTeachers,
    approveTeacher,
    rejectTeacher,
    setStatusFilter,
    setSearchQuery,
    statusFilter,
    searchQuery,
  };
}

// Status badge component
function StatusBadge({ status }: { status: string }) {
  const { colors } = useTheme();
  
  const statusConfig = {
    ACTIVE: { bg: colors.success + '20', text: colors.success, icon: <CheckCircle2 size={12} color={colors.success} /> },
    PENDING_VERIFICATION: { bg: colors.warning + '20', text: colors.warning, icon: <Clock size={12} color={colors.warning} /> },
    REJECTED: { bg: colors.destructive + '20', text: colors.destructive, icon: <XCircle size={12} color={colors.destructive} /> },
    SUSPENDED: { bg: colors.muted + '20', text: colors.muted, icon: <XCircle size={12} color={colors.muted} /> },
  };

  const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.SUSPENDED;

  return (
    <YStack
      paddingHorizontal="$2"
      paddingVertical="$1"
      backgroundColor={config.bg}
      borderRadius="$2"
      alignItems="center"
      justifyContent="center"
    >
      <XStack gap="$1" alignItems="center">
        {config.icon}
        <SizableText color={config.text} size="$2" fontWeight="600">
          {status === 'ACTIVE' ? 'Actif' :
           status === 'PENDING_VERIFICATION' ? 'En attente' :
           status === 'REJECTED' ? 'Rejeté' : 'Suspendu'}
        </SizableText>
      </XStack>
    </YStack>
  );
}

// Teacher Card Component
function TeacherCard({ teacher, onApprove, onReject, onView }: {
  teacher: Teacher;
  onApprove: (id: number) => void;
  onReject: (id: number) => void;
  onView: (id: number) => void;
}) {
  const { colors } = useTheme();

  return (
    <Card
      backgroundColor={colors.card}
      borderColor={colors.border}
      borderWidth={1}
      borderRadius="$4"
      padding="$4"
      gap="$3"
    >
      {/* Header: Avatar + Info + Status */}
      <XStack alignItems="flex-start" gap="$3">
        <Avatar
          size="$6"
          backgroundColor={colors.primary}
          name={`${teacher.first_name} ${teacher.last_name}`}
        />
        <YStack flex={1} minWidth={0} gap="$1">
          <XStack alignItems="center" gap="$2" flexWrap="wrap">
            <SizableText color={colors.foreground} size="$4" fontWeight="700">
              {teacher.first_name} {teacher.last_name}
            </SizableText>
            <StatusBadge status={teacher.status} />
          </XStack>
          <SizableText color={colors.mutedForeground} size="$2">
            {teacher.email}
          </SizableText>
          <SizableText color={colors.mutedForeground} size="$2">
            {teacher.matricule || '—'}
          </SizableText>
        </YStack>
      </XStack>

      {/* Stats */}
      <XStack gap="$4" flexWrap="wrap">
        <YStack alignItems="center" gap="$1" flex={1} minWidth={60}>
          <XStack gap="$1" alignItems="center" justifyContent="center">
            <Users size={16} color={colors.mutedForeground} />
            <SizableText color={colors.foreground} size="$4" fontWeight="700">
              {teacher.classes_count}
            </SizableText>
          </XStack>
          <SizableText color={colors.mutedForeground} size="$2">Classes</SizableText>
        </YStack>
        <YStack alignItems="center" gap="$1" flex={1} minWidth={60}>
          <XStack gap="$1" alignItems="center" justifyContent="center">
            <ClipboardCheck size={16} color={colors.mutedForeground} />
            <SizableText color={colors.foreground} size="$4" fontWeight="700">
              {teacher.students_count}
            </SizableText>
          </XStack>
          <SizableText color={colors.mutedForeground} size="$2">Élèves</SizableText>
        </YStack>
        <YStack alignItems="center" gap="$1" flex={1} minWidth={60}>
          <XStack gap="$1" alignItems="center" justifyContent="center">
            <BookOpen size={16} color={colors.mutedForeground} />
            <SizableText color={colors.foreground} size="$4" fontWeight="700">
              {teacher.subjects_count}
            </SizableText>
          </XStack>
          <SizableText color={colors.mutedForeground} size="$2">Matières</SizableText>
        </YStack>
      </XStack>

      {/* Actions */}
      <XStack gap="$2" flexWrap="wrap" alignItems="center">
        {teacher.status === 'PENDING_VERIFICATION' && (
          <>
            <Button
              flex={1}
              minWidth={100}
              backgroundColor={colors.success}
              color={colors.successForeground}
              borderRadius="$3"
              onPress={() => onApprove(teacher.id)}
              disabled={false}
            >
              <XStack gap="$1" alignItems="center" justifyContent="center">
                <CheckCircle2 size={14} />
                <SizableText size="$3" fontWeight="600">Valider</SizableText>
              </XStack>
            </Button>
            <Button
              flex={1}
              minWidth={100}
              backgroundColor={colors.destructive}
              color={colors.destructiveForeground}
              borderRadius="$3"
              onPress={() => onReject(teacher.id)}
              disabled={false}
            >
              <XStack gap="$1" alignItems="center" justifyContent="center">
                <XCircle size={14} />
                <SizableText size="$3" fontWeight="600">Rejeter</SizableText>
              </XStack>
            </Button>
          </>
        )}
        <Button
          variant="outline"
          flex={1}
          minWidth={100}
          backgroundColor={colors.card}
          borderColor={colors.border}
          borderWidth={1}
          borderRadius="$3"
          onPress={() => onView(teacher.id)}
        >
          <XStack gap="$1" alignItems="center" justifyContent="center">
            <ChevronRight size={14} />
            <SizableText size="$3" fontWeight="600">Voir</SizableText>
          </XStack>
        </Button>
      </XStack>
    </Card>
  );
}

// Stats Card
function StatsCard({ label, value, icon: Icon, color }: {
  label: string;
  value: number;
  icon: React.ReactNode;
  color: string;
}) {
  const { colors } = useTheme();

  return (
    <Card
      backgroundColor={colors.card}
      borderColor={colors.border}
      borderWidth={1}
      borderRadius="$4"
      padding="$4"
      gap="$2"
      flex={1}
      minWidth={120}
    >
      <XStack alignItems="center" justifyContent="space-between">
        <SizableText color={colors.mutedForeground} size="$3">{label}</SizableText>
        <XStack backgroundColor={color + '20'} padding="$2" borderRadius="$3">
          {Icon}
        </XStack>
      </XStack>
      <SizableText color={colors.foreground} size="$6" fontWeight="800">{value}</SizableText>
    </Card>
  );
}

// Main Teachers Dashboard Screen
export default function TeachersScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { user, isAuthenticated } = useAuth();
  const {
    teachers,
    stats,
    loading,
    error,
    fetchTeachers,
    approveTeacher,
    rejectTeacher,
    setStatusFilter,
    setSearchQuery,
    statusFilter,
    searchQuery,
  } = useTeachers();

  const [selectedTeacher, setSelectedTeacher] = useState<Teacher | null>(null);
  const [showRejectModal, setShowRejectModal] = useState<{ teacher: Teacher; reason: string } | null>(null);

  const filteredTeachers = teachers.filter(teacher => {
    if (statusFilter !== 'ALL' && teacher.status !== statusFilter) return false;
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      teacher.first_name.toLowerCase().includes(query) ||
      teacher.last_name.toLowerCase().includes(query) ||
      teacher.email.toLowerCase().includes(query) ||
      teacher.matricule?.toLowerCase().includes(query)
    );
  });

  const handleApprove = async (id: number) => {
    try {
      await approveTeacher(id);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Erreur');
    }
  };

  const handleReject = (teacher: Teacher) => {
    setShowRejectModal({ teacher, reason: '' });
  };

  const handleRejectConfirm = async () => {
    if (!showRejectModal || !showRejectModal.reason.trim()) {
      alert('Veuillez saisir un motif de rejet');
      return;
    }
    try {
      await rejectTeacher(showRejectModal.teacher.id, showRejectModal.reason);
      setShowRejectModal(null);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Erreur');
    }
  };

  const handleView = (teacher: Teacher) => {
    setSelectedTeacher(teacher);
  };

  if (!isAuthenticated) {
    return (
      <YStack flex={1} backgroundColor={colors.background} justifyContent="center" alignItems="center" padding="$6">
        <SizableText color={colors.mutedForeground} size="$4" textAlign="center">
          Veuillez vous connecter pour accéder à l'espace enseignant
        </SizableText>
        <Button marginTop="$4" onPress={() => { /* navigate to login */ }}>
          Se connecter
        </Button>
      </YStack>
    );
  }

  return (
    <ScrollView
      flex={1}
      backgroundColor={colors.background}
      contentContainerStyle={{
        flexGrow: 1,
        paddingTop: insets.top + 16,
        paddingHorizontal: 16,
        paddingBottom: insets.bottom + 24,
      }}
      refreshControl={
        <RefreshControl refreshing={loading} onRefresh={fetchTeachers} />
      }
    >
      <YStack gap="$5" maxWidth={800} alignSelf="center" width="100%">
        {/* Header */}
        <YStack gap="$2">
          <XStack justifyContent="space-between" alignItems="center">
            <YStack gap="$1">
              <H1 color={colors.foreground} fontWeight="800">Espace Enseignant</H1>
              <SizableText color={colors.mutedForeground} size="$3">
                Gestion des enseignants et validations
              </SizableText>
            </YStack>
            <XStack gap="$2">
              <Button
                size="$3"
                backgroundColor={colors.card}
                borderColor={colors.border}
                borderWidth={1}
                borderRadius="$3"
                onPress={() => {}}
              >
                <Bell size={20} color={colors.foreground} />
              </Button>
              <Button
                size="$3"
                backgroundColor={colors.card}
                borderColor={colors.border}
                borderWidth={1}
                borderRadius="$3"
                onPress={() => {}}
              >
                <Settings2 size={20} color={colors.foreground} />
              </Button>
            </XStack>
          </XStack>
        </YStack>

        {/* Stats Overview */}
        <XStack gap="$3" flexWrap="wrap">
          <StatsCard
            label="Total"
            value={stats.total}
            icon={<Users size={24} />}
            color={colors.primary}
          />
          <StatsCard
            label="Actifs"
            value={stats.active}
            icon={<CheckCircle2 size={24} />}
            color={colors.success}
          />
          <StatsCard
            label="En attente"
            value={stats.pending}
            icon={<Clock size={24} />}
            color={colors.warning}
          />
          <StatsCard
            label="Rejetés"
            value={stats.rejected}
            icon={<XCircle size={24} />}
            color={colors.destructive}
          />
        </XStack>

        {/* Search & Filter Bar */}
        <XStack gap="$3" flexDirection="column" gap="$3">
          <XStack gap="$2" flexWrap="wrap">
            <SizableText color={colors.mutedForeground} size="$3" fontWeight="600">Filtres</SizableText>
            {(['ALL', 'ACTIVE', 'PENDING_VERIFICATION', 'REJECTED'] as const).map(filter => (
              <Button
                key={filter}
                variant={statusFilter === filter ? 'default' : 'outline'}
                size="sm"
                onPress={() => setStatusFilter(filter)}
                backgroundColor={statusFilter === filter ? colors.accent : colors.card}
                color={statusFilter === filter ? colors.accentForeground : colors.foreground}
                borderColor={colors.border}
                borderWidth={1}
                borderRadius="$3"
              >
                <SizableText size="$2" fontWeight="600">
                  {filter === 'ALL' ? 'Tous' :
                   filter === 'ACTIVE' ? 'Actifs' :
                   filter === 'PENDING_VERIFICATION' ? 'En attente' : 'Rejetés'}
                </SizableText>
              </Button>
            ))}
          </XStack>

          <XStack gap="$2">
            <XStack flex={1} gap="$2" backgroundColor={colors.card} borderColor={colors.border} borderWidth={1} borderRadius="$3" paddingHorizontal="$3" alignItems="center">
              <Search size={20} color={colors.mutedForeground} />
              <Input
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder="Rechercher un enseignant..."
                color={colors.foreground}
                backgroundColor="transparent"
                borderWidth={0}
                flex={1}
              />
            </XStack>
            <Button
              size="$3"
              backgroundColor={colors.accent}
              color={colors.accentForeground}
              borderRadius="$3"
              onPress={() => {}}
            >
              <UserPlus size={20} />
            </Button>
          </XStack>
        </XStack>

        {/* Teachers List */}
        <YStack gap="$3">
          <XStack justifyContent="space-between" alignItems="center">
            <H2 color={colors.foreground} fontWeight="700">
              Enseignants ({filteredTeachers.length})
            </H2>
            <SizableText color={colors.mutedForeground} size="$2">
              {statusFilter !== 'ALL' ? `Filtré: ${statusFilter}` : ''}
            </SizableText>
          </XStack>

          {loading ? (
            <YStack gap="$3" alignItems="center" justifyContent="center" padding="$6">
              {Array.from({ length: 3 }).map((_, i) => (
                <Card key={i} backgroundColor={colors.card} borderColor={colors.border} borderWidth={1} borderRadius="$4" padding="$4">
                  <XStack gap="$3">
                    <XStack width={60} height={60} backgroundColor={colors.muted} borderRadius="$6" />
                    <YStack flex={1} gap="$2" justifyContent="center">
                      <XStack height={20} width="60%" backgroundColor={colors.muted} borderRadius="$2" />
                      <XStack height={14} width="40%" backgroundColor={colors.muted} borderRadius="$2" />
                      <XStack height={14} width="30%" backgroundColor={colors.muted} borderRadius="$2" />
                    </YStack>
                  </XStack>
                </Card>
              ))}
            </YStack>
          ) : error ? (
            <Card backgroundColor={colors.destructive + '20'} borderColor={colors.destructive} borderWidth={1} borderRadius="$4" padding="$4">
              <XStack gap="$3" alignItems="center">
                <XCircle size={24} color={colors.destructive} />
                <YStack flex={1} gap="$1">
                  <SizableText color={colors.destructive} fontWeight="600">Erreur de chargement</SizableText>
                  <SizableText color={colors.mutedForeground} size="$3">{error}</SizableText>
                </YStack>
                <Button size="sm" onPress={fetchTeachers} backgroundColor={colors.destructive} color={colors.destructiveForeground}>
                  Réessayer
                </Button>
              </XStack>
            </Card>
          ) : filteredTeachers.length === 0 ? (
            <Card backgroundColor={colors.card} borderColor={colors.border} borderWidth={1} borderRadius="$4" padding="$6" alignItems="center" gap="$2">
              <ClipboardCheck size={48} color={colors.mutedForeground} />
              <SizableText color={colors.foreground} fontWeight="600" textAlign="center">
                Aucun enseignant trouvé
              </SizableText>
              <SizableText color={colors.mutedForeground} size="$3" textAlign="center">
                {searchQuery ? 'Essayez de modifier votre recherche' : 'Aucun enseignant ne correspond aux filtres'}
              </SizableText>
            </Card>
          ) : (
            <YStack gap="$3">
              {filteredTeachers.map(teacher => (
                <TeacherCard
                  key={teacher.id}
                  teacher={teacher}
                  onApprove={handleApprove}
                  onReject={handleReject}
                  onView={handleView}
                />
              ))}
            </YStack>
          )}
        </YStack>
      </YStack>
    </ScrollView>
  );
}

// Reject Modal Component
function RejectModal({ isOpen, teacher, onClose, onConfirm, reason, setReason }: {
  isOpen: boolean;
  teacher: Teacher | null;
  onClose: () => void;
  onConfirm: () => void;
  reason: string;
  setReason: (value: string) => void;
}) {
  const { colors } = useTheme();

  if (!isOpen || !teacher) return null;

  return (
    <YStack
      position="absolute"
      top={0}
      left={0}
      right={0}
      bottom={0}
      backgroundColor="rgba(0,0,0,0.5)"
      justifyContent="center"
      alignItems="center"
      padding="$4"
      zIndex={100}
    >
      <Card
        backgroundColor={colors.card}
        borderRadius="$5"
        padding="$5"
        gap="$4"
        maxWidth={400}
        width="100%"
      >
        <YStack gap="$2" alignItems="center">
          <SizableText color={colors.destructive} size="$5" fontWeight="700">⚠️</SizableText>
          <H2 color={colors.foreground} textAlign="center">Confirmer le rejet</H2>
          <SizableText color={colors.mutedForeground} textAlign="center" size="$3">
            Voulez-vous rejeter <strong>{teacher.first_name} {teacher.last_name}</strong> ?
          </SizableText>
        </YStack>

        <YStack gap="$2">
          <SizableText color={colors.foreground} size="$3" fontWeight="600">Motif du rejet (obligatoire)</SizableText>
          <Input
            multiline
            numberOfLines={4}
            value={reason}
            onChangeText={setReason}
            placeholder="Saisissez le motif du rejet..."
            color={colors.foreground}
            borderColor={colors.border}
            borderWidth={1}
            borderRadius="$3"
            padding="$3"
          />
        </YStack>

        <XStack gap="$3">
          <Button
            flex={1}
            variant="outline"
            backgroundColor={colors.card}
            borderColor={colors.border}
            borderWidth={1}
            color={colors.foreground}
            onPress={onClose}
          >
            Annuler
          </Button>
          <Button
            flex={1}
            backgroundColor={colors.destructive}
            color={colors.destructiveForeground}
            onPress={onConfirm}
            disabled={!reason.trim()}
          >
            Confirmer le rejet
          </Button>
        </XStack>
      </Card>
    </YStack>
  );
}

// Export the component
export { TeacherCard, StatusBadge, StatsCard, useTeachers };