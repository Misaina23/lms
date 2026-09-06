import { useState, useMemo } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  YStack,
  XStack,
  ScrollView,
  Card,
  Button,
  H2,
  SizableText,
  ChevronRight,
  CalendarDays,
} from '@blinkdotnew/mobile-ui';
import { useTheme } from '@/lib/theme';
import { api, type TimetableSlot } from '@/lib/api';
import { useQuery } from '@tanstack/react-query';

const DAYS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
const MONTHS = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];

export default function CalendarScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const today = new Date();
  const [currentMonth, setCurrentMonth] = useState(today.getMonth());
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [selectedDate, setSelectedDate] = useState(today.toISOString().slice(0, 10));

  const { data: slots } = useQuery({
    queryKey: ['timetable'],
    queryFn: async () => {
      const res = await api.get<{ results: TimetableSlot[] }>('/timetable/').catch(() => ({ results: [] }));
      return res.results || [];
    },
  });

  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const firstDayOfWeek = new Date(currentYear, currentMonth, 1).getDay() || 7;
  const adjustedFirstDay = firstDayOfWeek === 0 ? 6 : firstDayOfWeek - 1;

  const calendarDays = useMemo(() => {
    const days: (number | null)[] = [];
    for (let i = 0; i < adjustedFirstDay; i++) days.push(null);
    for (let i = 1; i <= daysInMonth; i++) days.push(i);
    return days;
  }, [currentMonth, currentYear, daysInMonth, adjustedFirstDay]);

  const todaySlots = slots?.filter(s => s.day_of_week === (today.getDay() === 0 ? 6 : today.getDay() - 1)) || [];

  return (
    <ScrollView flex={1} backgroundColor={colors.background} showsVerticalScrollIndicator={false}>
      <YStack paddingHorizontal="$4" paddingTop={insets.top + 16} paddingBottom="$8" gap="$4">
        {/* Header */}
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
          <H2 color={colors.foreground} fontWeight="800" fontSize={18}>Calendrier</H2>
        </XStack>

        {/* Month Navigation */}
        <XStack justifyContent="space-between" alignItems="center">
          <Button circular size="$3" backgroundColor={colors.card} borderWidth={1} borderColor={colors.border} icon={<ChevronRight size={14} color={colors.mutedForeground} />} onPress={() => {
            if (currentMonth === 0) { setCurrentMonth(11); setCurrentYear(currentYear - 1); }
            else setCurrentMonth(currentMonth - 1);
          }} />
          <SizableText color={colors.foreground} fontWeight="800" size="$4">{MONTHS[currentMonth]} {currentYear}</SizableText>
          <Button circular size="$3" backgroundColor={colors.card} borderWidth={1} borderColor={colors.border} icon={<ChevronRight size={14} color={colors.mutedForeground} />} onPress={() => {
            if (currentMonth === 11) { setCurrentMonth(0); setCurrentYear(currentYear + 1); }
            else setCurrentMonth(currentMonth + 1);
          }} />
        </XStack>

        {/* Calendar Grid */}
        <Card backgroundColor={colors.card} borderWidth={1} borderColor={colors.border} borderRadius="$5" padding="$4">
          <XStack gap="$2" marginBottom="$3">
            {DAYS.map(day => (
              <YStack key={day} flex={1} alignItems="center">
                <SizableText color={colors.mutedForeground} size="$1" fontWeight="800" textTransform="uppercase">{day}</SizableText>
              </YStack>
            ))}
          </XStack>
          <XStack gap="$2" flexWrap="wrap">
            {calendarDays.map((day, index) => {
              const dateStr = day ? `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}` : '';
              const isSelected = dateStr === selectedDate;
              const isToday = dateStr === today.toISOString().slice(0, 10);
              
              return (
                <YStack key={index} flex={1} maxWidth="14%" alignItems="center" paddingVertical="$2">
                  {day && (
                    <YStack
                      width={32}
                      height={32}
                      borderRadius="$2"
                      backgroundColor={isSelected ? colors.primary : isToday ? colors.secondary : 'transparent'}
                      borderWidth={isToday && !isSelected ? 1 : 0}
                      borderColor={colors.border}
                      alignItems="center"
                      justifyContent="center"
                    >
                      <SizableText color={isSelected ? colors.primaryForeground : isToday ? colors.foreground : colors.mutedForeground} size="$2" fontWeight={isToday ? '800' : '600'}>
                        {day}
                      </SizableText>
                    </YStack>
                  )}
                </YStack>
              );
            })}
          </XStack>
        </Card>

        {/* Today's Agenda */}
        <YStack gap="$3">
          <SizableText color={colors.mutedForeground} size="$2" fontWeight="700">
            Aujourd'hui • {today.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
          </SizableText>
          
          {todaySlots.length === 0 ? (
            <YStack alignItems="center" padding="$6" gap="$2">
              <CalendarDays size={48} color={colors.mutedForeground} />
              <SizableText color={colors.mutedForeground} textAlign="center">Aucun cours prévu aujourd'hui</SizableText>
            </YStack>
          ) : (
            todaySlots.map((slot) => (
              <Card key={slot.id} backgroundColor={colors.card} borderWidth={1} borderColor={colors.border} borderRadius="$4" padding="$4">
                <XStack gap="$3" alignItems="center">
                  <YStack width={8} height={8} borderRadius="$2" backgroundColor={colors.primary} />
                  <YStack flex={1} gap="$1">
                    <SizableText color={colors.foreground} fontWeight="700" size="$3">{slot.matiere_name || 'Matière'}</SizableText>
                    <SizableText color={colors.mutedForeground} size="$2">{slot.room || 'Salle non définie'}</SizableText>
                  </YStack>
                  <SizableText color={colors.mutedForeground} size="$2" fontWeight="700">
                    {slot.start_hour} - {slot.end_hour}
                  </SizableText>
                </XStack>
              </Card>
            ))
          )}
        </YStack>
      </YStack>
    </ScrollView>
  );
}
