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
  Clock3,
  X,
  Search,
  ChevronRight,
  CalendarDays,
  UsersRound,
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
  LATE: { label: 'Retard', color: 'warning', icon: Clock3, bg: 'warning' },
  ABSENT: { label: 'Absent', color: 'destructive', icon: X, bg: 'destructive' },
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
      <YStack paddingHorizontal="$4" paddingTop={insets.top + 16} paddingBottom="$8" gap="$4">
        {/* Header with back button */}
        <XStack gap="$3" alignItems="center">
          <Button
            circular
            size="$4"
            backgroundColor={colors.card}
            borderWidth={1}
            borderColor={colors.border}
            icon={<ChevronRight size={18} color={colors.foreground} />}
            onPress={() => {}}
            aria-label="Retour"
          />
          <YStack flex={1} gap="$1">
            <H2 color={colors.foreground} fontWeight="800" fontSize={18}>Pointage de Classe</H2>
            <SizableText color={colors.mutedForeground} size="$3">
              {selectedClassId ? assignments?.find(a => a.classe === selectedClassId)?.classe_detail?.nom || 'Classe' : 'Sélectionner une classe'}
              {selectedClassId && assignments?.find(a => a.classe === selectedClassId)?.matiere_detail?.code && ` - ${assignments.find(a => a.classe === selectedClassId)?.matiere_detail?.code}`}
            </SizableText>
          </YStack>
        </XStack>

        {/* Date Pill */}
        <XStack backgroundColor={colors.card} borderWidth={1} borderColor={colors.border} borderRadius="$4" padding="$3" alignItems="center" justifyContent="space-between">
          <Button circular size="$3" backgroundColor={colors.secondary} icon={<ChevronRight size={14} color={colors.mutedForeground} />} onPress={() => {
            const d = new Date(selectedDate);
            d.setDate(d.getDate() - 1);
            setSelectedDate(d.toISOString().slice(0, 10));
          }} />
          <SizableText color={colors.foreground} fontWeight="700" size="$3">
            {new Date(selectedDate).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
          </SizableText>
          <Button circular size="$3" backgroundColor={colors.secondary} icon={<ChevronRight size={14} color={colors.mutedForeground} />} onPress={() => {
            const d = new Date(selectedDate);
            d.setDate(d.getDate() + 1);
            setSelectedDate(d.toISOString().slice(0, 10));
          }} />
        </XStack>

        {/* Segment Control */}
        <XStack backgroundColor={colors.card} borderWidth={1} borderColor={colors.border} borderRadius="$3" padding="$1">
          <Button flex={1} height={36} backgroundColor={colors.primary} color={colors.primaryForeground} borderRadius="$2" fontSize={12} fontWeight="700">
            Liste
          </Button>
          <Button flex={1} height={36} backgroundColor="transparent" color={colors.mutedForeground} borderRadius="$2" fontSize={12} fontWeight="700">
            Résumé
          </Button>
        </XStack>

        {/* Stats */}
        {selectedClassId && (
          <XStack gap="$2">
            <YStack flex={1} backgroundColor={colors.success + '15'} borderRadius="$3" padding="$3" alignItems="center">
              <SizableText color={colors.success} size="$2" fontWeight="700">Présents</SizableText>
              <SizableText color={colors.success} fontSize={18} fontWeight="800">{presentCount}</SizableText>
            </YStack>
            <YStack flex={1} backgroundColor={colors.warning + '15'} borderRadius="$3" padding="$3" alignItems="center">
              <SizableText color={colors.warning} size="$2" fontWeight="700">Retards</SizableText>
              <SizableText color={colors.warning} fontSize={18} fontWeight="800">{lateCount}</SizableText>
            </YStack>
            <YStack flex={1} backgroundColor={colors.destructive + '15'} borderRadius="$3" padding="$3" alignItems="center">
              <SizableText color={colors.destructive} size="$2" fontWeight="700">Absents</SizableText>
              <SizableText color={colors.destructive} fontSize={18} fontWeight="800">{absentCount}</SizableText>
            </YStack>
          </XStack>
        )}

        {/* Search */}
        {selectedClassId && (
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
        )}

        {selectedClassId && (
          <>
            {/* Students List */}
            <YStack gap="$2">
              {studentsLoading ? (
                <YStack alignItems="center" justifyContent="center" padding="$6">
                  <ActivityIndicator size="large" color={colors.accent} />
                  <SizableText color={colors.mutedForeground} marginTop="$3">Chargement des élèves…</SizableText>
                </YStack>
              ) : filteredStudents.length === 0 ? (
                <YStack alignItems="center" justifyContent="center" padding="$6" gap="$2">
                  <UsersRound size={48} color={colors.mutedForeground} />
                  <SizableText color={colors.mutedForeground} textAlign="center" size="$3">
                    Aucun élève dans cette classe
                  </SizableText>
                </YStack>
              ) : (
                filteredStudents.map(student => {
                  const currentStatus = getStudentStatus(student.id);
                  const statusConfig = STATUS_CONFIG[currentStatus as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.ABSENT;
                  const statusColor = colors[statusConfig.color as keyof typeof colors];
                  
                  return (
                    <XStack 
                      key={student.id} 
                      alignItems="center" 
                      justifyContent="space-between" 
                      paddingVertical="$2"
                      borderBottomWidth={1}
                      borderColor={colors.border}
                    >
                      <XStack alignItems="center" gap="$3" flex={1}>
                        <YStack 
                          width={32} 
                          height={32} 
                          borderRadius="$2" 
                          backgroundColor={colors.secondary} 
                          borderWidth={1}
                          borderColor={colors.border}
                          alignItems="center" 
                          justifyContent="center"
                        >
                          <SizableText color={colors.foreground} size="$2" fontWeight="800">
                            {student.user_detail?.first_name?.[0]}{student.user_detail?.last_name?.[0]}
                          </SizableText>
                        </YStack>
                        <SizableText color={colors.foreground} fontWeight="700" size="$3">
                          {student.user_detail?.full_name || `${student.user_detail?.first_name} ${student.user_detail?.last_name}`}
                        </SizableText>
                      </XStack>
                      <Button
                        height={32}
                        paddingHorizontal="$3"
                        backgroundColor={statusColor + '20'}
                        borderRadius="$2"
                        onPress={() => {
                          tapFeedback();
                          const states = ['PRESENT', 'LATE', 'ABSENT'] as const;
                          const currentIndex = states.indexOf(currentStatus as any);
                          const nextStatus = states[(currentIndex + 1) % states.length];
                          handleStatusChange(student.id, nextStatus);
                        }}
                        disabled={syncMutation.isPending}
                      >
                        <SizableText color={statusColor} size="$2" fontWeight="800">{statusConfig.label}</SizableText>
                      </Button>
                    </XStack>
                  );
                })
              )}
            </YStack>

            {/* Sync Button */}
            {Object.keys(localStatuses).length > 0 && (
              <YStack position="sticky" bottom={0} backgroundColor={colors.background} paddingTop="$4">
                <Button
                  height={54}
                  backgroundColor={colors.accent}
                  color={colors.accentForeground}
                  borderRadius="$5"
                  icon={syncMutation.isPending ? <ActivityIndicator size="small" color={colors.accentForeground} /> : <CheckCircle2 size={20} />}
                  onPress={handleSync}
                  disabled={syncMutation.isPending}
                  shadowColor={colors.accent}
                  shadowOffset={{ width: 0, height: 4 }}
                  shadowOpacity={0.3}
                  shadowRadius={12}
                  elevation={8}
                >
                  {syncMutation.isPending ? 'Synchronisation…' : `Enregistrer le pointage`}
                </Button>
              </YStack>
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