import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Search, Plus, Pencil, Trash2, BookOpen, X, ChevronDown } from '@blinkdotnew/mobile-ui'
import { YStack, XStack, Card, H1, H3, Paragraph, SizableText, Input, Button, ScrollView } from '@blinkdotnew/mobile-ui'
import { useTheme } from '@/lib/theme'
import { API_BASE } from '@/lib/api'

interface Matiere {
  id: number
  nom: string
  code: string
  description: string
  coefficient: number
}

interface Classe {
  id: number
  nom: string
  niveau: string
  stream: string | null
}

export default function MatieresScreen() {
  const { colors } = useTheme()
  const queryClient = useQueryClient()
  const [query, setQuery] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [form, setForm] = useState({ nom: '', code: '', description: '', coefficient: 1, classe: '' })
  const [saving, setSaving] = useState(false)
  const [showClassPicker, setShowClassPicker] = useState(false)

  const { data: matieresData, isLoading } = useQuery({
    queryKey: ['matieres'],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/matieres/`)
      if (!res.ok) throw new Error('Failed')
      return res.json() as Promise<{ results: Matiere[] }>
    },
  })

  const { data: classesData } = useQuery({
    queryKey: ['classes-for-matiere'],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/classes/`)
      if (!res.ok) throw new Error('Failed')
      return res.json() as Promise<{ results: Classe[] }>
    },
  })

  const matieres = matieresData?.results || []
  const classes = classesData?.results || []

  const selectedClasse = classes.find((c) => String(c.id) === form.classe)

  const createMutation = useMutation({
    mutationFn: (data: any) => fetch(`${API_BASE}/matieres/`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }).then(r => r.json()),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['matieres'] }); resetForm() }
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => fetch(`${API_BASE}/matieres/${id}/`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }).then(r => r.json()),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['matieres'] }); resetForm() }
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => fetch(`${API_BASE}/matieres/${id}/`, { method: 'DELETE' }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['matieres'] }) }
  })

  const filtered = matieres.filter((m) => {
    const q = query.toLowerCase()
    return m.nom.toLowerCase().includes(q) || m.code.toLowerCase().includes(q)
  })

  const resetForm = () => {
    setForm({ nom: '', code: '', description: '', coefficient: 1, classe: '' })
    setEditingId(null)
    setShowForm(false)
    setShowClassPicker(false)
  }

  const openCreate = () => { resetForm(); setShowForm(true) }
  const openEdit = (matiere: Matiere) => {
    setEditingId(matiere.id)
    setForm({ nom: matiere.nom, code: matiere.code, description: matiere.description || '', coefficient: matiere.coefficient, classe: '' })
    setShowForm(true)
  }

  const handleSave = () => {
    setSaving(true)
    const payload: any = { ...form }
    if (payload.classe) {
      payload.classe = Number(payload.classe)
    } else {
      delete payload.classe
    }
    if (editingId) {
      updateMutation.mutate({ id: editingId, data: payload }, { onSettled: () => setSaving(false) })
    } else {
      createMutation.mutate(payload, { onSettled: () => setSaving(false) })
    }
  }

  const handleDelete = (id: number) => {
    if (!confirm('Supprimer cette matière ?')) return
    deleteMutation.mutate(id)
  }

  return (
    <ScrollView flex={1} backgroundColor={colors.background} showsVerticalScrollIndicator={false}>
      <YStack paddingHorizontal="$4" paddingTop="$6" paddingBottom="$8" gap="$4">
        <YStack gap="$1">
          <SizableText color={colors.primary} size="$3" fontWeight="700">GESTION SCOLAIRE</SizableText>
          <H1 color={colors.foreground} fontWeight="800">Matières</H1>
          <Paragraph color={colors.mutedForeground}>{matieres.length} matières enregistrées</Paragraph>
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
              <H3 color={colors.primary} fontWeight="700">{editingId ? 'Modifier matière' : 'Nouvelle matière'}</H3>
              <Button circular size="$3" backgroundColor={colors.secondary} onPress={resetForm}>
                <X size={16} color={colors.foreground} />
              </Button>
            </XStack>
            <YStack gap="$3">
              <YStack gap="$1">
                <SizableText color={colors.foreground} size="$2" fontWeight="600">Nom *</SizableText>
                <Input value={form.nom} onChangeText={(v: string) => setForm({ ...form, nom: v })} placeholder="Mathématiques" color={colors.foreground} borderColor={colors.border} backgroundColor={colors.muted} />
              </YStack>
              <YStack gap="$1">
                <SizableText color={colors.foreground} size="$2" fontWeight="600">Classe</SizableText>
                <Button
                  backgroundColor={colors.muted}
                  borderColor={colors.border}
                  borderWidth={1}
                  justifyContent="space-between"
                  onPress={() => setShowClassPicker(true)}
                >
                  <SizableText color={selectedClasse ? colors.foreground : colors.mutedForeground} size="$2">
                    {selectedClasse ? `${selectedClasse.nom} - ${selectedClasse.niveau} ${selectedClasse.stream || ''}` : 'Aucune (coefficient global)'}
                  </SizableText>
                  <ChevronDown size={16} color={colors.mutedForeground} />
                </Button>
              </YStack>

              {showClassPicker && (
                <Card backgroundColor={colors.card} borderColor={colors.border} borderWidth={1} borderRadius="$4" padding="$3">
                  <XStack justifyContent="space-between" alignItems="center" marginBottom="$2">
                    <SizableText color={colors.foreground} fontWeight="700" size="$3">Sélectionner une classe</SizableText>
                    <Button circular size="$2" backgroundColor={colors.secondary} onPress={() => setShowClassPicker(false)}>
                      <X size={14} color={colors.foreground} />
                    </Button>
                  </XStack>
                  <ScrollView maxHeight={200}>
                    <YStack gap="$1">
                      <Button
                        flex={1}
                        height={40}
                        backgroundColor={form.classe === '' ? colors.primary + '15' : colors.muted}
                        justifyContent="flex-start"
                        onPress={() => { setForm({ ...form, classe: '' }); setShowClassPicker(false) }}
                      >
                        <SizableText color={form.classe === '' ? colors.primary : colors.foreground} size="$2" fontWeight="600">Aucune (coefficient global)</SizableText>
                      </Button>
                      {classes.map((c: Classe) => (
                        <Button
                          key={c.id}
                          flex={1}
                          height={40}
                          backgroundColor={form.classe === String(c.id) ? colors.primary + '15' : colors.muted}
                          justifyContent="flex-start"
                          onPress={() => { setForm({ ...form, classe: String(c.id) }); setShowClassPicker(false) }}
                        >
                          <SizableText color={form.classe === String(c.id) ? colors.primary : colors.foreground} size="$2" fontWeight="600">{c.nom} - {c.niveau} {c.stream || ''}</SizableText>
                        </Button>
                      ))}
                    </YStack>
                  </ScrollView>
                </Card>
              )}
              <YStack gap="$1">
                <SizableText color={colors.foreground} size="$2" fontWeight="600">Coefficient</SizableText>
                <Input value={form.coefficient.toString()} onChangeText={(v: string) => setForm({ ...form, coefficient: parseFloat(v) || 1 })} keyboardType="numeric" color={colors.foreground} borderColor={colors.border} backgroundColor={colors.muted} />
              </YStack>
              <YStack gap="$1">
                <SizableText color={colors.foreground} size="$2" fontWeight="600">Description</SizableText>
                <Input value={form.description} onChangeText={(v: string) => setForm({ ...form, description: v })} placeholder="Option..." color={colors.foreground} borderColor={colors.border} backgroundColor={colors.muted} />
              </YStack>
              <Button backgroundColor={colors.primary} color={colors.primaryForeground} onPress={handleSave} disabled={saving || !form.nom || !form.code} height={48}>
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
            {filtered.map((matiere) => (
              <Card key={matiere.id} backgroundColor={colors.card} borderColor={colors.border} borderWidth={1} borderRadius="$6" padding="$5">
                <XStack justifyContent="space-between" alignItems="flex-start">
                  <YStack flex={1} gap="$2">
                    <XStack gap="$2" alignItems="center">
                      <YStack backgroundColor={colors.accent + '15'} padding="$2" borderRadius="$3">
                        <BookOpen size={18} color={colors.accent} />
                      </YStack>
                      <YStack flex={1}>
                        <SizableText color={colors.foreground} fontWeight="700" size="$3">{matiere.nom}</SizableText>
                        <SizableText color={colors.mutedForeground} size="$2">{matiere.code} · Coef. {matiere.coefficient}</SizableText>
                      </YStack>
                    </XStack>
                    {matiere.description && (
                      <SizableText color={colors.mutedForeground} size="$1" paddingLeft="$8">{matiere.description}</SizableText>
                    )}
                  </YStack>
                  <XStack gap="$1">
                    <Button circular size="$2" backgroundColor={colors.secondary} onPress={() => openEdit(matiere)}>
                      <Pencil size={14} color={colors.foreground} />
                    </Button>
                    <Button circular size="$2" backgroundColor={colors.destructive + '15'} onPress={() => handleDelete(matiere.id)}>
                      <Trash2 size={14} color={colors.destructive} />
                    </Button>
                  </XStack>
                </XStack>
              </Card>
            ))}
            {filtered.length === 0 && (
              <YStack padding="$8" alignItems="center">
                <Paragraph color={colors.mutedForeground}>Aucune matière trouvée.</Paragraph>
              </YStack>
            )}
          </YStack>
        )}
      </YStack>
    </ScrollView>
  )
}
