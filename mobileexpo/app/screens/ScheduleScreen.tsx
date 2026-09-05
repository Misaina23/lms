import { useState, useEffect } from 'react';
import { ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
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
  CalendarDays,
  ChevronRight,
  Clock3,
  UsersRound,
  BookOpen,
  MapPin,
} from '@blinkdotnew/mobile-ui';
import { useTheme } from '@/lib/theme';
import { useAuth } from '@/hooks/useAuth';
import { api, type TimetableSlot, type TeacherAssignment } from '@/lib/api';
import * as Haptics from 'expo-haptics';

function tapFeedback() {
  if (typeof Haptics !== 'undefined') Haptics.selectionAsync();
}

const DAY_NAMES = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];

function TimeSlot({ slot, isCurrent }: { slot: TimetableSlot; isCurrent: boolean }) {
  const { colors } = useTheme();
  return (
    <Card
      backgroundColor={isCurrent ? colors.accent + '15' : colors.card}
      borderColor={isCurrent ? colors.accent : colors.border}
      borderWidth={isCurrent ? 2 : 1}
      borderRadius="$4"
      padding="$3"
      marginBottom="$2"
    >
      <XStack justifyContent="space-between" alignItems="flex-start" gap="$3">
        <YStack flex={1} gap="$1">
          <XStack gap="$2" alignItems="center" flexWrap="wrap">
            <H3 color={colors.foreground}>{slot.matiere_name || 'Matière'}</H3>
            {slot.classe_name && (
              <YStack backgroundColor={colors.secondary} borderRadius="$2" paddingHorizontal="$2" paddingVertical="$1">
                <SizableText color={colors.foreground} size="$2" fontWeight="700">{slot.classe_name}</SizableText>
              </YStack>
            )}
          </XStack>
          <XStack gap="$3" alignItems="center" flexWrap="wrap">
            <XStack gap="$1" alignItems="center">
              <Clock3 size={14} color={colors.mutedForeground} />
              <SizableText color={colors.mutedForeground} size="$2">{slot.start_hour} - {slot.end_hour}</SizableText>
            </XStack>
            {slot.room && (
              <XStack gap="$1" alignItems="center">
                <MapPin size={14} color={colors.mutedForeground} />
                <SizableText color={colors.mutedForeground} size="$2">{slot.room}</SizableText>
              </XStack>
            )}
          </XStack>
        </YStack>
        {isCurrent && (
          <YStack backgroundColor={colors.accent} borderRadius="$2" paddingHorizontal="$2" paddingVertical="$1">
            <SizableText color={colors.accentForeground} size="$1" fontWeight="700">EN COURS</SizableText>
          </YStack>
        )}
      </XStack>
    </Card>
  );
}

function DayColumn({ dayIndex, slots, currentDay, currentTime }: { dayIndex: number; slots: TimetableSlot[]; currentDay: number; currentTime: string }) {
  const { colors } = useTheme();
  const isToday = dayIndex === currentDay;
  
  const daySlots = slots
    .filter(s => s.day_of_week === dayIndex)
    .sort((a, b) => a.start_hour.localeCompare(b.start_hour));

  const currentSlot = daySlots.find(s => 
    s.start_hour <= currentTime && s.end_hour >= currentTime
  );

  return (
    <YStack flex={1} minWidth={120} gap="$2" paddingHorizontal="$1">
      <YStack
        backgroundColor={isToday ? colors.accent : colors.secondary}
        borderRadius="$3"
        padding="$3"
        alignItems="center"
        gap="$1"
      >
        <SizableText color={isToday ? colors.accentForeground : colors.foreground} size="$3" fontWeight="800">
          {DAY_NAMES[dayIndex]}
        </SizableText>
        <SizableText color={isToday ? colors.accentForeground : colors.mutedForeground} size="$1">
          {daySlots.length} cours
        </SizableText>
      </YStack>
      {daySlots.length === 0 ? (
        <Card backgroundColor={colors.card} borderColor={colors.border} borderWidth={1} borderRadius="$4" padding="$4" flex={1}>
          <SizableText color={colors.mutedForeground} textAlign="center" size="$2">
            Libre
          </SizableText>
        </Card>
      ) : (
        daySlots.map(slot => (
          <TimeSlot 
            key={slot.id} 
            slot={slot} 
            isCurrent={isToday && currentSlot?.id === slot.id}
          />
        ))
      )}
    </YStack>
  );
}

export default function ScheduleScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [weekOffset, setWeekOffset] = useState(0);

  const { data: assignments, isLoading } = useQuery({
    queryKey: ['my-assignments', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const res = await api.get<{ results: TeacherAssignment[] }>(`/api/teacher-assignments/?professeur=${user.id}`).catch(() => ({ results: [] }));
      return res.results || [];
    },
    enabled: !!user,
  });

  const { data: schedule, isLoading: scheduleLoading } = useQuery({
    queryKey: ['my-schedule', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const res = await api.get<{ results: TimetableSlot[] }>(`/api/timetable/?professeur=${user.id}`).catch(() => ({ results: [] }));
      return res.results || [];
    },
    enabled: !!user,
  });

  const now = new Date();
  const currentDay = now.getDay() === 0 ? 6 : now.getDay() - 1;
  const currentTime = now.toTimeString().slice(0, 5);

  const classesWithSchedule = assignments?.map(a => ({
    id: a.classe,
    nom: a.classe_detail?.nom,
    niveau: a.classe_detail?.niveau,
    matiere: a.matiere_detail?.nom,
    matiereCode: a.matiere_detail?.code,
  })) || [];

  return (
    <ScrollView
      flex={1}
      showsVerticalScrollIndicator={false}
    >
      <YStack paddingHorizontal="$4" paddingTop="$6" paddingBottom="$8" gap="$5">
        {/* Header */}
        <XStack justifyContent="space-between" alignItems="center">
          <YStack gap="$1" flex={1}>
            <H1 color={colors.foreground} fontWeight="800">Emploi du temps</H1>
            <SizableText color={colors.mutedForeground} size="$4">Semaine {weekOffset === 0 ? 'actuelle' : weekOffset > 0 ? `+${weekOffset}` : weekOffset}</SizableText>
          </YStack>
          <XStack gap="$2">
            <Button
              circular
              size="$4"
              backgroundColor={colors.secondary}
              icon={<ChevronRight size={20} color={colors.foreground} />}
              onPress={() => { tapFeedback(); setWeekOffset(w => w - 1); }}
              aria-label="Semaine précédente"
            />
            <Button
              circular
              size="$4"
              backgroundColor={colors.secondary}
              icon={<ChevronRight size={20} color={colors.foreground} />}
              onPress={() => { tapFeedback(); setWeekOffset(w => w + 1); }}
              aria-label="Semaine suivante"
            />
          </XStack>
        </XStack>

        {/* Legend */}
        <XStack gap="$3" flexWrap="wrap" marginBottom="$2">
          {classesWithSchedule.slice(0, 6).map((cls, i) => (
            <XStack key={cls.id} gap="$1" alignItems="center">
              <YStack
                width={10}
                height={10}
                borderRadius={5}
                backgroundColor={['#2B6F68', '#16A34A', '#D97706', '#2563EB', '#DC2626', '#7C3AED'][i % 6]}
              />
              <SizableText color={colors.mutedForeground} size="$2">{cls.nom} - {cls.matiereCode}</SizableText>
            </XStack>
          ))}
        </XStack>

        {/* Weekly Schedule */}
        <Card backgroundColor={colors.card} borderColor={colors.border} borderWidth={1} borderRadius="$5" padding="$4">
          {scheduleLoading ? (
            <YStack alignItems="center" justifyContent="center" padding="$6">
              <ActivityIndicator size="large" color={colors.accent} />
              <SizableText color={colors.mutedForeground} marginTop="$3">Chargement de l'emploi du temps…</SizableText>
            </YStack>
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingBottom: 8 }}>
              <XStack gap="$3">
                {DAY_NAMES.map((_, i) => (
                  <DayColumn
                    key={i}
                    dayIndex={i}
                    slots={schedule || []}
                    currentDay={currentDay}
                    currentTime={currentTime}
                  />
                ))}
              </XStack>
            </ScrollView>
          )}
        </Card>

        {/* My Classes List */}
        <YStack gap="$3">
          <H2 color={colors.foreground} fontWeight="700">Mes affectations</H2>
          {classesWithSchedule.map(cls => (
            <Card key={cls.id} backgroundColor={colors.card} borderColor={colors.border} borderWidth={1} borderRadius="$4" padding="$4">
              <XStack justifyContent="space-between" alignItems="center">
                <YStack gap="$1">
                  <H3 color={colors.foreground}>{cls.nom} - {cls.matiere}</H3>
                  <SizableText color={colors.mutedForeground} size="$3">{cls.niveau} · {cls.matiereCode}</SizableText>
                </YStack>
                <ChevronRight size={18} color={colors.mutedForeground} />
              </XStack>
            </Card>
          ))}
          {classesWithSchedule.length === 0 && (
            <Card backgroundColor={colors.card} borderColor={colors.border} borderWidth={1} borderRadius="$4" padding="$6" alignItems="center">
              <CalendarDays size={48} color={colors.mutedForeground} />
              <SizableText color={colors.mutedForeground} marginTop="$3" textAlign="center">
                Aucune affectation pour le moment
              </SizableText>
            </Card>
          )}
        </YStack>
      </YStack>
    </ScrollView>
  );
}