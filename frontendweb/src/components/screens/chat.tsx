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
  Users,
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
  const scrollRef = useRef<HTMLDivElement>(null)

  const userMap = useMemo(() => {
    const map: Record<number, User> = {}
    users.forEach(u => { map[u.id] = u })
    return map
  }, [users])

  const fetchGroups = async () => {
    setLoading(true)
    try {
      const res = await api.get<{ results: ChatGroup[] }>('/api/chat-groups/')
      setGroups(res.results || [])
    } catch (e) {
      console.error('Failed to load groups', e)
    } finally {
      setLoading(false)
    }
  }

  const fetchMessages = async (groupId: string) => {
    try {
      const res = await api.get<{ results: ChatMessage[] }>(`/api/chat-groups/${groupId}/messages/`)
      setMessages(res.results || [])
    } catch (e) {
      console.error('Failed to load messages', e)
    }
  }

  useEffect(() => {
    fetchGroups()
  }, [])

  useEffect(() => {
    if (selectedGroup) {
      fetchMessages(selectedGroup.id)
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
      await api.post(`/api/chat-groups/${selectedGroup.id}/send/`, { content: draft.trim() })
      setDraft('')
      fetchMessages(selectedGroup.id)
    } catch (e) {
      console.error('Failed to send message', e)
    } finally {
      setSending(false)
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

  if (selectedGroup) {
    return (
      <div className="flex h-[calc(100vh-8rem)] gap-4">
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

        <Card className="flex-1 border-border/70 bg-card/80 shadow-sm flex flex-col">
          <CardHeader className="border-b border-border">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setSelectedGroup(null)}>
                <ChevronRight className="size-4" />
              </Button>
              <div className="flex-1">
                <CardTitle className="text-base">{selectedGroup.name}</CardTitle>
                <p className="text-xs text-muted-foreground">
                  {selectedGroup.members?.length || 0} membres · {GROUP_TYPE_LABELS[selectedGroup.group_type]}
                </p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="flex-1 overflow-y-auto p-4 space-y-3" ref={scrollRef}>
            {messages.map(message => {
              const sender = userMap[message.sender || 0]
              const isOwn = message.sender === users[0]?.id
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
          <div className="border-t border-border p-3">
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
        <h2 className="text-3xl font-semibold tracking-[-0.04em] sm:text-4xl">Messagerie</h2>
        <p className="mt-2 max-w-xl text-sm leading-6 text-muted-foreground">
          Échangez avec vos collègues, participez aux groupes de matière et de classe.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-1 border-border/70 bg-card/80 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Groupes</CardTitle>
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
          <CardContent className="space-y-2">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="size-6 animate-spin text-muted-foreground" />
              </div>
            ) : filteredGroups.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">Aucun groupe</p>
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
                      {GROUP_TYPE_LABELS[group.group_type]} · {group.members?.length || 0} membres
                    </p>
                  </div>
                  <ChevronRight className="size-4 text-muted-foreground" />
                </button>
              ))
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2 border-border/70 bg-card/80 shadow-sm">
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