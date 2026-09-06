import { useState, useEffect, useRef } from 'react';
import { ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  YStack,
  XStack,
  ScrollView,
  Card,
  Button,
  H1,
  H2,
  H3,
  Paragraph,
  SizableText,
  Input,
  ChevronRight,
  UsersRound,
  MessageCircle,
  Send,
} from '@blinkdotnew/mobile-ui';
import { useTheme } from '@/lib/theme';
import { useAuth } from '@/hooks/useAuth';
import { api, type ChatGroup, type ChatMessage } from '@/lib/api';
import * as Haptics from 'expo-haptics';

function tapFeedback() {
  if (typeof Haptics !== 'undefined') Haptics.selectionAsync();
}

const GROUP_TYPE_LABELS: Record<string, string> = {
  PRIVATE: 'Privé',
  SUBJECT: 'Matière',
  CLASS: 'Classe',
  ADMIN_ANNOUNCE: 'Annonces',
};

function GroupCard({ group, isSelected, onSelect }: { group: any; isSelected: boolean; onSelect: (group: any) => void }) {
  const { colors } = useTheme();
  return (
    <Card
      backgroundColor={isSelected ? colors.accent + '15' : colors.card}
      borderColor={isSelected ? colors.accent : colors.border}
      borderWidth={isSelected ? 2 : 1}
      borderRadius="$4"
      padding="$4"
      marginBottom="$2"
    >
      <XStack gap="$3" alignItems="center">
        <YStack
          width={44}
          height={44}
          borderRadius="$4"
          backgroundColor={isSelected ? colors.accent : colors.secondary}
          alignItems="center"
          justifyContent="center"
        >
          <MessageCircle size={22} color={isSelected ? colors.accentForeground : colors.accent} />
        </YStack>
        <YStack flex={1} gap="$1">
          <XStack gap="$2" alignItems="center" flexWrap="wrap">
            <SizableText color={colors.foreground} fontWeight="700" size="$3">
              {group.name}
            </SizableText>
            <YStack backgroundColor={colors.secondary} borderRadius="$2" paddingHorizontal="$2" paddingVertical="$1">
              <SizableText color={colors.mutedForeground} size="$1" fontWeight="600">
                {GROUP_TYPE_LABELS[group.group_type] || group.group_type}
              </SizableText>
            </YStack>
          </XStack>
          <SizableText color={colors.mutedForeground} size="$2" numberOfLines={1}>
            {group.members?.length || 0} membres
          </SizableText>
        </YStack>
        <ChevronRight size={16} color={colors.mutedForeground} />
      </XStack>
    </Card>
  );
}

function MessageBubble({ message, isOwn }: { message: any; isOwn: boolean }) {
  const { colors } = useTheme();
  const time = message.created_at
    ? new Date(message.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
    : '';

  return (
    <YStack marginBottom="$3" alignSelf={isOwn ? 'flex-end' : 'flex-start'} maxWidth="80%">
      {!isOwn && (
        <XStack gap="$2" alignItems="center" marginBottom="$1">
          <YStack
            width={28}
            height={28}
            borderRadius={14}
            backgroundColor={colors.secondary}
            alignItems="center"
            justifyContent="center"
          >
            <SizableText color={colors.foreground} size="$1" fontWeight="800">
              {message.sender_name ? message.sender_name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase() : '??'}
            </SizableText>
          </YStack>
          <SizableText color={colors.mutedForeground} size="$1" fontWeight="600">
            {message.sender_name || 'Utilisateur'}
          </SizableText>
        </XStack>
      )}
      
      <Card backgroundColor={isOwn ? colors.accent : colors.secondary} borderRadius="$4" padding="$3">
        <SizableText color={isOwn ? colors.accentForeground : colors.foreground} size="$3" lineHeight={20}>
          {message.content}
        </SizableText>
      </Card>
      
      <SizableText 
        color={colors.mutedForeground} 
        size="$1" 
        marginTop="$1"
        textAlign={isOwn ? 'right' : 'left'}
      >
        {time}
      </SizableText>
    </YStack>
  );
}

export default function ChatScreen() {
  const { colors } = useTheme();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const [selectedGroup, setSelectedGroup] = useState<any>(null);
  const [draft, setDraft] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const scrollViewRef = useRef<any>(null);

  const { data: groups, isLoading: groupsLoading, refetch: refetchGroups } = useQuery({
    queryKey: ['chat-groups', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const res = await api.get<{ results: ChatGroup[] }>(`/api/chat-groups/`).catch(() => ({ results: [] }));
      return res.results || [];
    },
    enabled: !!user,
  });

  const { data: messages, isLoading: messagesLoading, refetch: refetchMessages } = useQuery({
    queryKey: ['chat-messages', selectedGroup?.id],
    queryFn: async () => {
      if (!selectedGroup) return [];
      const res = await api.get<{ results: ChatMessage[] }>(`/api/chat-groups/${selectedGroup.id}/messages/`).catch(() => ({ results: [] }));
      return res.results || [];
    },
    enabled: !!selectedGroup,
  });

  const sendMutation = useMutation({
    mutationFn: async ({ groupId, content }: { groupId: string; content: string }) => {
      return api.post(`/api/chat-groups/${groupId}/send/`, { content });
    },
    onSuccess: () => {
      setDraft('');
      refetchMessages();
    },
  });

  const handleSend = () => {
    if (!draft.trim() || !selectedGroup || sendMutation.isPending) return;
    tapFeedback();
    sendMutation.mutate({ groupId: selectedGroup.id, content: draft.trim() });
  };

  const allGroups: any[] = groups || [];
  const enrichedGroups = allGroups.map((group: any) => ({
    ...group,
    member_count: group.members?.length || 0,
    last_message: group.messages?.[0]?.content || null,
    last_message_at: group.messages?.[0]?.created_at || group.updated_at,
  }));

  const filteredGroups: any[] = [];
  for (const group of enrichedGroups) {
    if (!searchQuery) {
      filteredGroups.push(group);
    } else {
      const query = searchQuery.toLowerCase();
      if (group.name.toLowerCase().includes(query) || group.group_type.toLowerCase().includes(query)) {
        filteredGroups.push(group);
      }
    }
  }

  const enrichedMessages = (messages || []).map((msg: any) => ({
    ...msg,
    sender_name: msg.sender_name || `Utilisateur #${msg.sender}`,
    sender_initials: msg.sender_name 
      ? msg.sender_name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()
      : '??',
  }));

  if (selectedGroup) {
    return (
      <YStack flex={1} backgroundColor={colors.background}>
        <Card
          backgroundColor={colors.card}
          borderColor={colors.border}
          borderBottomWidth={1}
          paddingHorizontal="$4"
          paddingVertical="$3"
          gap="$2"
        >
          <XStack gap="$3" alignItems="center">
            <Button
              circular
              size="$3"
              backgroundColor={colors.secondary}
              onPress={() => { tapFeedback(); setSelectedGroup(null); }}
            >
              <ChevronRight size={20} color={colors.foreground} />
            </Button>
            <YStack flex={1} gap="$1">
              <SizableText color={colors.foreground} fontWeight="700" size="$3">
                {selectedGroup.name}
              </SizableText>
              <SizableText color={colors.mutedForeground} size="$2">
                {selectedGroup.members?.length || 0} membre(s) · {GROUP_TYPE_LABELS[selectedGroup.group_type] || selectedGroup.group_type}
              </SizableText>
            </YStack>
          </XStack>
        </Card>

        <ScrollView
          ref={scrollViewRef}
          flex={1}
          paddingHorizontal="$4"
          paddingTop="$4"
          paddingBottom="$4"
          showsVerticalScrollIndicator={false}
          onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
        >
          {messagesLoading ? (
            <YStack alignItems="center" justifyContent="center" padding="$6">
              <ActivityIndicator size="large" color={colors.accent} />
              <SizableText color={colors.mutedForeground} marginTop="$3">Chargement des messages…</SizableText>
            </YStack>
          ) : enrichedMessages.length === 0 ? (
            <YStack alignItems="center" justifyContent="center" padding="$6" gap="$2">
              <MessageCircle size={48} color={colors.mutedForeground} />
              <SizableText color={colors.mutedForeground} textAlign="center" size="$3">
                Aucun message dans ce groupe
              </SizableText>
              <SizableText color={colors.mutedForeground} textAlign="center" size="$2">
                Soyez le premier à envoyer un message !
              </SizableText>
            </YStack>
          ) : (
            enrichedMessages.map((message: any) => (
              <MessageBubble
                key={message.id}
                message={message}
                isOwn={message.sender === user?.id}
              />
            ))
          )}
        </ScrollView>

        <Card
          backgroundColor={colors.card}
          borderTopColor={colors.border}
          borderTopWidth={1}
          paddingHorizontal="$4"
          paddingVertical="$3"
        >
          <XStack gap="$2" alignItems="center">
            <Input
              value={draft}
              onChangeText={setDraft}
              placeholder="Écrire un message..."
              color={colors.foreground}
              borderColor={colors.border}
              backgroundColor={colors.muted}
              flex={1}
              height={44}
            />
            <Button
              circular
              size="$4"
              backgroundColor={draft.trim() ? colors.accent : colors.secondary}
              color={draft.trim() ? colors.accentForeground : colors.mutedForeground}
              onPress={handleSend}
              disabled={!draft.trim() || sendMutation.isPending}
            >
              <Send size={18} color={draft.trim() ? colors.accentForeground : colors.mutedForeground} />
            </Button>
          </XStack>
        </Card>
      </YStack>
    );
  }

  return (
    <ScrollView flex={1} showsVerticalScrollIndicator={false}>
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
          <H2 color={colors.foreground} fontWeight="800" fontSize={18}>Messagerie</H2>
        </XStack>

        {/* Search */}
        <XStack gap="$2" backgroundColor={colors.card} borderWidth={1} borderColor={colors.border} borderRadius="$3" paddingHorizontal="$3" alignItems="center">
          <Input
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Rechercher une conversation..."
            color={colors.foreground}
            backgroundColor="transparent"
            borderWidth={0}
            flex={1}
          />
        </XStack>

        {/* Filter Pills */}
        <XStack gap="$2">
          <Button flex={1} height={36} backgroundColor={colors.primary} color={colors.primaryForeground} borderRadius="$3" fontSize={12} fontWeight="700">
            Tous
          </Button>
          <Button flex={1} height={36} backgroundColor={colors.card} color={colors.mutedForeground} borderWidth={1} borderColor={colors.border} borderRadius="$3" fontSize={12} fontWeight="700">
            Non lus
          </Button>
          <Button flex={1} height={36} backgroundColor={colors.card} color={colors.mutedForeground} borderWidth={1} borderColor={colors.border} borderRadius="$3" fontSize={12} fontWeight="700">
            Groupes · {groups?.length || 0}
          </Button>
        </XStack>

        {/* Conversation List */}
        <YStack gap="$2">
          {groupsLoading ? (
            <YStack alignItems="center" justifyContent="center" padding="$6">
              <ActivityIndicator size="large" color={colors.accent} />
              <SizableText color={colors.mutedForeground} marginTop="$3">Chargement...</SizableText>
            </YStack>
          ) : filteredGroups.length === 0 ? (
            <YStack alignItems="center" justifyContent="center" padding="$6" gap="$2">
              <MessageCircle size={48} color={colors.mutedForeground} />
              <SizableText color={colors.mutedForeground} textAlign="center" size="$3">
                {searchQuery ? 'Aucun groupe trouvé' : 'Aucune conversation'}
              </SizableText>
            </YStack>
          ) : (
            filteredGroups.map((group: any) => {
              const initials = group.name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase();
              const time = group.last_message_at ? new Date(group.last_message_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : '';
              const snippet = group.last_message || `${group.members?.length || 0} membres`;
              const isGroup = group.group_type === 'CLASS' || group.group_type === 'SUBJECT' || group.group_type === 'ADMIN_ANNOUNCE';
              
              return (
                <XStack 
                  key={group.id} 
                  gap="$3" 
                  alignItems="center" 
                  paddingVertical="$2"
                  borderBottomWidth={1}
                  borderColor={colors.border}
                  onPress={() => { tapFeedback(); setSelectedGroup(group); }}
                >
                  <YStack 
                    width={38} 
                    height={38} 
                    borderRadius="$3" 
                    backgroundColor={isGroup ? colors.primary + '30' : colors.secondary} 
                    borderWidth={1}
                    borderColor={colors.border}
                    alignItems="center" 
                    justifyContent="center"
                  >
                    <SizableText color={isGroup ? colors.primary : colors.foreground} size="$3" fontWeight="800">
                      {isGroup ? group.name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase() : initials}
                    </SizableText>
                  </YStack>
                  <YStack flex={1} minWidth={0}>
                    <XStack justifyContent="space-between" alignItems="center">
                      <SizableText color={colors.foreground} fontWeight="800" size="$3" numberOfLines={1}>{group.name}</SizableText>
                      <SizableText color={colors.mutedForeground} size="$1" fontWeight="600">{time}</SizableText>
                    </XStack>
                    <SizableText color={colors.mutedForeground} size="$2" numberOfLines={1} marginTop="$1">{snippet}</SizableText>
                  </YStack>
                </XStack>
              );
            })
          )}
        </YStack>
      </YStack>

      {/* FAB */}
      <YStack position="absolute" bottom={80} right={20}>
        <Button
          circular
          size="$5"
          backgroundColor={colors.primary}
          color={colors.primaryForeground}
          shadowColor={colors.primary}
          shadowOffset={{ width: 0, height: 4 }}
          shadowOpacity={0.4}
          shadowRadius={12}
          elevation={8}
          onPress={() => {}}
        >
          <SizableText color={colors.primaryForeground} fontSize={20} fontWeight="700">+</SizableText>
        </Button>
      </YStack>
    </ScrollView>
  );
}