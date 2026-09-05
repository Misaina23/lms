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
  ChevronRight,
  UsersRound,
  BookOpen,
  ClipboardCheck,
} from '@blinkdotnew/mobile-ui';
import { useTheme } from '@/lib/theme';
import { useAuth } from '@/hooks/useAuth';
import { api, type Note, type TeacherAssignment, type Etudiant, type ExamPeriod } from '@/lib/api';
import * as Haptics from 'expo-haptics';

function tapFeedback() {
  if (typeof Haptics !== 'undefined') Haptics.selectionAsync();
}

interface GradeRow {
  id: number;
  etudiant: number;
  etudiant_name: string;
  classe: string;
  matiere: string;
  matiere_code: string;
  score_1: string;
  score_2: string | null;
  note: string;
  coefficient: string;
  status: string;
  date_evaluation: string;
  period_label?: string;
}

function GradeRowComponent({ 
  grade, 
  onUpdate, 
  isUpdating 
}: { 
  grade: GradeRow;
  onUpdate: (id: number, score1: string, score2?: string) => void;
  isUpdating: boolean;
}) {
  const { colors } = useTheme();
  const [score1, setScore1] = useState(grade.score_1);
  const [score2, setScore2] = useState(grade.score_2 || '');

  const handleSave = () => {
    tapFeedback();
    onUpdate(grade.id, score1, score2);
  };

  const hasChanges = score1 !== grade.score_1 || score2 !== (grade.score_2 || '');

  return (
    <Card
      backgroundColor={colors.card}
      borderColor={colors.border}
      borderWidth={1}
      borderRadius="$4"
      padding="$3"
      marginBottom="$2"
    >
      <XStack justifyContent="space-between" alignItems="flex-start" gap="$3">
        <YStack flex={1} gap="$1">
          <XStack gap="$2" alignItems="center" flexWrap="wrap">
            <SizableText color={colors.foreground} fontWeight="700" size="$3">
              {grade.etudiant_name}
            </SizableText>
            <YStack backgroundColor={colors.secondary} borderRadius="$2" paddingHorizontal="$2" paddingVertical="$1">
              <SizableText color={colors.mutedForeground} size="$1" fontWeight="600">{grade.classe}</SizableText>
            </YStack>
            <YStack backgroundColor={colors.accent + '15'} borderRadius="$2" paddingHorizontal="$2" paddingVertical="$1">
              <SizableText color={colors.accent} size="$1" fontWeight="700">{grade.matiere_code}</SizableText>
            </YStack>
          </XStack>
          <XStack gap="$3" alignItems="center" flexWrap="wrap">
            {grade.period_label && (
              <SizableText color={colors.mutedForeground} size="$2">{grade.period_label}</SizableText>
            )}
            <SizableText color={colors.mutedForeground} size="$2">Coef. {grade.coefficient}</SizableText>
            <SizableText color={colors.mutedForeground} size="$2">{grade.date_evaluation}</SizableText>
          </XStack>
        </YStack>
        
        <YStack gap="$1" alignItems="flex-end">
          <YStack
            backgroundColor={colors.accent + '18'}
            borderRadius="$3"
            paddingHorizontal="$3"
            paddingVertical="$2"
            alignItems="center"
            minWidth={50}
          >
            <SizableText color={colors.accent} size="$2" fontWeight="700">/20</SizableText>
            <SizableText color={colors.foreground} size="$3" fontWeight="800">{grade.note}</SizableText>
          </YStack>
          <XStack gap="$1">
            {grade.status === 'LOCKED' ? (
              <YStack backgroundColor={colors.muted} borderRadius="$2" paddingHorizontal="$2" paddingVertical="$1">
                <SizableText color={colors.mutedForeground} size="$1" fontWeight="700">Verrouillé</SizableText>
              </YStack>
            ) : (
              <Button
                height={32}
                paddingHorizontal="$3"
                backgroundColor={hasChanges ? colors.accent : colors.secondary}
                color={hasChanges ? colors.accentForeground : colors.foreground}
                borderRadius="$3"
                onPress={handleSave}
                disabled={isUpdating || !hasChanges}
              >
                <SizableText size="$2" fontWeight="700">
                  {isUpdating ? '...' : 'OK'}
                </SizableText>
              </Button>
            )}
          </XStack>
        </YStack>
      </XStack>

      {grade.status !== 'LOCKED' && (
        <XStack gap="$2" marginTop="$3" alignItems="center">
          <YStack flex={1}>
            <SizableText color={colors.mutedForeground} size="$2" marginBottom="$1">Note 1</SizableText>
            <Input
              value={score1}
              onChangeText={setScore1}
              placeholder="0"
              keyboardType="decimal-pad"
              textAlign="center"
              color={colors.foreground}
              borderColor={colors.border}
              backgroundColor={colors.muted}
              height={40}
            />
          </YStack>
          <YStack flex={1}>
            <SizableText color={colors.mutedForeground} size="$2" marginBottom="$1">Note 2 (optionnel)</SizableText>
            <Input
              value={score2}
              onChangeText={setScore2}
              placeholder="—"
              keyboardType="decimal-pad"
              textAlign="center"
              color={colors.foreground}
              borderColor={colors.border}
              backgroundColor={colors.muted}
              height={40}
            />
          </YStack>
        </XStack>
      )}
    </Card>
  );
}

export default function GradesScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [selectedAssignment, setSelectedAssignment] = useState<TeacherAssignment | null>(null);
  const [localUpdates, setLocalUpdates] = useState<Record<number, { score_1: string; score_2?: string }>>({});
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch teacher's assignments
  const { data: assignments, isLoading: assignmentsLoading } = useQuery({
    queryKey: ['my-assignments', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const res = await api.get<{ results: TeacherAssignment[] }>(`/api/teacher-assignments/?professeur=${user.id}`).catch(() => ({ results: [] }));
      return res.results || [];
    },
    enabled: !!user,
  });

  // Fetch grades for selected assignment
  const { data: notes, isLoading: notesLoading, refetch } = useQuery({
    queryKey: ['my-grades', user?.id, selectedAssignment?.classe, selectedAssignment?.matiere],
    queryFn: async () => {
      if (!user || !selectedAssignment) return [];
      const res = await api.get<{ results: (Note & { etudiant_detail: any; matiere_detail: any; exam_period_detail: any })[] }>(
        `/api/notes/?professeur=${user.id}&matiere=${selectedAssignment.matiere}&etudiant__classe=${selectedAssignment.classe}`
      ).catch(() => ({ results: [] }));
      return res.results || [];
    },
    enabled: !!user && !!selectedAssignment,
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, score_1, score_2 }: { id: number; score_1: string; score_2?: string }) => {
      return api.patch(`/api/notes/${id}/`, { score_1, score_2 });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-grades'] });
      setLocalUpdates({});
    },
  });

  const handleUpdateGrade = (gradeId: number, score1: string, score2?: string) => {
    updateMutation.mutate({ id: gradeId, score_1: score1, score_2: score2 });
  };

  // Build grade rows with student details
  const gradeRows: GradeRow[] = (notes || []).map(note => {
    const existing = localUpdates[note.id];
    const displayScore1 = existing?.score_1 ?? note.score_1;
    const displayScore2 = existing?.score_2 ?? note.score_2;
    
    let computedNote = parseFloat(note.note) || 0;
    if (existing) {
      const s1 = parseFloat(existing.score_1) || 0;
      const s2 = existing.score_2 ? parseFloat(existing.score_2) : null;
      if (note.exam_period_detail?.weight_note_1 && note.exam_period_detail?.weight_note_2) {
        computedNote = s2 ? s1 * parseFloat(note.exam_period_detail.weight_note_1) + s2 * parseFloat(note.exam_period_detail.weight_note_2) : s1;
      } else {
        computedNote = s2 ? (s1 + s2) / 2 : s1;
      }
      computedNote = Math.round(computedNote * 100) / 100;
    }

    return {
      id: note.id,
      etudiant: note.etudiant,
      etudiant_name: note.etudiant_detail?.user_detail?.full_name || `Élève ${note.etudiant}`,
      classe: note.etudiant_detail?.classe_detail?.nom || '—',
      matiere: note.matiere_detail?.nom || 'Matière',
      matiere_code: note.matiere_detail?.code || '—',
      score_1: displayScore1,
      score_2: displayScore2 || '',
      note: computedNote.toFixed(2),
      coefficient: note.coefficient,
      status: note.status,
      date_evaluation: note.date_evaluation,
      period_label: note.exam_period_detail?.label,
    };
  });

  const filteredGrades = gradeRows.filter(grade => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      grade.etudiant_name.toLowerCase().includes(query) ||
      grade.classe.toLowerCase().includes(query) ||
      grade.matiere_code.toLowerCase().includes(query)
    );
  });

  const selectedAssignmentDetails = selectedAssignment ? {
    classe: assignments?.find(a => a.classe === selectedAssignment.classe)?.classe_detail,
    matiere: assignments?.find(a => a.matiere === selectedAssignment.matiere)?.matiere_detail,
  } : null;

  return (
    <ScrollView
      flex={1}
      showsVerticalScrollIndicator={false}
    >
      <YStack paddingHorizontal="$4" paddingTop="$6" paddingBottom="$8" gap="$5">
        {/* Header */}
        <XStack justifyContent="space-between" alignItems="center">
          <YStack gap="$1" flex={1}>
            <H1 color={colors.foreground} fontWeight="800">Notes</H1>
            <SizableText color={colors.mutedForeground} size="$4">
              {selectedAssignment ? `${selectedAssignmentDetails?.classe?.nom} - ${selectedAssignmentDetails?.matiere?.code}` : 'Sélectionnez une classe/matière'}
            </SizableText>
          </YStack>
        </XStack>

        {/* Class/Subject Selector */}
        <YStack gap="$2">
          <XStack justifyContent="space-between" alignItems="center">
            <H3 color={colors.foreground} fontWeight="700">Mes affectations</H3>
            <SizableText color={colors.mutedForeground} size="$2">
              {assignments?.length || 0} affectation(s)
            </SizableText>
          </XStack>
          {assignmentsLoading ? (
            <SizableText color={colors.mutedForeground}>Chargement des affectations…</SizableText>
          ) : assignments && assignments.length > 0 ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
              <XStack gap="$2">
                {assignments.map(assignment => (
                  <Button
                    key={assignment.id}
                    height={48}
                    backgroundColor={selectedAssignment?.id === assignment.id ? colors.accent : colors.card}
                    color={selectedAssignment?.id === assignment.id ? colors.accentForeground : colors.foreground}
                    borderColor={colors.border}
                    borderWidth={1}
                    borderRadius="$4"
                    paddingHorizontal="$4"
                    onPress={() => { tapFeedback(); setSelectedAssignment(assignment); }}
                  >
                    <YStack gap="$1">
                      <SizableText size="$3" fontWeight="700">{assignment.classe_detail?.nom}</SizableText>
                      <SizableText 
                        size="$2" 
                        color={selectedAssignment?.id === assignment.id ? colors.accentForeground : colors.mutedForeground}
                      >
                        {assignment.matiere_detail?.code} {assignment.is_main_teacher ? '(PP)' : ''}
                      </SizableText>
                    </YStack>
                  </Button>
                ))}
              </XStack>
            </ScrollView>
          ) : (
            <Card backgroundColor={colors.card} borderColor={colors.border} borderWidth={1} borderRadius="$4" padding="$4" alignItems="center">
              <ClipboardCheck size={32} color={colors.mutedForeground} />
              <SizableText color={colors.mutedForeground} marginTop="$2" textAlign="center">
                Aucune affectation
              </SizableText>
            </Card>
          )}
        </YStack>

        {selectedAssignment && (
          <>
            {/* Stats */}
            <XStack gap="$2" flexWrap="wrap">
              <Card flex={1} minWidth={80} backgroundColor={colors.accent + '18'} borderRadius="$4" padding="$3" alignItems="center">
                <SizableText color={colors.accent} size="$2">Notes</SizableText>
                <H2 color={colors.accent}>{gradeRows.length}</H2>
              </Card>
              <Card flex={1} minWidth={80} backgroundColor={colors.success + '18'} borderRadius="$4" padding="$3" alignItems="center">
                <SizableText color={colors.success} size="$2">Moyenne</SizableText>
                <H2 color={colors.success}>
                  {gradeRows.length > 0 
                    ? (gradeRows.reduce((sum, g) => sum + parseFloat(g.note || '0'), 0) / gradeRows.length).toFixed(1)
                    : '—'
                  }/20
                </H2>
              </Card>
              <Card flex={1} minWidth={80} backgroundColor={colors.warning + '18'} borderRadius="$4" padding="$3" alignItems="center">
                <SizableText color={colors.warning} size="$2">Brouillon</SizableText>
                <H2 color={colors.warning}>{gradeRows.filter(g => g.status === 'DRAFT').length}</H2>
              </Card>
            </XStack>

            {/* Search */}
            {gradeRows.length > 0 && (
              <XStack gap="$2">
                <XStack flex={1} gap="$2" backgroundColor={colors.card} borderColor={colors.border} borderWidth={1} borderRadius="$3" paddingHorizontal="$3" alignItems="center">
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

            {/* Grades List */}
            <Card backgroundColor={colors.card} borderColor={colors.border} borderWidth={1} borderRadius="$5" padding="$3" gap="$2">
              {notesLoading ? (
                <YStack alignItems="center" justifyContent="center" padding="$6">
                  <ActivityIndicator size="large" color={colors.accent} />
                  <SizableText color={colors.mutedForeground} marginTop="$3">Chargement des notes…</SizableText>
                </YStack>
              ) : filteredGrades.length === 0 ? (
                <YStack alignItems="center" justifyContent="center" padding="$6" gap="$2">
                  <ClipboardCheck size={48} color={colors.mutedForeground} />
                  <SizableText color={colors.mutedForeground} textAlign="center" size="$3">
                    {searchQuery ? 'Aucun résultat' : 'Aucune note pour cette classe/matière'}
                  </SizableText>
                </YStack>
              ) : (
                filteredGrades.map(grade => (
                  <GradeRowComponent
                    key={grade.id}
                    grade={grade}
                    onUpdate={handleUpdateGrade}
                    isUpdating={updateMutation.isPending}
                  />
                ))
              )}
            </Card>
          </>
        )}
      </YStack>
    </ScrollView>
  );
}