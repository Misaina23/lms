'use client'

import { useState, useEffect, useRef, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  MessageCircle,
  Send,
  Search,
  ChevronRight,
  UserPlus,
  Loader2,
} from 'lucide-react'
import type { ChatGroup, ChatMessage, User } from '@/lib/api'
import { api } from '@/lib/api'

const GROUP_TYPE_LABELS: Record<string, string> = {
  PRIVATE: 'Privé',
  SUBJECT: 'Matière',
  CLASS: 'Classe',
  ADMIN_ANNOUNCE: 'Annonces Admin',
}

export function ChatScreen({ users = [] }: { users: User[] }) {
  const [groups, setGroups] = useState<ChatGroup[]>([])
  const [selectedGroup, setSelectedGroup] = useState<ChatGroup | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [draft, setDraft] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState(false)
  const [sending, setSending] = useState(false)
  const [currentUserId, setCurrentUserId] = useState<number | null>(null)
  const [showDirectForm, setShowDirectForm] = useState(false)
  const [contactId, setContactId] = useState('')
  const [contactSearch, setContactSearch] = useState('')
  const [contacts, setContacts] = useState<User[]>(users)
  const [contactsLoading, setContactsLoading] = useState(false)
  const [contactsError, setContactsError] = useState('')
  const [startingChat, setStartingChat] = useState(false)
  const [error, setError] = useState('')
  const scrollRef = useRef<HTMLDivElement>(null)

  const userMap = useMemo(() => {
    const map: Record<number, User> = {}
    contacts.forEach(u => { map[u.id] = u })
    return map
  }, [contacts])

  const fetchGroups = async () => {
    setLoading(true)
    setError('')
    try {
      const res = await api.get<ChatGroup[] | { results: ChatGroup[] }>('/chat-groups/')
      setGroups(Array.isArray(res) ? res : res.results)
    } catch (fetchError) {
      setError(fetchError instanceof Error ? fetchError.message : 'Impossible de charger les groupes.')
    } finally {
      setLoading(false)
    }
  }

  const fetchMessages = async (groupId: string) => {
    try {
      const res = await api.get<ChatMessage[] | { results: ChatMessage[] }>(`/chat-groups/${groupId}/messages/`)
      setMessages(Array.isArray(res) ? res : res.results)
    } catch (fetchError) {
      setError(fetchError instanceof Error ? fetchError.message : 'Impossible de charger les messages.')
    }
  }

  useEffect(() => {
    const savedUser = localStorage.getItem('user')
    if (savedUser) {
      try {
        setCurrentUserId((JSON.parse(savedUser) as User).id)
      } catch {
        setError('La session utilisateur est invalide. Reconnectez-vous.')
      }
    }
    fetchGroups()
    const fetchContacts = async () => {
      setContactsLoading(true)
      setContactsError('')
      try {
        const allContacts: User[] = []
        let page = 1
        let hasNextPage = true
        while (hasNextPage) {
          const response = await api.get<{ results: User[]; next: string | null }>(`/users/?page=${page}&page_size=500`)
          allContacts.push(...response.results)
          hasNextPage = Boolean(response.next)
          page += 1
        }
        setContacts(allContacts)
      } catch (fetchError) {
        setContactsError(fetchError instanceof Error ? fetchError.message : 'Impossible de charger les comptes du personnel.')
      } finally {
        setContactsLoading(false)
      }
    }
    void fetchContacts()
  }, [])

  useEffect(() => {
    if (selectedGroup) {
      void fetchMessages(selectedGroup.id)
      const interval = window.setInterval(() => { void fetchMessages(selectedGroup.id) }, 5000)
      return () => window.clearInterval(interval)
    }
  }, [selectedGroup?.id])

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages.length])

  const handleSend = async () => {
    if (!draft.trim() || !selectedGroup || sending) return
    setSending(true)
    try {
      await api.post(`/chat-groups/${selectedGroup.id}/send/`, { content: draft.trim() })
      setDraft('')
      await fetchMessages(selectedGroup.id)
    } catch (sendError) {
      setError(sendError instanceof Error ? sendError.message : 'Impossible d’envoyer le message.')
    } finally {
      setSending(false)
    }
  }

  const startDirectChat = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!contactId || startingChat) return
    setStartingChat(true)
    setError('')
    try {
      const group = await api.post<ChatGroup>('/chat-groups/direct/', { recipient: Number(contactId) })
      setShowDirectForm(false)
      setContactId('')
      setContactSearch('')
      await fetchGroups()
      setSelectedGroup(group)
    } catch (chatError) {
      setError(chatError instanceof Error ? chatError.message : 'Impossible de démarrer la conversation.')
    } finally {
      setStartingChat(false)
    }
  }

  const filteredGroups = groups.filter(group => {
    if (!searchQuery) return true
    const q = searchQuery.toLowerCase()
    return (
      group.name.toLowerCase().includes(q) ||
      GROUP_TYPE_LABELS[group.group_type]?.toLowerCase().includes(q)
    )
  })
  const availableContacts = contacts.filter((user) =>
    user.status === 'ACTIVE'
    && user.id !== currentUserId
    && (!contactSearch.trim() || `${user.first_name} ${user.last_name} ${user.role}`.toLocaleLowerCase().includes(contactSearch.trim().toLocaleLowerCase()))
  )

  if (selectedGroup) {
    return (
      <div className="flex h-[calc(100dvh-11rem)] min-h-[28rem] gap-4">
        <div className="hidden md:flex md:w-64 flex-col gap-2">
          <Button variant="outline" onClick={() => setSelectedGroup(null)} className="justify-start">
            ← Retour aux groupes
          </Button>
          {groups.slice(0, 10).map(group => (
            <button
              key={group.id}
              onClick={() => setSelectedGroup(group)}
              className={`flex items-center gap-2 rounded-lg border border-border/70 p-3 text-left transition-colors hover:bg-muted/40 ${
                selectedGroup.id === group.id ? 'bg-accent/10 border-accent' : ''
              }`}
            >
              <MessageCircle className="size-4 text-muted-foreground" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{group.name}</p>
                <p className="truncate text-xs text-muted-foreground">{GROUP_TYPE_LABELS[group.group_type]}</p>
              </div>
            </button>
          ))}
        </div>

        <Card className="flex-1 border-border/70 bg-card/80 shadow-sm flex flex-col rounded-2xl">
          <CardHeader className="border-b border-border">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setSelectedGroup(null)}>
                <ChevronRight className="size-4 rotate-180" />
              </Button>
              <div className="flex-1">
                <CardTitle className="text-base">{selectedGroup.name}</CardTitle>
                <p className="text-xs text-muted-foreground">
                  {selectedGroup.member_count || selectedGroup.members_detail?.length || 0} membres · {GROUP_TYPE_LABELS[selectedGroup.group_type]}
                </p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="flex-1 overflow-y-auto p-4 space-y-3" ref={scrollRef}>
            {error && <p className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive" role="alert">{error}</p>}
            {messages.map(message => {
              const sender = userMap[message.sender || 0]
              const isOwn = message.sender === currentUserId
              return (
                <div key={message.id} className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[70%] rounded-lg px-4 py-2 ${
                    isOwn ? 'bg-primary text-primary-foreground' : 'bg-muted'
                  }`}>
                    {!isOwn && (
                      <p className="mb-1 text-xs font-semibold opacity-70">
                        {message.sender_name || sender?.first_name || 'Utilisateur'}
                      </p>
                    )}
                    <p className="text-sm">{message.content}</p>
                    <p className={`mt-1 text-[10px] ${isOwn ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>
                      {new Date(message.created_at).toLocaleString('fr-FR', { hour: '2-digit', minute: '2-digit', day: 'numeric', month: 'short' })}
                    </p>
                  </div>
                </div>
              )
            })}
            {messages.length === 0 && (
              <div className="flex h-full items-center justify-center text-muted-foreground">
                <p>Aucun message. Soyez le premier à envoyer un message !</p>
              </div>
            )}
          </CardContent>
          <div className="border-t border-border p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
            <div className="flex gap-2">
              <Input
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder="Écrire un message..."
                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                className="flex-1"
              />
              <Button onClick={handleSend} disabled={!draft.trim() || sending} size="icon">
                {sending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
              </Button>
            </div>
          </div>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="mb-2 font-serif text-sm italic text-primary">Communication</p>
        <h2 className="text-lg font-extrabold tracking-tight text-foreground sm:text-xl">Messagerie</h2>
        <p className="mt-2 max-w-xl text-sm leading-6 text-muted-foreground">
          Échangez avec vos collègues, participez aux groupes de matière et de classe.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-1 border-border/70 bg-card/80 shadow-sm rounded-2xl">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between gap-2">
              <CardTitle className="text-base">Conversations</CardTitle>
              <Button size="sm" variant="outline" onClick={() => setShowDirectForm((value) => !value)} className="gap-1"><UserPlus className="size-4" /> Nouveau</Button>
            </div>
            {showDirectForm && (
              <form onSubmit={startDirectChat} className="mt-3 grid gap-2">
                <label className="grid gap-1 text-xs font-semibold">
                  Rechercher un compte du personnel
                  <Input value={contactSearch} onChange={(event) => { setContactSearch(event.target.value); setContactId('') }} placeholder="Nom ou fonction" />
                </label>
                {contactsLoading ? (
                  <p className="flex items-center gap-2 py-2 text-xs text-muted-foreground"><Loader2 className="size-4 animate-spin" />Chargement des comptes actifs…</p>
                ) : contactsError ? (
                  <p className="text-xs text-destructive" role="alert">{contactsError}</p>
                ) : availableContacts.length > 0 ? (
                  <div className="max-h-48 overflow-y-auto rounded-xl border border-border" role="listbox" aria-label="Comptes du personnel disponibles">
                    {availableContacts.slice(0, 12).map((user) => (
                      <button
                        type="button"
                        key={user.id}
                        aria-selected={contactId === String(user.id)}
                        onClick={() => setContactId(String(user.id))}
                        className={`flex w-full items-center justify-between gap-3 border-b border-border/60 px-3 py-2.5 text-left last:border-0 hover:bg-muted/50 ${contactId === String(user.id) ? 'bg-primary/10' : ''}`}
                      >
                        <span className="min-w-0 truncate text-sm font-medium">{user.first_name} {user.last_name}</span>
                        <span className="shrink-0 text-xs text-muted-foreground">{user.role}</span>
                      </button>
                    ))}
                    {availableContacts.length > 12 && <p className="px-3 py-2 text-xs text-muted-foreground">Affinez la recherche pour voir les {availableContacts.length} résultats.</p>}
                  </div>
                ) : (
                  <p className="py-2 text-xs text-muted-foreground">{contacts.length === 0 ? 'Aucun autre compte actif du personnel n’est disponible.' : 'Aucun collègue ne correspond à cette recherche.'}</p>
                )}
                <Button type="submit" className="w-full sm:w-auto sm:justify-self-end" disabled={!contactId || startingChat || contactsLoading}>
                  {startingChat ? <><Loader2 className="mr-2 size-4 animate-spin" />Création…</> : 'Démarrer la conversation'}
                </Button>
              </form>
            )}
            {error && <p className="mt-2 text-xs text-destructive" role="alert">{error}</p>}
            <div className="relative mt-2">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Rechercher..."
                className="h-9 w-full pl-9"
              />
            </div>
          </CardHeader>
          <CardContent className="max-h-[calc(100dvh-20rem)] space-y-2 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="size-6 animate-spin text-muted-foreground" />
              </div>
            ) : filteredGroups.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <MessageCircle className="size-10 text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">{searchQuery ? 'Aucun groupe correspondant.' : 'Aucune conversation pour le moment.'}</p>
                {!searchQuery && <p className="mt-1 text-xs text-muted-foreground">Appuyez sur « Nouveau » pour choisir un collègue et lui écrire.</p>}
              </div>
            ) : (
              filteredGroups.map(group => (
                <button
                  key={group.id}
                  onClick={() => setSelectedGroup(group)}
                  className="flex w-full items-center gap-3 rounded-lg border border-border/70 p-3 text-left transition-colors hover:bg-muted/40"
                >
                  <div className="flex size-10 items-center justify-center rounded-full bg-primary/10">
                    <MessageCircle className="size-5 text-primary" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">{group.name}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {GROUP_TYPE_LABELS[group.group_type]} · {group.member_count || group.members_detail?.length || 0} membres
                    </p>
                  </div>
                  <ChevronRight className="size-4 text-muted-foreground" />
                </button>
              ))
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2 border-border/70 bg-card/80 shadow-sm rounded-2xl">
          <CardContent className="flex h-[500px] items-center justify-center text-muted-foreground">
            <div className="text-center">
              <MessageCircle className="mx-auto size-12 mb-4 opacity-50" />
              <p>Sélectionnez un groupe pour voir les messages</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}