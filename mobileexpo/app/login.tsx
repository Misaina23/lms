import { router } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  YStack,
  XStack,
  Card,
  H1,
  H3,
  Paragraph,
  SizableText,
  Input,
  Button,
  ScrollView,
} from '@blinkdotnew/mobile-ui';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useMutation } from '@tanstack/react-query';
import { useTheme } from '@/lib/theme';
import { API_BASE } from '@/lib/api';

export default function LoginScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  const login = useMutation({
    mutationFn: async (creds: { email: string; password: string }) => {
      const res = await fetch(`${API_BASE}/login/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(creds),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.detail || 'Identifiants invalides');
      }
      return res.json() as Promise<{ token: string; user: any }>;
    },
    onSuccess: async (data) => {
      await AsyncStorage.setItem('auth_token', data.token);
      await AsyncStorage.setItem('auth_user', JSON.stringify(data.user));
      router.replace('/');
    },
    onError: (e) => {
      if (e instanceof Error) {
        if (e.message.includes('attente de validation')) {
          setError('Votre compte est en attente de validation par l\'administration.');
        } else if (e.message.includes('rejeté')) {
          setError('Votre compte a été rejeté. Contactez l\'administration.');
        } else {
          setError(e.message);
        }
      } else {
        setError('Erreur');
      }
    },
  });

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.background }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
    >
      <ScrollView
        flex={1}
        contentContainerStyle={{ flexGrow: 1, paddingTop: insets.top + 24, paddingHorizontal: 20, paddingBottom: insets.bottom + 24 }}
        keyboardShouldPersistTaps="handled"
      >
        <YStack flex={1} justifyContent="center" gap="$5" maxWidth={520} alignSelf="center" width="100%">
          <YStack gap="$2" alignItems="center">
            <YStack backgroundColor={colors.primary} padding="$4" borderRadius="$6">
              <SizableText color={colors.primaryForeground} size="$8" fontWeight="800">LH</SizableText>
            </YStack>
            <H1 color={colors.foreground} fontWeight="800" textAlign="center">Lycée Horizon</H1>
            <Paragraph color={colors.mutedForeground} textAlign="center">Espace enseignant · Pointage, notes, messagerie</Paragraph>
          </YStack>

          <Card backgroundColor={colors.card} borderColor={colors.border} borderWidth={1} borderRadius="$6" padding="$5" gap="$4">
            <H3 color={colors.primary} fontWeight="700">Connexion</H3>
            <YStack gap="$3">
              <YStack gap="$1">
                <SizableText color={colors.foreground} size="$2" fontWeight="600">Email</SizableText>
                <Input
                  value={email}
                  onChangeText={setEmail}
                  placeholder="vous@lycee.com"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  color={colors.foreground}
                  borderColor={colors.border}
                  backgroundColor={colors.muted}
                />
              </YStack>
              <YStack gap="$1">
                <SizableText color={colors.foreground} size="$2" fontWeight="600">Mot de passe</SizableText>
                <Input
                  value={password}
                  onChangeText={setPassword}
                  placeholder="••••••••"
                  secureTextEntry
                  color={colors.foreground}
                  borderColor={colors.border}
                  backgroundColor={colors.muted}
                />
              </YStack>
              {error && (
                <Card backgroundColor={colors.destructive + '20'} borderColor={colors.destructive} borderWidth={1} borderRadius="$4" padding="$3">
                  <SizableText color={colors.destructive} size="$2">{error}</SizableText>
                </Card>
              )}
              <Button
                backgroundColor={colors.primary}
                color={colors.primaryForeground}
                onPress={() => { setError(null); login.mutate({ email, password }); }}
                disabled={login.isPending || !email || !password}
                borderRadius="$4"
                height={52}
              >
                {login.isPending ? 'Connexion…' : 'Se connecter'}
              </Button>
              <Button
                variant="outline"
                borderColor={colors.border}
                color={colors.foreground}
                onPress={() => router.push('/register')}
                borderRadius="$4"
                height={52}
              >
                S'inscrire
              </Button>
            </YStack>
          </Card>

          <SizableText color={colors.mutedForeground} size="$1" textAlign="center">
            Lycée Horizon · Administration centrale
          </SizableText>
        </YStack>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
