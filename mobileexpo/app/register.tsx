import { router } from 'expo-router';
import { useState, useEffect } from 'react';
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
import { useQuery, useMutation } from '@tanstack/react-query';
import { useTheme } from '@/lib/theme';
import { API_BASE } from '@/lib/api';

interface ClasseOption {
  id: number;
  nom: string;
  niveau: string;
  stream: string | null;
}

interface MatiereOption {
  id: number;
  nom: string;
  code: string;
  description: string;
  coefficient: number;
}

export default function RegisterScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [role, setRole] = useState<'PROFESSEUR' | 'SURVEILLANT' | 'ADMIN' | ''>('');
  const [matricule, setMatricule] = useState('');
  const [phone, setPhone] = useState('');
  const [selectedClasseId, setSelectedClasseId] = useState<number | null>(null);
  const [selectedMatiereIds, setSelectedMatiereIds] = useState<number[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const { data: optionsData } = useQuery({
    queryKey: ['registration-options'],
    queryFn: async (): Promise<{
      classes: ClasseOption[];
      matieres: MatiereOption[];
      roles: { value: string; label: string }[];
    }> => {
      const res = await fetch(`${API_BASE}/register/options/`);
      if (!res.ok) throw new Error('Failed to fetch options');
      return res.json();
    },
  });

  const register = useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch(`${API_BASE}/register/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(JSON.stringify(body) || 'Erreur lors de l\'inscription');
      }
      return res.json();
    },
    onSuccess: (data) => {
      setSuccess('Inscription réussie ! Votre compte est en attente de validation par l\'administration.');
      setError(null);
      setTimeout(() => {
        router.replace('/');
      }, 3000);
    },
    onError: (e) => {
      if (e instanceof Error) {
        try {
          const body = JSON.parse(e.message);
          if (body.email) setError('Email: ' + body.email.join(', '));
          else if (body.password) setError('Mot de passe: ' + body.password.join(', '));
          else if (body.detail) setError(body.detail);
          else setError('Erreur lors de l\'inscription');
        } catch {
          setError(e.message || 'Erreur lors de l\'inscription');
        }
      } else {
        setError('Erreur lors de l\'inscription');
      }
    },
  });

  const handleSubmit = () => {
    setError(null);
    setSuccess(null);

    if (!firstName || !lastName || !email || !password) {
      setError('Veuillez remplir tous les champs obligatoires.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Les mots de passe ne correspondent pas.');
      return;
    }
    if (!role) {
      setError('Veuillez sélectionner un rôle.');
      return;
    }

    const username = `${firstName.toLowerCase()}.${lastName.toLowerCase()}`;
    const payload: any = {
      username,
      first_name: firstName,
      last_name: lastName,
      email,
      password,
      matricule: matricule || username,
      role,
      phone: phone || '',
      status: 'PENDING_VERIFICATION',
    };

    if (role === 'PROFESSEUR') {
      if (!selectedClasseId) {
        setError('Veuillez sélectionner une classe.');
        return;
      }
      payload.classe = selectedClasseId;
      if (selectedMatiereIds.length > 0) {
        payload.matieres = selectedMatiereIds;
      }
    }

    register.mutate(payload);
  };

  const toggleMatiere = (id: number) => {
    setSelectedMatiereIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const classes: ClasseOption[] = optionsData?.classes || [];
  const matieres: MatiereOption[] = optionsData?.matieres || [];

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
            <Paragraph color={colors.mutedForeground} textAlign="center">Créer un compte</Paragraph>
          </YStack>

          <Card backgroundColor={colors.card} borderColor={colors.border} borderWidth={1} borderRadius="$6" padding="$5" gap="$4">
            <H3 color={colors.primary} fontWeight="700">Inscription</H3>
            <YStack gap="$3">
              <XStack gap="$3">
                <YStack flex={1} gap="$1">
                  <SizableText color={colors.foreground} size="$2" fontWeight="600">Nom *</SizableText>
                  <Input
                    value={lastName}
                    onChangeText={setLastName}
                    placeholder="Dupont"
                    color={colors.foreground}
                    borderColor={colors.border}
                    backgroundColor={colors.muted}
                  />
                </YStack>
                <YStack flex={1} gap="$1">
                  <SizableText color={colors.foreground} size="$2" fontWeight="600">Prénom *</SizableText>
                  <Input
                    value={firstName}
                    onChangeText={setFirstName}
                    placeholder="Jean"
                    color={colors.foreground}
                    borderColor={colors.border}
                    backgroundColor={colors.muted}
                  />
                </YStack>
              </XStack>
              <YStack gap="$1">
                <SizableText color={colors.foreground} size="$2" fontWeight="600">Email *</SizableText>
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
                <SizableText color={colors.foreground} size="$2" fontWeight="600">Mot de passe *</SizableText>
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
              <YStack gap="$1">
                <SizableText color={colors.foreground} size="$2" fontWeight="600">Confirmer le mot de passe *</SizableText>
                <Input
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  placeholder="••••••••"
                  secureTextEntry
                  color={colors.foreground}
                  borderColor={colors.border}
                  backgroundColor={colors.muted}
                />
              </YStack>
              <YStack gap="$1">
                <SizableText color={colors.foreground} size="$2" fontWeight="600">Rôle *</SizableText>
                <XStack gap="$2">
                  {(['PROFESSEUR', 'SURVEILLANT', 'ADMIN'] as const).map((r) => (
                    <Button
                      key={r}
                      flex={1}
                      height={44}
                      variant={role === r ? 'default' : 'outline'}
                      backgroundColor={role === r ? colors.primary : colors.card}
                      borderColor={role === r ? colors.primary : colors.border}
                      color={role === r ? colors.primaryForeground : colors.foreground}
                      onPress={() => setRole(r)}
                    >
                      {r === 'PROFESSEUR' ? 'Professeur' : r === 'SURVEILLANT' ? 'Surveillant' : 'Admin'}
                    </Button>
                  ))}
                </XStack>
              </YStack>

              {role === 'PROFESSEUR' && (
                <>
                  <YStack gap="$1">
                    <SizableText color={colors.foreground} size="$2" fontWeight="600">Classe *</SizableText>
                    <XStack flexWrap="wrap" gap="$2">
                      {classes.length === 0 && (
                        <SizableText color={colors.mutedForeground} size="$2">Aucune classe disponible</SizableText>
                      )}
                      {classes.map((c) => {
                        const active = selectedClasseId === c.id;
                        return (
                          <Button
                            key={c.id}
                            size="$3"
                            variant={active ? 'default' : 'outline'}
                            backgroundColor={active ? colors.primary : colors.card}
                            borderColor={active ? colors.primary : colors.border}
                            color={active ? colors.primaryForeground : colors.foreground}
                            onPress={() => setSelectedClasseId(active ? null : c.id)}
                          >
                            {c.nom}
                          </Button>
                        );
                      })}
                    </XStack>
                  </YStack>

                  <YStack gap="$1">
                    <SizableText color={colors.foreground} size="$2" fontWeight="600">Matières</SizableText>
                    <SizableText color={colors.mutedForeground} size="$1">Sélectionnez une ou plusieurs matières</SizableText>
                    <XStack flexWrap="wrap" gap="$2">
                      {matieres.map((m) => {
                        const selected = selectedMatiereIds.includes(m.id);
                        return (
                          <Button
                            key={m.id}
                            size="$3"
                            variant={selected ? 'default' : 'outline'}
                            backgroundColor={selected ? colors.accent : colors.card}
                            borderColor={selected ? colors.accent : colors.border}
                            color={selected ? colors.accentForeground : colors.foreground}
                            onPress={() => toggleMatiere(m.id)}
                          >
                            {m.nom}
                          </Button>
                        );
                      })}
                    </XStack>
                  </YStack>
                </>
              )}

              <YStack gap="$1">
                <SizableText color={colors.foreground} size="$2" fontWeight="600">Matricule</SizableText>
                <Input
                  value={matricule}
                  onChangeText={setMatricule}
                  placeholder="MAT001"
                  color={colors.foreground}
                  borderColor={colors.border}
                  backgroundColor={colors.muted}
                />
              </YStack>
              <YStack gap="$1">
                <SizableText color={colors.foreground} size="$2" fontWeight="600">Téléphone</SizableText>
                <Input
                  value={phone}
                  onChangeText={setPhone}
                  placeholder="+261 34 00 000 00"
                  keyboardType="phone-pad"
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
              {success && (
                <Card backgroundColor={colors.success + '20'} borderColor={colors.success} borderWidth={1} borderRadius="$4" padding="$3">
                  <SizableText color={colors.success} size="$2">{success}</SizableText>
                </Card>
              )}
              <Button
                backgroundColor={colors.primary}
                color={colors.primaryForeground}
                onPress={handleSubmit}
                disabled={register.isPending}
                borderRadius="$4"
                height={52}
              >
                {register.isPending ? 'Inscription…' : "S'inscrire"}
              </Button>
              <Button
                variant="outline"
                borderColor={colors.border}
                color={colors.foreground}
                onPress={() => router.back()}
                borderRadius="$4"
                height={52}
              >
                Retour à la connexion
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
