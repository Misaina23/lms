import { useState } from 'react';
import { Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useQuery } from '@tanstack/react-query';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { blink } from '@/lib/blink';
import { LogOut } from '@blinkdotnew/mobile-ui'
import { useTheme } from '@/lib/theme';

type Tab = 'Accueil' | 'Mes classes' | 'Notes' | 'Pointage' | 'Emploi du temps' | 'Messages' | 'Profil';

type GradeRow = {
  id: string;
  name: string;
  matricule: string;
  grade: string;
  comment: string;
};

const initialGrades: GradeRow[] = [
  { id: '1', name: 'Aïcha Diallo', matricule: 'ELV-2401', grade: '15', comment: '' },
  { id: '2', name: 'Boubacar Ndiaye', matricule: 'ELV-2402', grade: '13.5', comment: '' },
  { id: '3', name: 'Chloé Martin', matricule: 'ELV-2403', grade: '16', comment: '' },
  { id: '4', name: 'David Kouassi', matricule: 'ELV-2404', grade: '12', comment: '' },
  { id: '5', name: 'Fatou Sow', matricule: 'ELV-2405', grade: '14.5', comment: '' },
];

const navItems: { label: Tab; icon: typeof HomeIcon }[] = [
  { label: 'Accueil', icon: HomeIcon },
  { label: 'Mes classes', icon: UsersRound },
  { label: 'Notes', icon: ClipboardCheck },
  { label: 'Pointage', icon: CheckCircle2 },
  { label: 'Emploi du temps', icon: CalendarDays },
  { label: 'Messages', icon: MessageCircle },
  { label: 'Profil', icon: UserRound },
];

function tapFeedback() {
  if (Platform.OS !== 'web') void Haptics.selectionAsync();
}

function SectionTitle({ title, action }: { title: string; action?: string }) {
  const { colors } = useTheme();
  return (
    <XStack justifyContent="space-between" alignItems="center" marginBottom="$3">
      <H3 color={colors.foreground} fontWeight="800">{title}</H3>
      {action ? <SizableText color={colors.accent} fontWeight="700" size="$3">{action}</SizableText> : null}
    </XStack>
  );
}

function StatusPill({ label, tone = 'green' }: { label: string; tone?: 'green' | 'amber' | 'blue' | 'red' }) {
  const { colors } = useTheme();
  const colorMap = {
    green: { bg: colors.success + '20', text: colors.success },
    amber: { bg: colors.warning + '20', text: colors.warning },
    blue: { bg: colors.info + '20', text: colors.info },
    red: { bg: colors.destructive + '20', text: colors.destructive },
  };
  const { bg, text } = colorMap[tone];
  return (
    <YStack backgroundColor={bg} borderRadius="$10" paddingHorizontal="$3" paddingVertical="$2">
      <SizableText color={text} size="$2" fontWeight="700">{label}</SizableText>
    </YStack>
  );
}

function StatCard({ label, value, detail, trend, icon: Icon, accentColor }: {
  label: string;
  value: string;
  detail: string;
  trend: string;
  icon: typeof GraduationCap;
  accentColor: string;
}) {
  const { colors } = useTheme();
  return (
    <Card
      backgroundColor={colors.card}
      borderColor={colors.border}
      borderWidth={1}
      borderRadius="$5"
      padding="$4"
      flex={1}
    >
      <XStack justifyContent="space-between" alignItems="flex-start" marginBottom="$3">
        <YStack
          width={40}
          height={40}
          borderRadius="$4"
          backgroundColor={accentColor + '18'}
          alignItems="center"
          justifyContent="center"
        >
          <Icon size={20} color={accentColor} />
        </YStack>
        <XStack alignItems="center" gap="$1">
          <ArrowUpRight size={14} color={colors.success} />
          <SizableText color={colors.success} size="$2" fontWeight="700">{trend}</SizableText>
        </XStack>
      </XStack>
      <SizableText color={colors.mutedForeground} size="$2" fontWeight="600" textTransform="uppercase" letterSpacing={0.5}>
        {label}
      </SizableText>
      <H2 color={colors.foreground} marginTop="$1" marginBottom="$1">{value}</H2>
      <SizableText color={colors.mutedForeground} size="$2">{detail}</SizableText>
    </Card>
  );
}

function ViewDot({ color }: { color: string }) {
  return <YStack width={10} height={10} borderRadius={5} backgroundColor={color} />;
}

function Dashboard({ onNavigate }: { onNavigate: (tab: Tab) => void }) {
  const { colors } = useTheme();
  const [mobileNav, setMobileNav] = useState(false);
  const [query, setQuery] = useState('');

  const bars = [
    { label: 'Lun', value: 82 },
    { label: 'Mar', value: 91 },
    { label: 'Mer', value: 76 },
    { label: 'Jeu', value: 88 },
    { label: 'Ven', value: 94 },
    { label: 'Sam', value: 68 },
  ];

  const students = [
    { name: 'Aïcha Diop', id: 'LYC-2025-0842', className: 'Tle C', status: 'Inscription complète', amount: '175 000 FCFA', tone: 'success' },
    { name: 'Moussa Traoré', id: 'LYC-2025-0917', className: '1ère D', status: 'Paiement partiel', amount: '100 000 FCFA', tone: 'warning' },
    { name: 'Fatou Ndiaye', id: 'LYC-2025-1034', className: '2nde A', status: 'À valider', amount: '—', tone: 'neutral' },
    { name: 'Yannick Koffi', id: 'LYC-2025-1088', className: 'Tle A', status: 'Inscription complète', amount: '175 000 FCFA', tone: 'success' },
  ];

  const filteredStudents = students.filter((student) =>
    student.name.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <ScrollView flex={1} showsVerticalScrollIndicator={false}>
      <YStack paddingHorizontal="$4" paddingTop="$6" paddingBottom="$8" gap="$5">
        {/* Header */}
        <XStack justifyContent="space-between" alignItems="center">
          <YStack gap="$1" flex={1}>
            <SizableText color={colors.mutedForeground} size="$3">Vendredi 23 août 2026</SizableText>
            <H1 color={colors.foreground} fontWeight="800" letterSpacing={-1}>Bonjour, Aminata</H1>
            <SizableText color={colors.mutedForeground} size="$4">Administration centrale</SizableText>
          </YStack>
          <XStack gap="$2">
            <Button circular size="$5" backgroundColor={colors.secondary} icon={<Bell size={20} color={colors.accent} />} onPress={() => onNavigate('Messages')} aria-label="Notifications" />
            <Button circular size="$5" backgroundColor={colors.secondary} icon={<Menu size={20} color={colors.foreground} />} onPress={() => setMobileNav(true)} aria-label="Menu" />
          </XStack>
        </XStack>

        {/* Quick Actions */}
        <XStack gap="$3">
          <Button flex={1} height={56} backgroundColor={colors.accent} color={colors.accentForeground} borderRadius="$5" icon={<ClipboardCheck size={20} />} onPress={() => { tapFeedback(); onNavigate('Notes'); }}>
            Saisir les notes
          </Button>
          <Button flex={1} height={56} backgroundColor={colors.secondary} color={colors.foreground} borderRadius="$5" icon={<CheckCircle2 size={20} />} onPress={() => { tapFeedback(); onNavigate('Pointage'); }}>
            Pointer
          </Button>
        </XStack>

        {/* Stats Grid */}
        <YStack gap="$3">
          <SectionTitle title="Vue d'ensemble" />
          <XStack gap="$3" flexWrap="wrap">
            <StatCard
              label="Élèves actifs"
              value="1 248"
              detail="12 nouveaux ce mois"
              trend="4,8%"
              icon={GraduationCap}
              accentColor={colors.accent}
            />
            <StatCard
              label="Inscriptions"
              value="1 106"
              detail="88,6% effectif"
              trend="7,2%"
              icon={CheckCircle2}
              accentColor={colors.success}
            />
          </XStack>
          <XStack gap="$3" flexWrap="wrap">
            <StatCard
              label="Encaissements"
              value="42,8 M"
              detail="sur 49,5 M FCFA"
              trend="12,4%"
              icon={CircleDollarSign}
              accentColor={colors.warning}
            />
            <StatCard
              label="Présence"
              value="94,2%"
              detail="+2,1% vs semaine"
              trend="2,1%"
              icon={UsersRound}
              accentColor={colors.info}
            />
          </XStack>
        </YStack>

        {/* Attendance Chart */}
        <YStack>
          <SectionTitle title="Assiduité enseignants" action="Cette semaine" />
          <Card backgroundColor={colors.card} borderColor={colors.border} borderWidth={1} borderRadius="$5" padding="$4">
            <XStack justifyContent="space-between" alignItems="flex-end" gap="$2" marginTop="$4">
              {bars.map((bar) => (
                <YStack flex={1} alignItems="center" gap="$2" key={bar.label}>
                  <SizableText color={colors.mutedForeground} size="$1" fontWeight="600">{bar.value}%</SizableText>
                  <YStack flex={1} width="100%" maxWidth={32} justifyContent="flex-end">
                    <YStack
                      width="100%"
                      height={bar.value + '%'}
                      backgroundColor={bar.value >= 90 ? colors.accent : colors.accent + '99'}
                      borderRadius="$2"
                    />
                  </YStack>
                  <SizableText color={colors.mutedForeground} size="$1">{bar.label}</SizableText>
                </YStack>
              ))}
            </XStack>
          </Card>
        </YStack>

        {/* Recent Students */}
        <YStack>
          <XStack justifyContent="space-between" alignItems="center" marginBottom="$3">
            <SectionTitle title="Dernières inscriptions" />
            <Button size="sm" backgroundColor={colors.secondary} color={colors.foreground} borderRadius="$4">Voir tout</Button>
          </XStack>
          <Card backgroundColor={colors.card} borderColor={colors.border} borderWidth={1} borderRadius="$5" padding="$4" gap="$3">
            {filteredStudents.map((student) => (
              <XStack key={student.id} gap="$3" alignItems="center">
                <YStack
                  width={36}
                  height={36}
                  borderRadius="$4"
                  backgroundColor={colors.secondary}
                  alignItems="center"
                  justifyContent="center"
                >
                  <SizableText color={colors.foreground} size="$3" fontWeight="800">
                    {student.name.split(' ').map((n) => n[0]).join('').slice(0, 2)}
                  </SizableText>
                </YStack>
                <YStack flex={1}>
                  <SizableText color={colors.foreground} fontWeight="700" size="$3">{student.name}</SizableText>
                  <SizableText color={colors.mutedForeground} size="$2">{student.id}</SizableText>
                </YStack>
                <StatusPill label={student.status} tone={student.tone as 'green' | 'amber' | 'blue'} />
                <ChevronRight size={16} color={colors.mutedForeground} />
              </XStack>
            ))}
          </Card>
        </YStack>

        {/* Today's Tasks */}
        <YStack>
          <SectionTitle title="À traiter aujourd'hui" />
          <Card backgroundColor={colors.card} borderColor={colors.border} borderWidth={1} borderRadius="$5" padding="$4" gap="$3">
            {[
              { number: '7', label: 'demandes de comptes enseignants', color: colors.accent },
              { number: '14', label: 'paiements à rapprocher', color: colors.warning },
              { number: '3', label: 'classes sans professeur principal', color: colors.destructive },
            ].map((item) => (
              <XStack key={item.label} gap="$3" alignItems="center" padding="$3" backgroundColor={colors.muted} borderRadius="$4">
                <YStack
                  width={36}
                  height={36}
                  borderRadius="$4"
                  backgroundColor={item.color + '20'}
                  alignItems="center"
                  justifyContent="center"
                >
                  <SizableText color={item.color} size="$3" fontWeight="800">{item.number}</SizableText>
                </YStack>
                <YStack flex={1}>
                  <SizableText color={colors.foreground} fontWeight="600" size="$3">{item.label}</SizableText>
                </YStack>
                <ArrowUpRight size={16} color={colors.mutedForeground} />
              </XStack>
            ))}
          </Card>
        </YStack>

        {/* Recent Activity */}
        <YStack>
          <SectionTitle title="Activité récente" />
          <Card backgroundColor={colors.card} borderColor={colors.border} borderWidth={1} borderRadius="$5" padding="$4" gap="$3">
            {[
              { time: 'Il y a 8 min', title: 'Note ajoutée en Mathématiques', subtitle: 'M. Kouassi · Tle C', icon: FileText },
              { time: 'Il y a 24 min', title: 'Reçu de paiement validé', subtitle: 'Caisse · REC-00842', icon: CheckCircle2 },
              { time: 'Il y a 1 h', title: 'Nouvel enseignant enregistré', subtitle: 'Département Sciences', icon: UsersRound },
            ].map((activity) => (
              <XStack key={activity.title} gap="$3" alignItems="flex-start">
                <YStack
                  width={32}
                  height={32}
                  borderRadius="$4"
                  backgroundColor={colors.secondary}
                  alignItems="center"
                  justifyContent="center"
                >
                  <activity.icon size={16} color={colors.accent} />
                </YStack>
                <YStack flex={1} gap="$1">
                  <SizableText color={colors.mutedForeground} size="$2">{activity.time}</SizableText>
                  <SizableText color={colors.foreground} fontWeight="600" size="$3">{activity.title}</SizableText>
                  <SizableText color={colors.mutedForeground} size="$2">{activity.subtitle}</SizableText>
                </YStack>
              </XStack>
            ))}
          </Card>
        </YStack>
      </YStack>
    </ScrollView>
  );
}

function ClassesScreen() {
  const { colors } = useTheme();
  return (
    <ScrollView flex={1} paddingHorizontal="$4" paddingTop="$6" paddingBottom="$8" gap="$4" showsVerticalScrollIndicator={false}>
      <YStack gap="$1">
        <SizableText color={colors.mutedForeground} size="$3">ORGANISATION</SizableText>
        <H1 color={colors.foreground} fontWeight="800">Classes & matières</H1>
      </YStack>
      <Paragraph color={colors.mutedForeground}>Gérez les classes, les effectifs et les matières enseignées.</Paragraph>
      <XStack gap="$2">
        <Button flex={1} backgroundColor={colors.secondary} color={colors.foreground} borderRadius="$4">Toutes les classes</Button>
        <Button flex={1} backgroundColor={colors.secondary} color={colors.foreground} borderRadius="$4">Par niveau</Button>
      </XStack>
      <YStack gap="$3">
        {['Terminale A', 'Terminale B', 'Première C', 'Seconde D'].map((className) => (
          <Card key={className} backgroundColor={colors.card} borderColor={colors.border} borderWidth={1} borderRadius="$5" padding="$4">
            <XStack justifyContent="space-between" alignItems="center">
              <YStack flex={1}>
                <H3 color={colors.foreground}>{className}</H3>
                <SizableText color={colors.mutedForeground} size="$3">42 élèves · 8 matières</SizableText>
              </YStack>
              <ChevronRight size={18} color={colors.mutedForeground} />
            </XStack>
          </Card>
        ))}
      </YStack>
    </ScrollView>
  );
}

function NotesScreen() {
  const { colors } = useTheme();
  const [grades, setGrades] = useState(initialGrades);
  const [saved, setSaved] = useState(false);

  const updateGrade = (id: string, value: string) =>
    setGrades((current) =>
      current.map((row) => (row.id === id ? { ...row, grade: value } : row))
    );

  const sync = () => {
    tapFeedback();
    setSaved(true);
  };

  return (
    <ScrollView flex={1} paddingHorizontal="$4" paddingTop="$6" paddingBottom="$8" gap="$4" showsVerticalScrollIndicator={false}>
      <XStack justifyContent="space-between" alignItems="center">
        <YStack gap="$1">
          <SizableText color={colors.mutedForeground} size="$3">ÉVALUATIONS</SizableText>
          <H1 color={colors.foreground} fontWeight="800">Saisir les notes</H1>
        </YStack>
        <StatusPill label={saved ? 'Synchronisé' : 'En ligne'} tone={saved ? 'green' : 'blue'} />
      </XStack>
      <Paragraph color={colors.mutedForeground}>Les classes affichées sont limitées à vos affectations administratives.</Paragraph>
      <XStack gap="$2">
        <Button flex={1} backgroundColor={colors.secondary} color={colors.foreground} borderRadius="$4">Terminale A</Button>
        <Button flex={1} backgroundColor={colors.card} borderColor={colors.border} borderWidth={1} color={colors.foreground} borderRadius="$4">Mathématiques</Button>
      </XStack>
      <Card backgroundColor={colors.card} borderColor={colors.border} borderWidth={1} borderRadius="$5" padding="$4" gap="$4">
        <XStack justifyContent="space-between" alignItems="center">
          <YStack>
            <SizableText color={colors.mutedForeground} size="$3">Évaluation sélectionnée</SizableText>
            <H3 color={colors.foreground}>Devoir surveillé 2</H3>
          </YStack>
          <StatusPill label="Barème /20" tone="amber" />
        </XStack>
        <YStack height={1} backgroundColor={colors.border} />
        {grades.map((row) => (
          <XStack key={row.id} gap="$3" alignItems="center">
            <YStack flex={1}>
              <SizableText color={colors.foreground} fontWeight="700" size="$3">{row.name}</SizableText>
              <SizableText color={colors.mutedForeground} size="$2">{row.matricule}</SizableText>
            </YStack>
            <Input
              width={76}
              height={48}
              value={row.grade}
              keyboardType="decimal-pad"
              textAlign="center"
              fontWeight="800"
              color={colors.foreground}
              borderColor={colors.border}
              onChangeText={(value) => updateGrade(row.id, value)}
            />
            <SizableText color={colors.mutedForeground} size="$3">/20</SizableText>
          </XStack>
        ))}
      </Card>
      <Card backgroundColor={colors.secondary} borderRadius="$5" padding="$4">
        <XStack gap="$3" alignItems="center">
          <Wifi size={20} color={colors.accent} />
          <YStack flex={1}>
            <SizableText color={colors.accent} fontWeight="700">Prêt à synchroniser</SizableText>
            <SizableText color={colors.mutedForeground} size="$3">Les modifications seront historisées et envoyées au serveur central.</SizableText>
          </YStack>
        </XStack>
      </Card>
      <Button
        height={54}
        backgroundColor={colors.accent}
        color={colors.accentForeground}
        borderRadius="$5"
        icon={saved ? <CheckCircle2 size={20} /> : <Send size={20} />}
        onPress={sync}
      >
        {saved ? 'Notes synchronisées' : 'Vérifier et synchroniser'}
      </Button>
    </ScrollView>
  );
}

interface AttendanceRecord {
  id: string;
  studentName: string;
  studentCode: string;
  className: string;
  attendanceDate: string;
  status: string;
  arrivalTime?: string | null;
  note?: string | null;
  teacherName: string;
}

interface TeacherGroup {
  id: string;
  name: string;
  category: string;
  memberCount: number;
  lastMessage?: string | null;
  lastMessageAt?: string | null;
}

interface TeacherMessage {
  id: string;
  groupId: string;
  senderName: string;
  message: string;
  sentAt: string;
  createdAt?: string;
}

const attendanceTable = blink.db.table<AttendanceRecord>('attendance_records');
const groupsTable = blink.db.table<TeacherGroup>('teacher_groups');
const messagesTable = blink.db.table<TeacherMessage>('teacher_messages');

function AttendanceScreen() {
  const { colors } = useTheme();
  const { data = [], isLoading } = useQuery({
    queryKey: ['attendance-records', 'Terminale A'],
    queryFn: () =>
      attendanceTable.list({
        where: { className: 'Terminale A', attendanceDate: '2026-08-24' },
        orderBy: { studentName: 'asc' },
      }),
  });
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [syncingId, setSyncingId] = useState<string | null>(null);
  const visibleRecords = records.length > 0 ? records : data;

  const setStatus = async (id: string, status: string) => {
    tapFeedback();
    const currentRecord = visibleRecords.find((record) => record.id === id);
    if (!currentRecord) return;
    const arrivalTime = status === 'present' || status === 'late' ? (currentRecord.arrivalTime ?? '08:00') : null;
    setSyncingId(id);
    setRecords((current) =>
      (current.length > 0 ? current : visibleRecords).map((record) =>
        record.id === id ? { ...record, status, arrivalTime } : record
      )
    );
    try {
      await attendanceTable.update(id, { status, arrivalTime });
    } catch (error) {
      setRecords((current) => current.map((record) => (record.id === id ? currentRecord : record)));
    } finally {
      setSyncingId(null);
    }
  };

  const presentCount = visibleRecords.filter((r) => r.status === 'present').length;
  const lateCount = visibleRecords.filter((r) => r.status === 'late').length;
  const absentCount = visibleRecords.filter((r) => r.status === 'absent').length;

  return (
    <ScrollView flex={1} paddingHorizontal="$4" paddingTop="$6" paddingBottom="$8" gap="$4" showsVerticalScrollIndicator={false}>
      <XStack justifyContent="space-between" alignItems="center">
        <YStack gap="$1">
          <SizableText color={colors.mutedForeground} size="$3">TERMINALE A · 08H00</SizableText>
          <H1 color={colors.foreground} fontWeight="800">Présences</H1>
        </YStack>
        <StatusPill label="Aujourd'hui" tone="blue" />
      </XStack>
      <Paragraph color={colors.mutedForeground}>Marquez rapidement les absences et retards. Toute modification est associée à votre cours et synchronisée avec l'administration.</Paragraph>
      <XStack gap="$2">
        <Card flex={1} backgroundColor={colors.success + '18'} borderRadius="$4" padding="$3">
          <SizableText color={colors.success} size="$2">Présents</SizableText>
          <H2 color={colors.success}>{presentCount}</H2>
        </Card>
        <Card flex={1} backgroundColor={colors.warning + '18'} borderRadius="$4" padding="$3">
          <SizableText color={colors.warning} size="$2">Retards</SizableText>
          <H2 color={colors.warning}>{lateCount}</H2>
        </Card>
        <Card flex={1} backgroundColor={colors.destructive + '18'} borderRadius="$4" padding="$3">
          <SizableText color={colors.destructive} size="$2">Absents</SizableText>
          <H2 color={colors.destructive}>{absentCount}</H2>
        </Card>
      </XStack>
      <Card backgroundColor={colors.card} borderColor={colors.border} borderWidth={1} borderRadius="$5" padding="$4" gap="$3">
        {isLoading ? (
          <SizableText color={colors.mutedForeground}>Chargement de la liste…</SizableText>
        ) : (
          visibleRecords.map((record) => (
            <YStack key={record.id} gap="$2">
              <XStack alignItems="center" gap="$3">
                <YStack flex={1}>
                  <SizableText color={colors.foreground} fontWeight="700">{record.studentName}</SizableText>
                  <SizableText color={colors.mutedForeground} size="$2">
                    {record.studentCode}
                    {record.arrivalTime ? ` · Arrivée ${record.arrivalTime}` : ''}
                  </SizableText>
                </YStack>
                <StatusPill
                  label={record.status === 'late' ? 'Retard' : record.status === 'absent' ? 'Absent' : 'Présent'}
                  tone={record.status === 'late' ? 'amber' : record.status === 'absent' ? 'red' : 'green'}
                />
              </XStack>
              <XStack gap="$2">
                <Button
                  flex={1}
                  height={40}
                  backgroundColor={colors.success + '18'}
                  color={colors.success}
                  borderRadius="$3"
                  disabled={syncingId === record.id}
                  onPress={() => void setStatus(record.id, 'present')}
                >
                  Présent
                </Button>
                <Button
                  flex={1}
                  height={40}
                  backgroundColor={colors.warning + '18'}
                  color={colors.warning}
                  borderRadius="$3"
                  disabled={syncingId === record.id}
                  onPress={() => void setStatus(record.id, 'late')}
                >
                  Retard
                </Button>
                <Button
                  flex={1}
                  height={40}
                  backgroundColor={colors.destructive + '18'}
                  color={colors.destructive}
                  borderRadius="$3"
                  disabled={syncingId === record.id}
                  onPress={() => void setStatus(record.id, 'absent')}
                >
                  Absent
                </Button>
              </XStack>
            </YStack>
          ))
        )}
      </Card>
      <Card backgroundColor={colors.secondary} borderRadius="$5" padding="$4">
        <XStack gap="$3" alignItems="center">
          <Wifi size={20} color={colors.accent} />
          <YStack flex={1}>
            <SizableText color={colors.accent} fontWeight="700">Synchronisation prête</SizableText>
            <SizableText color={colors.mutedForeground} size="$3">Les changements locaux seront envoyés au système central dès que votre session enseignant est connectée.</SizableText>
          </YStack>
        </XStack>
      </Card>
    </ScrollView>
  );
}

function GroupsScreen() {
  const { colors } = useTheme();
  const { data: groups = [], isLoading: groupsLoading } = useQuery({
    queryKey: ['teacher-groups'],
    queryFn: () => groupsTable.list({ orderBy: { lastMessageAt: 'desc' } }),
  });
  const [selectedGroupId, setSelectedGroupId] = useState('grp-001');
  const [draft, setDraft] = useState('');
  const [localMessages, setLocalMessages] = useState<TeacherMessage[]>([]);
  const [sending, setSending] = useState(false);

  const selectedGroup = groups.find((group) => group.id === selectedGroupId) ?? groups[0];
  const { data: serverMessages = [] } = useQuery({
    queryKey: ['teacher-messages', selectedGroup?.id],
    queryFn: () =>
      messagesTable.list({
        where: { groupId: selectedGroup?.id },
        orderBy: { createdAt: 'asc' },
      }),
    enabled: Boolean(selectedGroup?.id),
  });
  const messages = [...serverMessages, ...localMessages.filter((message) => message.groupId === selectedGroup?.id)];

  const sendMessage = async () => {
    if (!draft.trim() || !selectedGroup || sending) return;
    tapFeedback();
    const text = draft.trim();
    setSending(true);
    try {
      const created = await messagesTable.create({
        groupId: selectedGroup.id,
        senderName: 'Mariam Traoré',
        message: text,
        sentAt: "à l'instant",
        createdAt: new Date().toISOString(),
      });
      setLocalMessages((current) => [...current, created]);
      setDraft('');
    } catch (error) {
      setLocalMessages((current) => [
        ...current,
        { id: `offline-${Date.now()}`, groupId: selectedGroup.id, senderName: 'Mariam Traoré', message: text, sentAt: 'hors ligne' },
      ]);
      setDraft('');
    } finally {
      setSending(false);
    }
  };

  return (
    <YStack flex={1} paddingHorizontal="$4" paddingTop="$6" paddingBottom="$3" gap="$3">
      <XStack justifyContent="space-between" alignItems="center">
        <YStack gap="$1">
          <SizableText color={colors.mutedForeground} size="$3">COLLABORATION</SizableText>
          <H1 color={colors.foreground} fontWeight="800">Groupes enseignants</H1>
        </YStack>
        <Button circular size="$5" backgroundColor={colors.secondary} icon={<MessageCircle size={20} color={colors.accent} />} onPress={() => {}} aria-label="Nouveau groupe" />
      </XStack>
      <Paragraph color={colors.mutedForeground}>Échangez avec les collègues de vos classes et départements.</Paragraph>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
        <XStack gap="$2">
          {groupsLoading ? (
            <SizableText color={colors.mutedForeground}>Chargement…</SizableText>
          ) : (
            groups.map((group) => (
              <Button
                key={group.id}
                height={44}
                backgroundColor={group.id === selectedGroup?.id ? colors.accent : colors.card}
                color={group.id === selectedGroup?.id ? colors.accentForeground : colors.foreground}
                borderColor={colors.border}
                borderWidth={1}
                borderRadius="$10"
                onPress={() => {
                  tapFeedback();
                  setSelectedGroupId(group.id);
                }}
              >
                {group.name}
              </Button>
            ))
          )}
        </XStack>
      </ScrollView>
      {selectedGroup ? (
        <Card flex={1} backgroundColor={colors.card} borderColor={colors.border} borderWidth={1} borderRadius="$5" padding="$4" gap="$3">
          <XStack alignItems="center" gap="$3">
            <YStack backgroundColor={colors.secondary} borderRadius="$4" padding="$3">
              <UsersRound size={22} color={colors.accent} />
            </YStack>
            <YStack flex={1}>
              <H3 color={colors.foreground}>{selectedGroup.name}</H3>
              <SizableText color={colors.mutedForeground} size="$2">
                {selectedGroup.memberCount} enseignants · {selectedGroup.category}
              </SizableText>
            </YStack>
            <StatusPill label="En ligne" tone="green" />
          </XStack>
          <YStack flex={1} gap="$3" paddingTop="$2">
            {messages.map((message) => (
              <XStack key={message.id} gap="$2" alignItems="flex-start">
                <YStack
                  width={32}
                  height={32}
                  borderRadius={16}
                  backgroundColor={message.senderName === 'Mariam Traoré' ? colors.warning + '30' : colors.info + '20'}
                  alignItems="center"
                  justifyContent="center"
                >
                  <SizableText color={colors.foreground} size="$2" fontWeight="800">
                    {message.senderName.split(' ').map((n) => n[0]).join('').slice(0, 2)}
                  </SizableText>
                </YStack>
                <YStack flex={1} gap="$1">
                  <XStack gap="$2" alignItems="center">
                    <SizableText color={colors.foreground} fontWeight="700" size="$3">{message.senderName}</SizableText>
                    <SizableText color={colors.mutedForeground} size="$1">{message.sentAt}</SizableText>
                  </XStack>
                  <SizableText color={colors.mutedForeground} size="$3">{message.message}</SizableText>
                </YStack>
              </XStack>
            ))}
          </YStack>
          <XStack gap="$2" alignItems="center">
            <Input
              flex={1}
              placeholder="Écrire un message…"
              value={draft}
              onChangeText={setDraft}
              color={colors.foreground}
              borderColor={colors.border}
            />
            <Button
              circular
              size="$4"
              backgroundColor={colors.accent}
              icon={<Send size={16} color={colors.accentForeground} />}
              onPress={sendMessage}
              disabled={!draft.trim()}
            />
          </XStack>
        </Card>
      ) : (
        <Card backgroundColor={colors.card} borderColor={colors.border} borderWidth={1} borderRadius="$5" padding="$5">
          <SizableText color={colors.mutedForeground} textAlign="center">Sélectionnez un groupe pour voir les messages.</SizableText>
        </Card>
      )}
    </YStack>
  );
}

function PlaceholderScreen({ tab }: { tab: Tab }) {
  const { colors } = useTheme();
  const copy: Record<string, [string, string, string]> = {
    'Mes classes': ['Mes classes', 'Vos classes affectées', 'Retrouvez vos élèves et leurs informations scolaires autorisées.'],
    'Pointage': ['Pointage enseignant', 'Présence du jour', 'Enregistrez votre arrivée ou votre départ en un geste.'],
    'Emploi du temps': ['Mon emploi du temps', 'Planning du jour', 'Lundi · 08h00 — 10h00 · Terminale A · Mathématiques · Salle 03'],
    'Messages': ['Messages', 'Communication interne', 'Vos discussions avec les enseignants et les groupes de matières.'],
    'Profil': ['Mon profil', 'Compte enseignant', 'Mariam Traoré · Mathématiques · Compte accepté'],
  };
  const [title, subtitle, body] = copy[tab];
  return (
    <YStack flex={1} paddingHorizontal="$4" paddingTop="$7" gap="$4">
      <SizableText color={colors.mutedForeground} size="$3">ESPACE ENSEIGNANT</SizableText>
      <H1 color={colors.foreground} fontWeight="800">{title}</H1>
      <Card backgroundColor={colors.card} borderColor={colors.border} borderWidth={1} borderRadius="$6" padding="$5" gap="$3">
        <H2 color={colors.foreground}>{subtitle}</H2>
        <Paragraph color={colors.mutedForeground}>{body}</Paragraph>
        <Button marginTop="$3" backgroundColor={colors.accent} color={colors.accentForeground} borderRadius="$4">Ouvrir</Button>
      </Card>
    </YStack>
  );
}

export default function Home() {
  const [activeTab, setActiveTab] = useState<Tab>('Accueil');
  const { colors, toggleTheme, isDark } = useTheme();

  const content =
    activeTab === 'Accueil' ? (
      <Dashboard onNavigate={setActiveTab} />
    ) : activeTab === 'Notes' ? (
      <NotesScreen />
    ) : activeTab === 'Pointage' ? (
      <AttendanceScreen />
    ) : activeTab === 'Messages' ? (
      <GroupsScreen />
    ) : (
      <PlaceholderScreen tab={activeTab} />
    );

  const insets = useSafeAreaInsets();

  return (
    <YStack flex={1} backgroundColor={colors.background} paddingTop={insets.top}>
      {/* Theme Toggle */}
      <XStack position="absolute" top={insets.top + 8} right="$4" zIndex={100} gap="$2">
        <Button
          size="$3"
          backgroundColor={colors.card}
          borderColor={colors.border}
          borderWidth={1}
          onPress={toggleTheme}
          aria-label={isDark ? 'Activer le mode clair' : 'Activer le mode sombre'}
        >
          {isDark ? '☀️' : '🌙'}
        </Button>
          <LogOut size={18} color={colors.foreground} />
      </XStack>

      <YStack flex={1}>
        {content}
      </YStack>

      {/* Bottom Navigation */}
      <XStack
        backgroundColor={colors.card}
        borderTopWidth={1}
        borderColor={colors.border}
        paddingHorizontal="$1"
        paddingTop="$2"
        paddingBottom={insets.bottom + 8}
        justifyContent="space-around"
      >
        {navItems.map(({ label, icon: Icon }) => {
          const active = activeTab === label;
          return (
            <Button
              key={label}
              chromeless
              flex={1}
              minHeight={52}
              paddingHorizontal="$1"
              gap="$1"
              color={active ? colors.accent : colors.mutedForeground}
              icon={<Icon size={19} color={active ? colors.accent : colors.mutedForeground} />}
              onPress={() => {
                tapFeedback();
                setActiveTab(label);
              }}
            >
              {label === 'Emploi du temps' ? 'Planning' : label}
            </Button>
          );
        })}
      </XStack>

      {/* Footer */}
      <XStack justifyContent="center" padding="$3" borderTopWidth={1} borderColor={colors.border} backgroundColor={colors.card} paddingBottom={insets.bottom > 0 ? 4 : 12}>
        <SizableText color={colors.mutedForeground} size="$2">Développé par DevMisaina</SizableText>
      </XStack>
    </YStack>
  );
}
