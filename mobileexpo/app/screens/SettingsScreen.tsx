import { useState } from 'react';
import { ScrollView, Alert, View, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  YStack,
  XStack,
  Card,
  H2,
  H3,
  SizableText,
  Sun,
  Moon,
  LogOut,
  ChevronRight,
  Bell,
  ShieldCheck,
  UserRound,
  Settings2 as SettingsIcon,
} from '@blinkdotnew/mobile-ui';
import { useTheme } from '@/lib/theme';
import { useAuth } from '@/hooks/useAuth';
import { spacing, fontSize, iconSize } from '@/lib/responsive';
import { PrimaryButton } from '@/components/PrimaryButton';

const roleLabels: Record<string, string> = {
  ADMIN: 'Administrateur',
  PROFESSEUR: 'Professeur',
  ELEVE: 'Élève',
  PARENT: 'Parent',
  SURVEILLANT: 'Surveillant',
};

type SettingRowProps = {
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
  onPress?: () => void;
  rightElement?: React.ReactNode;
  destructive?: boolean;
  colors: any;
};

function SettingRow({ icon, title, subtitle, onPress, rightElement, destructive, colors }: SettingRowProps) {
  const content = (
    <XStack
      alignItems="center"
      gap={spacing.md}
      paddingVertical={spacing.md}
      paddingHorizontal={spacing.md}
      borderRadius={12}
    >
      <View
        style={{
          width: 36,
          height: 36,
          borderRadius: 10,
          backgroundColor: destructive ? colors.destructive + '15' : colors.secondary,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {icon}
      </View>
      <YStack flex={1}>
        <SizableText
          color={destructive ? colors.destructive : colors.foreground}
          fontWeight="600"
          size={fontSize.md}
        >
          {title}
        </SizableText>
        {subtitle && (
          <SizableText color={colors.mutedForeground} size={fontSize.xs} numberOfLines={1}>
            {subtitle}
          </SizableText>
        )}
      </YStack>
      {rightElement || (onPress ? <ChevronRight size={18} color={colors.mutedForeground} /> : null)}
    </XStack>
  );

  if (onPress) {
    return <Pressable onPress={onPress}>{content}</Pressable>;
  }
  return content;
}

function Section({ title, children, colors }: { title: string; children: React.ReactNode; colors: any }) {
  return (
    <YStack gap={spacing.sm}>
      <SizableText
        color={colors.mutedForeground}
        size={fontSize.xs}
        fontWeight="700"
        letterSpacing={0.5}
        paddingHorizontal={spacing.xs}
      >
        {title.toUpperCase()}
      </SizableText>
      <Card
        style={{
          padding: spacing.xs,
          borderRadius: 14,
          backgroundColor: colors.card,
          borderWidth: 1,
          borderColor: colors.border,
        }}
      >
        {children}
      </Card>
    </YStack>
  );
}

export default function SettingsScreen() {
  const { colors, toggleTheme, isDark, mode } = useTheme();
  const { user, logout } = useAuth();
  const insets = useSafeAreaInsets();

  const handleLogout = () => {
    Alert.alert(
      'Déconnexion',
      'Êtes-vous sûr de vouloir vous déconnecter ?',
      [
        { text: 'Annuler', style: 'cancel' },
        { text: 'Déconnecter', style: 'destructive', onPress: () => logout() },
      ]
    );
  };

  if (!user) return null;

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{
        paddingHorizontal: spacing.lg,
        paddingTop: spacing.md,
        paddingBottom: insets.bottom + spacing.xxl,
        gap: spacing.xl,
      }}
      showsVerticalScrollIndicator={false}
    >
      <Card
        style={{
          padding: spacing.lg,
          borderRadius: 16,
          backgroundColor: colors.primary,
          alignItems: 'center',
          gap: spacing.md,
        }}
      >
        <View
          style={{
            width: 72,
            height: 72,
            borderRadius: 36,
            backgroundColor: colors.primaryForeground + '20',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <SizableText color={colors.primaryForeground} fontWeight="800" size={28}>
            {user.first_name?.[0]}{user.last_name?.[0]}
          </SizableText>
        </View>
        <YStack alignItems="center" gap={2}>
          <SizableText color={colors.primaryForeground} fontWeight="800" size={fontSize.xl}>
            {user.first_name} {user.last_name}
          </SizableText>
          <SizableText color={colors.primaryForeground + 'CC'} size={fontSize.sm}>
            {roleLabels[user.role] || user.role}
          </SizableText>
          <SizableText color={colors.primaryForeground + '99'} size={fontSize.xs}>
            {user.email}
          </SizableText>
        </YStack>
      </Card>

      <Section title="Profil" colors={colors}>
        <SettingRow
          icon={<UserRound size={18} color={colors.foreground} />}
          title="Informations personnelles"
          subtitle={user.phone || 'Téléphone non renseigné'}
          onPress={() => {}}
          colors={colors}
        />
        <SettingRow
          icon={<ShieldCheck size={18} color={colors.foreground} />}
          title="Sécurité & confidentialité"
          subtitle="Mot de passe, sessions"
          onPress={() => {}}
          colors={colors}
        />
        <SettingRow
          icon={<Bell size={18} color={colors.foreground} />}
          title="Notifications"
          subtitle="Push, email, SMS"
          onPress={() => {}}
          colors={colors}
        />
      </Section>

      <Section title="Apparence" colors={colors}>
        <SettingRow
          icon={isDark ? <Moon size={18} color={colors.foreground} /> : <Sun size={18} color={colors.foreground} />}
          title="Thème"
          subtitle={isDark ? 'Mode sombre' : 'Mode clair'}
          rightElement={
            <XStack
              backgroundColor={colors.secondary}
              borderRadius={10}
              padding={3}
              gap={2}
            >
              {(['light', 'dark'] as const).map((m) => (
                <Pressable
                  key={m}
                  onPress={mode === m ? undefined : toggleTheme}
                  style={{
                    paddingVertical: 6,
                    paddingHorizontal: 14,
                    borderRadius: 8,
                    backgroundColor: mode === m ? colors.primary : 'transparent',
                    alignItems: 'center',
                    justifyContent: 'center',
                    minWidth: 40,
                  }}
                >
                  <SizableText
                    color={mode === m ? colors.primaryForeground : colors.mutedForeground}
                    size={14}
                    fontWeight="700"
                  >
                    {m === 'light' ? '☀️' : '🌙'}
                  </SizableText>
                </Pressable>
              ))}
            </XStack>
          }
          colors={colors}
        />
        <SettingRow
          icon={<SizableText color={colors.foreground} fontSize={18} fontWeight="700">🌐</SizableText>}
          title="Langue"
          subtitle="Français"
          onPress={() => {}}
          colors={colors}
        />
      </Section>

      <Section title="Données" colors={colors}>
        <SettingRow
          icon={<SettingsIcon size={18} color={colors.foreground} />}
          title="Mode hors-ligne"
          subtitle="Stockage local activé"
          onPress={() => {}}
          colors={colors}
        />
      </Section>

      <Section title="Support" colors={colors}>
        <SettingRow
          icon={<SettingsIcon size={18} color={colors.foreground} />}
          title="Aide & FAQ"
          onPress={() => {}}
          colors={colors}
        />
        <SettingRow
          icon={<SizableText color={colors.foreground} fontSize={16} fontWeight="700">v</SizableText>}
          title="Version"
          subtitle="1.0.0"
          colors={colors}
        />
      </Section>

      <PrimaryButton
        label="Se déconnecter"
        onPress={handleLogout}
        variant="destructive"
        size="lg"
        fullWidth
        icon={<LogOut size={18} color={colors.destructiveForeground} />}
      />

      <SizableText color={colors.mutedForeground} size={fontSize.xs} textAlign="center">
        Lycée Horizon · Développé par DevMisaina
      </SizableText>
    </ScrollView>
  );
}
