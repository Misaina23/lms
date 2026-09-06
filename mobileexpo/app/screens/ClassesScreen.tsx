import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Search, Plus, Pencil, Trash2, BookOpen, X } from '@blinkdotnew/mobile-ui'
import { YStack, XStack, Card, H1, H3, Paragraph, SizableText, Input, Button, ScrollView } from '@blinkdotnew/mobile-ui'
import { useTheme } from '@/lib/theme'
import { API_BASE } from '@/lib/api'

interface Classe {
  id: number
  nom: string
  niveau: string
  stream: string | null
  academic_year: string | null
  capacite: number
  effectif?: number
}

export default function ClassesScreen() {
  const { colors } = useTheme()
  const queryClient = useQueryClient()
  const [query, setQuery] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [form, setForm] = useState({ nom: '', niveau: 'SECONDAIRE_GENERAL', stream: '', academic_year: '', capacite: 30 })
  const [saving, setSaving] = useState(false)

  const { data: classesData, isLoading } = useQuery({
    queryKey: ['classes'],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/classes/`)
      if (!res.ok) throw new Error('Failed')
      return res.json() as Promise<{ results: Classe[] }>
    },
  })

  const classes = classesData?.results || []

  const createMutation = useMutation({
    mutationFn: (data: any) => fetch(`${API_BASE}/classes/`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }).then(r => r.json()),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['classes'] }); resetForm() }
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => fetch(`${API_BASE}/classes/${id}/`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }).then(r => r.json()),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['classes'] }); resetForm() }
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => fetch(`${API_BASE}/classes/${id}/`, { method: 'DELETE' }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['classes'] }) }
  })

  const filtered = classes.filter((c) => {
    const q = query.toLowerCase()
    return c.nom.toLowerCase().includes(q) || c.niveau.toLowerCase().includes(q)
  })

  const resetForm = () => {
    setForm({ nom: '', niveau: 'SECONDAIRE_GENERAL', stream: '', academic_year: '', capacite: 30 })
    setEditingId(null)
    setShowForm(false)
  }

  const openCreate = () => { resetForm(); setShowForm(true) }
  const openEdit = (classe: Classe) => {
    setEditingId(classe.id)
    setForm({ nom: classe.nom, niveau: classe.niveau, stream: classe.stream || '', academic_year: classe.academic_year || '', capacite: classe.capacite })
    setShowForm(true)
  }

  const handleSave = () => {
    setSaving(true)
    const payload = { ...form, stream: form.stream || null, academic_year: form.academic_year || null }
    if (editingId) {
      updateMutation.mutate({ id: editingId, data: payload }, { onSettled: () => setSaving(false) })
    } else {
      createMutation.mutate(payload, { onSettled: () => setSaving(false) })
    }
  }

  const handleDelete = (id: number) => {
    if (!confirm('Supprimer cette classe ?')) return
    deleteMutation.mutate(id)
  }

  return (
    <ScrollView flex={1} backgroundColor={colors.background} showsVerticalScrollIndicator={false}>
      <YStack paddingHorizontal="$4" paddingTop="$6" paddingBottom="$8" gap="$4">
        <YStack gap="$1">
          <SizableText color={colors.primary} size="$3" fontWeight="700">GESTION SCOLAIRE</SizableText>
          <H1 color={colors.foreground} fontWeight="800">Classes</H1>
          <Paragraph color={colors.mutedForeground}>{classes.length} classes enregistrées</Paragraph>
        </YStack>

        <XStack gap="$2">
          <XStack flex={1} relative>
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChangeText={setQuery}
              placeholder="Rechercher..."
              color={colors.foreground}
              borderColor={colors.border}
              backgroundColor={colors.muted}
              style={{ paddingLeft: 36 }}
            />
          </XStack>
          <Button backgroundColor={colors.primary} color={colors.primaryForeground} onPress={openCreate} height={44}>
            <Plus size={18} color={colors.primaryForeground} />
          </Button>
        </XStack>

        {showForm && (
          <Card backgroundColor={colors.card} borderColor={colors.border} borderWidth={1} borderRadius="$6" padding="$5" gap="$4">
            <XStack justifyContent="space-between" alignItems="center">
              <H3 color={colors.primary} fontWeight="700">{editingId ? 'Modifier classe' : 'Nouvelle classe'}</H3>
              <Button circular size="$3" backgroundColor={colors.secondary} onPress={resetForm}>
                <X size={16} color={colors.foreground} />
              </Button>
            </XStack>
            <YStack gap="$3">
              <YStack gap="$1">
                <SizableText color={colors.foreground} size="$2" fontWeight="600">Nom *</SizableText>
                <Input value={form.nom} onChangeText={(v: string) => setForm({ ...form, nom: v })} placeholder="6ème A" color={colors.foreground} borderColor={colors.border} backgroundColor={colors.muted} />
              </YStack>
              <YStack gap="$1">
                <SizableText color={colors.foreground} size="$2" fontWeight="600">Niveau *</SizableText>
                <XStack gap="$2">
                  {['PRIMAIRE', 'SECONDAIRE_GENERAL', 'SECONDAIRE_TECHNIQUE'].map((niveau) => (
                    <Button
                      key={niveau}
                      flex={1}
                      height={40}
                      variant={form.niveau === niveau ? 'default' : 'outline'}
                      backgroundColor={form.niveau === niveau ? colors.primary : colors.card}
                      borderColor={form.niveau === niveau ? colors.primary : colors.border}
                      color={form.niveau === niveau ? colors.primaryForeground : colors.foreground}
                      onPress={() => setForm({ ...form, niveau })}
                    >
                      {niveau === 'PRIMAIRE' ? 'Primaire' : niveau === 'SECONDAIRE_GENERAL' ? 'Sec. Gén.' : 'Sec. Tech.'}
                    </Button>
                  ))}
                </XStack>
              </YStack>
              <YStack gap="$1">
                <SizableText color={colors.foreground} size="$2" fontWeight="600">Filière</SizableText>
                <Input value={form.stream} onChangeText={(v: string) => setForm({ ...form, stream: v })} placeholder="S, L, OSE, TC, TI, G" color={colors.foreground} borderColor={colors.border} backgroundColor={colors.muted} />
              </YStack>
              <YStack gap="$1">
                <SizableText color={colors.foreground} size="$2" fontWeight="600">Année scolaire</SizableText>
                <Input value={form.academic_year} onChangeText={(v: string) => setForm({ ...form, academic_year: v })} placeholder="2024-2025" color={colors.foreground} borderColor={colors.border} backgroundColor={colors.muted} />
              </YStack>
              <YStack gap="$1">
                <SizableText color={colors.foreground} size="$2" fontWeight="600">Capacité</SizableText>
                <Input value={form.capacite.toString()} onChangeText={(v: string) => setForm({ ...form, capacite: parseInt(v) || 0 })} keyboardType="numeric" color={colors.foreground} borderColor={colors.border} backgroundColor={colors.muted} />
              </YStack>
              <Button backgroundColor={colors.primary} color={colors.primaryForeground} onPress={handleSave} disabled={saving || !form.nom} height={48}>
                {saving ? 'Enregistrement…' : 'Enregistrer'}
              </Button>
            </YStack>
          </Card>
        )}

        {isLoading ? (
          <YStack padding="$8" alignItems="center">
            <Paragraph color={colors.mutedForeground}>Chargement...</Paragraph>
          </YStack>
        ) : (
          <YStack gap="$3">
            {filtered.map((classe) => (
              <Card key={classe.id} backgroundColor={colors.card} borderColor={colors.border} borderWidth={1} borderRadius="$6" padding="$5">
                <XStack justifyContent="space-between" alignItems="flex-start">
                  <YStack flex={1} gap="$2">
                    <XStack gap="$2" alignItems="center">
                      <YStack backgroundColor={colors.primary + '15'} padding="$2" borderRadius="$3">
                        <BookOpen size={18} color={colors.primary} />
                      </YStack>
                      <YStack flex={1}>
                        <SizableText color={colors.foreground} fontWeight="700" size="$3">{classe.nom}</SizableText>
                        <SizableText color={colors.mutedForeground} size="$2">{classe.niveau}{classe.stream ? ` · ${classe.stream}` : ''}</SizableText>
                      </YStack>
                    </XStack>
                    <XStack gap="$3">
                      {classe.academic_year && (
                        <SizableText color={colors.mutedForeground} size="$1">{classe.academic_year}</SizableText>
                      )}
                      <SizableText color={colors.mutedForeground} size="$1">Capacité: {classe.capacite}</SizableText>
                    </XStack>
                  </YStack>
                  <XStack gap="$1">
                    <Button circular size="$2" backgroundColor={colors.secondary} onPress={() => openEdit(classe)}>
                      <Pencil size={14} color={colors.foreground} />
                    </Button>
                    <Button circular size="$2" backgroundColor={colors.destructive + '15'} onPress={() => handleDelete(classe.id)}>
                      <Trash2 size={14} color={colors.destructive} />
                    </Button>
                  </XStack>
                </XStack>
              </Card>
            ))}
            {filtered.length === 0 && (
              <YStack padding="$8" alignItems="center">
                <Paragraph color={colors.mutedForeground}>Aucune classe trouvée.</Paragraph>
              </YStack>
            )}
          </YStack>
        )}
      </YStack>
    </ScrollView>
  )
}
