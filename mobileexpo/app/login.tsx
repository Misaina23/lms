import { router } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Alert } from 'react-native';
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
import * as Haptics from 'expo-haptics';

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
        <YStack gap="$5" maxWidth={520} alignSelf="center" width="100%">
          <YStack gap="$2" alignItems="center">
            <YStack
              backgroundColor={colors.primary + '30'}
              borderWidth={1}
              borderColor={colors.accent + '40'}
              padding="$4"
              borderRadius="$6"
              shadowColor={colors.accent}
              shadowOffset={{ width: 0, height: 0 }}
              shadowOpacity={0.35}
              shadowRadius={20}
            >
              <SizableText color={colors.accent} size="$8" fontWeight="800">LH</SizableText>
            </YStack>
            <H1 color={colors.foreground} fontWeight="800" textAlign="center">Connexion</H1>
            <Paragraph color={colors.mutedForeground} textAlign="center">Bienvenue ! Connectez-vous pour continuer</Paragraph>
          </YStack>

          <YStack gap="$4">
            <YStack gap="$1">
              <SizableText color={colors.foreground} size="$2" fontWeight="600">Email</SizableText>
              <YStack backgroundColor={colors.card} borderColor={colors.border} borderWidth={1} borderRadius="$4" paddingHorizontal="$4" paddingVertical="$3" flexDirection="row" alignItems="center" gap="$3">
                <SizableText color={colors.mutedForeground} size="$2">@</SizableText>
                <Input
                  value={email}
                  onChangeText={setEmail}
                  placeholder="vous@lycee.com"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  color={colors.foreground}
                  borderWidth={0}
                  backgroundColor="transparent"
                  flex={1}
                />
              </YStack>
            </YStack>

            <YStack gap="$1">
              <SizableText color={colors.foreground} size="$2" fontWeight="600">Mot de passe</SizableText>
              <YStack backgroundColor={colors.card} borderColor={colors.border} borderWidth={1} borderRadius="$4" paddingHorizontal="$4" paddingVertical="$3" flexDirection="row" alignItems="center" gap="$3">
                <SizableText color={colors.mutedForeground} size="$2">🔒</SizableText>
                <Input
                  value={password}
                  onChangeText={setPassword}
                  placeholder="••••••••"
                  secureTextEntry
                  color={colors.foreground}
                  borderWidth={0}
                  backgroundColor="transparent"
                  flex={1}
                />
              </YStack>
            </YStack>

            <Button
              backgroundColor={colors.primary}
              color={colors.primaryForeground}
              onPress={() => { setError(null); login.mutate({ email, password }); }}
              disabled={login.isPending || !email || !password}
              borderRadius="$4"
              height={52}
              shadowColor={colors.primary}
              shadowOffset={{ width: 0, height: 4 }}
              shadowOpacity={0.3}
              shadowRadius={12}
              elevation={8}
            >
              {login.isPending ? 'Connexion…' : 'Se connecter'}
            </Button>

            <XStack justifyContent="flex-end">
              <SizableText color={colors.accent} size="$2" fontWeight="700">Mot de passe oublié ?</SizableText>
            </XStack>

            <XStack gap="$3" alignItems="center" marginVertical="$2">
              <XStack flex={1} height={1} backgroundColor={colors.border} />
              <SizableText color={colors.mutedForeground} size="$2">Ou continuer avec</SizableText>
              <XStack flex={1} height={1} backgroundColor={colors.border} />
            </XStack>

            <XStack gap="$3" justifyContent="center">
              <YStack width={48} height={48} borderRadius="$3" backgroundColor={colors.card} borderWidth={1} borderColor={colors.border} alignItems="center" justifyContent="center">
                <SizableText color={colors.foreground} size="$3" fontWeight="800">G</SizableText>
              </YStack>
              <YStack width={48} height={48} borderRadius="$3" backgroundColor={colors.card} borderWidth={1} borderColor={colors.border} alignItems="center" justifyContent="center">
                <SizableText color={colors.foreground} size="$3" fontWeight="800">f</SizableText>
              </YStack>
              <YStack width={48} height={48} borderRadius="$3" backgroundColor={colors.card} borderWidth={1} borderColor={colors.border} alignItems="center" justifyContent="center">
                <SizableText color={colors.foreground} size="$3" fontWeight="800">🍎</SizableText>
              </YStack>
            </XStack>

            {error && (
              <YStack backgroundColor={colors.destructive + '20'} borderWidth={1} borderColor={colors.destructive} borderRadius="$3" padding="$3">
                <SizableText color={colors.destructive} size="$2">{error}</SizableText>
              </YStack>
            )}

            <YStack alignItems="center" gap="$2">
              <SizableText color={colors.mutedForeground} size="$2" textAlign="center">Pas encore de compte ?</SizableText>
              <Button
                variant="outline"
                borderColor={colors.border}
                color={colors.foreground}
                onPress={() => router.push('/register')}
                borderRadius="$4"
                height={44}
              >
                S'inscrire
              </Button>
            </YStack>
          </YStack>

          <SizableText color={colors.mutedForeground} size="$1" textAlign="center" marginTop="$4">
            Lycée Horizon · Administration centrale
          </SizableText>
        </YStack>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
