from django.db.models import Q
from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response

from .models import ChatGroup, ChatGroupMember, ChatMessage
from .serializers import ChatGroupSerializer, ChatMessageSerializer, ChatGroupMemberSerializer
from users.permissions import CanParticipateInChat, IsAdminOnly


class ChatGroupViewSet(viewsets.ModelViewSet):
    serializer_class = ChatGroupSerializer
    permission_classes = [CanParticipateInChat]

    def get_queryset(self):
        user = self.request.user
        if user.role == 'ADMIN':
            return ChatGroup.objects.all()
        return ChatGroup.objects.filter(members=user)

    def perform_create(self, serializer):
        group = serializer.save()
        ChatGroupMember.objects.get_or_create(group=group, user=self.request.user, defaults={'is_admin': True})

    @action(detail=True, methods=['get'])
    def messages(self, request, pk=None):
        group = self.get_object()
        qs = group.messages.filter(is_deleted=False).select_related('sender').prefetch_related('mentions')
        return Response(ChatMessageSerializer(qs, many=True).data)

    @action(detail=True, methods=['post'])
    def send(self, request, pk=None):
        group = self.get_object()
        if group.is_readonly and request.user.role != 'ADMIN':
            return Response({'detail': 'Ce canal est en lecture seule.'}, status=status.HTTP_403_FORBIDDEN)
        if not group.chatgroupmember_set.filter(user=request.user).exists():
            return Response({'detail': 'Vous n\'êtes pas membre de ce groupe.'}, status=status.HTTP_403_FORBIDDEN)
        serializer = ChatMessageSerializer(data={**request.data, 'group': group.id, 'sender': request.user.id})
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['post'], url_path='add-member')
    def add_member(self, request, pk=None):
        group = self.get_object()
        if request.user.role != 'ADMIN' and not group.chatgroupmember_set.filter(user=request.user, is_admin=True).exists():
            return Response({'detail': 'Réservé aux admins du groupe.'}, status=status.HTTP_403_FORBIDDEN)
        user_id = request.data.get('user_id')
        if not user_id:
            return Response({'detail': 'user_id requis.'}, status=status.HTTP_400_BAD_REQUEST)
        ChatGroupMember.objects.get_or_create(group=group, user_id=user_id)
        return Response({'detail': 'Membre ajouté.'})


class ChatMessageViewSet(viewsets.ModelViewSet):
    serializer_class = ChatMessageSerializer
    permission_classes = [CanParticipateInChat]

    def get_queryset(self):
        user = self.request.user
        if user.role == 'ADMIN':
            return ChatMessage.objects.all()
        return ChatMessage.objects.filter(group__members=user)

    @action(detail=True, methods=['post'], permission_classes=[IsAdminOnly])
    def moderate(self, request, pk=None):
        message = self.get_object()
        message.is_deleted = True
        message.deleted_by = request.user
        message.save()
        return Response({'detail': 'Message supprimé.'})