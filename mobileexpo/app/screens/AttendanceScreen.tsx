import { useState, useEffect } from 'react';
import { ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  YStack,
  XStack,
  ScrollView,
  Card,
  Button,
  H1,
  H2,
  H3,
  Paragraph,
  SizableText,
  Input,
  CheckCircle2,
  Clock,
  XCircle,
  Search,
  Filter,
  ChevronRight,
  Calendar,
  Users,
} from '@blinkdotnew/mobile-ui';
import { useTheme } from '@/lib/theme';
import { useAuth } from '@/hooks/useAuth';
import { api, type Absence, type Etudiant, type TeacherAssignment } from '@/lib/api';
import * as Haptics from 'expo-haptics';

function tapFeedback() {
  if (typeof Haptics !== 'undefined') Haptics.selectionAsync();
}

const STATUS_CONFIG = {
  PRESENT: { label: 'Présent', color: 'success', icon: CheckCircle2, bg: 'success' },
  LATE: { label: 'Retard', color: 'warning', icon: Clock, bg: 'warning' },
  ABSENT: { label: 'Absent', color: 'destructive', icon: XCircle, bg: 'destructive' },
};

function StatusPill({ status, size = 'md' }: { status: string; size?: 'sm' | 'md' }) {
  const { colors } = useTheme();
  const config = STATUS_CONFIG[status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.ABSENT;
  const color = colors[config.color as keyof typeof colors];
  const paddingH = size === 'sm' ? '$2' : '$3';
  const paddingV = size === 'sm' ? '$1' : '$2';
  const fontSize = size === 'sm' ? '$1' : '$2';

  return (
    <YStack backgroundColor={color + '20'} borderRadius="$10" paddingHorizontal={paddingH} paddingVertical={paddingV}>
      <XStack gap="$1" alignItems="center">
        <config.icon size={size === 'sm' ? 10 : 12} color={color} />
        <SizableText color={color} size={fontSize} fontWeight="700">{config.label}</SizableText>
      </XStack>
    </YStack>
  );
}

function StudentAttendanceRow({
  student,
  currentStatus,
  onStatusChange,
  isSyncing
}: {
  student: Etudiant & { user_detail: any; classe_detail: any };
  currentStatus: string;
  onStatusChange: (status: string) => void;
  isSyncing: boolean;
}) {
  const { colors } = useTheme();
  const config = STATUS_CONFIG[currentStatus as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.ABSENT;
  const color = colors[config.color as keyof typeof colors];

  return (
    <Card
      backgroundColor={colors.card}
      borderColor={colors.border}
      borderWidth={1}
      borderRadius="$4"
      padding="$3"
      marginBottom="$2"
    >
      <XStack justifyContent="space-between" alignItems="center" gap="$3">
        <YStack flex={1} gap="$1">
          <XStack gap="$2" alignItems="center" flexWrap="wrap">
            <SizableText color={colors.foreground} fontWeight="700" size="$3">
              {student.user_detail?.full_name || `${student.user_detail?.first_name} ${student.user_detail?.last_name}`}
            </SizableText>
            {student.classe_detail && (
              <YStack backgroundColor={colors.secondary} borderRadius="$2" paddingHorizontal="$2" paddingVertical="$1">
                <SizableText color={colors.foreground} size="$1" fontWeight="700">{student.classe_detail.nom}</SizableText>
              </YStack>
            )}
          </XStack>
          <SizableText color={colors.mutedForeground} size="$2">
            {student.user_detail?.matricule || student.user_detail?.email}
          </SizableText>
        </YStack>

        <XStack gap="$2" alignItems="center">
          <StatusPill status={currentStatus} size="md" />
          <XStack gap="$1">
            {(['PRESENT', 'LATE', 'ABSENT'] as const).map((status) => {
              const Icon = STATUS_CONFIG[status].icon;
              return (
                <Button
                  key={status}
                  height={36}
                  width={36}
                  circular
                  backgroundColor={currentStatus === status ? color + '20' : colors.secondary}
                  color={currentStatus === status ? color : colors.foreground}
                  borderColor={currentStatus === status ? color : colors.border}
                  borderWidth={1}
                  borderRadius="$3"
                  onPress={() => { tapFeedback(); onStatusChange(status); }}
                  disabled={isSyncing}
                >
                  <Icon size={16} color={currentStatus === status ? color : colors.foreground} />
                </Button>
              );
            })}
          </XStack>
        </XStack>
      </XStack>
    </Card>
  );
}

function ClassSelector({
  classes,
  selectedClassId,
  onSelect
}: {
  classes: (TeacherAssignment & { classe_detail: any })[];
  selectedClassId: number | null;
  onSelect: (id: number) => void;
}) {
  const { colors } = useTheme();

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
      {classes.map(cls => (
        <Button
          key={cls.classe}
          height={44}
          backgroundColor={selectedClassId === cls.classe ? colors.accent : colors.card}
          color={selectedClassId === cls.classe ? colors.accentForeground : colors.foreground}
          borderColor={colors.border}
          borderWidth={1}
          borderRadius="$10"
          paddingHorizontal="$4"
          onPress={() => { tapFeedback(); onSelect(cls.classe); }}
        >
          <XStack gap="$1" alignItems="center">
            <SizableText size="$3" fontWeight="600">{cls.classe_detail?.nom}</SizableText>
            <SizableText color={colors.mutedForeground} size="$2">{cls.matiere_detail?.code}</SizableText>
          </XStack>
        </Button>
      ))}
    </ScrollView>
  );
}

export default function AttendanceScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().slice(0, 10));
  const [selectedClassId, setSelectedClassId] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [localStatuses, setLocalStatuses] = useState<Record<string, string>>({});

  // Fetch teacher's classes
  const { data: assignments, isLoading: assignmentsLoading } = useQuery({
    queryKey: ['my-assignments', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const res = await api.get<{ results: TeacherAssignment[] }>(`/api/teacher-assignments/?professeur=${user.id}`).catch(() => ({ results: [] }));
      return res.results || [];
    },
    enabled: !!user,
  });

  // Fetch students for selected class
  const { data: students, isLoading: studentsLoading } = useQuery({
    queryKey: ['class-students', selectedClassId, selectedDate],
    queryFn: async () => {
      if (!selectedClassId) return [];
      const res = await api.get<{ results: (Etudiant & { user_detail: any; classe_detail: any })[] }>(
        `/api/etudiants/?classe=${selectedClassId}&actif=true`
      ).catch(() => ({ results: [] }));
      return res.results || [];
    },
    enabled: !!selectedClassId,
  });

  // Fetch existing attendance for date + class
  const { data: existingAbsences, isLoading: absencesLoading } = useQuery({
    queryKey: ['attendance-records', selectedClassId, selectedDate],
    queryFn: async () => {
      if (!selectedClassId) return [];
      const res = await api.get<{ results: Absence[] }>(
        `/api/absences/?classe=${selectedClassId}&date_absence=${selectedDate}`
      ).catch(() => ({ results: [] }));
      return res.results || [];
    },
    enabled: !!selectedClassId && !!selectedDate,
  });

  // Sync mutation
  const syncMutation = useMutation({
    mutationFn: async (records: Partial<Absence>[]) => {
      const res = await api.post('/api/absences/sync/', { records });
      return res;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attendance-records'] });
    },
  });

  // Get current status for a student
  const getStudentStatus = (studentId: number) => {
    if (localStatuses[studentId]) return localStatuses[studentId];
    const existing = existingAbsences?.find(a => a.etudiant === studentId);
    return existing?.statut || 'PRESENT';
  };

  const handleStatusChange = (studentId: number, status: string) => {
    tapFeedback();
    setLocalStatuses(prev => ({ ...prev, [studentId]: status }));
  };

  const handleSync = async () => {
    if (!selectedClassId || !user) return;

    const records = Object.entries(localStatuses).map(([studentId, statut]) => ({
      etudiant: parseInt(studentId),
      professeur: user.id,
      date_absence: selectedDate,
      heure_debut: '08:00',
      heure_fin: '09:00',
      statut,
      motif: '',
      justifiee: false,
      sync_source: 'OFFLINE_SYNCED',
    }));

    try {
      await syncMutation.mutateAsync(records);
      setLocalStatuses({});
      alert('Pointage synchronisé avec succès !');
    } catch (err) {
      alert('Erreur lors de la synchronisation');
    }
  };

  const filteredStudents = students?.filter(s => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    const name = `${s.user_detail?.first_name} ${s.user_detail?.last_name}`.toLowerCase();
    const matricule = s.user_detail?.matricule?.toLowerCase() || '';
    return name.includes(query) || matricule.includes(query);
  }) || [];

  const presentCount = filteredStudents.filter(s => getStudentStatus(s.id) === 'PRESENT').length;
  const lateCount = filteredStudents.filter(s => getStudentStatus(s.id) === 'LATE').length;
  const absentCount = filteredStudents.filter(s => getStudentStatus(s.id) === 'ABSENT').length;

  return (
    <ScrollView
      flex={1}
      showsVerticalScrollIndicator={false}
    >
      <YStack paddingHorizontal="$4" paddingTop="$6" paddingBottom="$8" gap="$5">
        {/* Header */}
        <XStack justifyContent="space-between" alignItems="center">
          <YStack gap="$1" flex={1}>
            <H1 color={colors.foreground} fontWeight="800">Pointage</H1>
            <SizableText color={colors.mutedForeground} size="$4">
              {new Date(selectedDate).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
            </SizableText>
          </YStack>
          <XStack gap="$2">
            <Button
              circular
              size="$5"
              backgroundColor={colors.secondary}
              icon={<Calendar size={20} color={colors.accent} />}
              onPress={() => { }}
              aria-label="Changer la date"
            />
          </XStack>
        </XStack>

        {/* Class Selector */}
        <YStack gap="$2">
          <XStack justifyContent="space-between" alignItems="center">
            <H3 color={colors.foreground} fontWeight="700">Sélectionner une classe</H3>
            {assignments && assignments.length > 1 && (
              <SizableText color={colors.mutedForeground} size="$2">{assignments.length} classes affectées</SizableText>
            )}
          </XStack>
          {assignmentsLoading ? (
            <SizableText color={colors.mutedForeground}>Chargement des classes…</SizableText>
          ) : assignments && assignments.length > 0 ? (
            <ClassSelector
              classes={assignments}
              selectedClassId={selectedClassId}
              onSelect={setSelectedClassId}
            />
          ) : (
            <Card backgroundColor={colors.card} borderColor={colors.border} borderWidth={1} borderRadius="$4" padding="$4" alignItems="center">
              <Users size={32} color={colors.mutedForeground} />
              <SizableText color={colors.mutedForeground} marginTop="$2" textAlign="center">
                Aucune classe affectée
              </SizableText>
            </Card>
          )}
        </YStack>

        {selectedClassId && (
          <>
            {/* Stats Summary */}
            <XStack gap="$2" flexWrap="wrap">
              <Card flex={1} minWidth={80} backgroundColor={colors.success + '18'} borderRadius="$4" padding="$3" alignItems="center">
                <SizableText color={colors.success} size="$2">Présents</SizableText>
                <H2 color={colors.success}>{presentCount}</H2>
              </Card>
              <Card flex={1} minWidth={80} backgroundColor={colors.warning + '18'} borderRadius="$4" padding="$3" alignItems="center">
                <SizableText color={colors.warning} size="$2">Retards</SizableText>
                <H2 color={colors.warning}>{lateCount}</H2>
              </Card>
              <Card flex={1} minWidth={80} backgroundColor={colors.destructive + '18'} borderRadius="$4" padding="$3" alignItems="center">
                <SizableText color={colors.destructive} size="$2">Absents</SizableText>
                <H2 color={colors.destructive}>{absentCount}</H2>
              </Card>
            </XStack>

            {/* Search */}
            <XStack gap="$2">
              <XStack flex={1} gap="$2" backgroundColor={colors.card} borderColor={colors.border} borderWidth={1} borderRadius="$3" paddingHorizontal="$3" alignItems="center">
                <Search size={20} color={colors.mutedForeground} />
                <Input
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  placeholder="Rechercher un élève..."
                  color={colors.foreground}
                  backgroundColor="transparent"
                  borderWidth={0}
                  flex={1}
                />
              </XStack>
            </XStack>

            {/* Students List */}
            <Card backgroundColor={colors.card} borderColor={colors.border} borderWidth={1} borderRadius="$5" padding="$3" gap="$2">
              {studentsLoading ? (
                <YStack alignItems="center" justifyContent="center" padding="$6">
                  <ActivityIndicator size="large" color={colors.accent} />
                  <SizableText color={colors.mutedForeground} marginTop="$3">Chargement des élèves…</SizableText>
                </YStack>
              ) : filteredStudents.length === 0 ? (
                <YStack alignItems="center" justifyContent="center" padding="$6" gap="$2">
                  <Users size={48} color={colors.mutedForeground} />
                  <SizableText color={colors.mutedForeground} textAlign="center" size="$3">
                    Aucun élève dans cette classe
                  </SizableText>
                </YStack>
              ) : (
                filteredStudents.map(student => (
                  <StudentAttendanceRow
                    key={student.id}
                    student={student}
                    currentStatus={getStudentStatus(student.id)}
                    onStatusChange={(status) => handleStatusChange(student.id, status)}
                    isSyncing={syncMutation.isPending}
                  />
                ))
              )}
            </Card>

            {/* Sync Button */}
            {Object.keys(localStatuses).length > 0 && (
              <Button
                height={54}
                backgroundColor={colors.accent}
                color={colors.accentForeground}
                borderRadius="$5"
                icon={syncMutation.isPending ? <ActivityIndicator size="small" color={colors.accentForeground} /> : <CheckCircle2 size={20} />}
                onPress={handleSync}
                disabled={syncMutation.isPending}
              >
                {syncMutation.isPending ? 'Synchronisation…' : `Synchroniser ${Object.keys(localStatuses).length} modification(s)`}
              </Button>
            )}

            {/* Offline indicator */}
            <Card backgroundColor={colors.secondary} borderRadius="$5" padding="$4">
              <XStack gap="$3" alignItems="center">
                <SizableText color={colors.accent} fontWeight="700">Mode hors-ligne activé</SizableText>
                <SizableText color={colors.mutedForeground} size="$3" flex={1}>
                  Les modifications sont enregistrées localement et seront synchronisées au serveur lors de la prochaine connexion.
                </SizableText>
              </XStack>
            </Card>
          </>
        )}
      </YStack>
    </ScrollView>
  );
}