from rest_framework import serializers

from .models import ChatGroup, ChatGroupMember, ChatMessage
from users.serializers import UserListSerializer


class ChatMessageSerializer(serializers.ModelSerializer):
    sender_name = serializers.CharField(source='sender.get_full_name', read_only=True)
    mentions_detail = UserListSerializer(source='mentions', many=True, read_only=True)

    class Meta:
        model = ChatMessage
        fields = [
            'id', 'group', 'sender', 'sender_name', 'content', 'attachment',
            'mentions', 'mentions_detail', 'is_deleted', 'deleted_by', 'created_at',
        ]
        read_only_fields = ['id', 'sender', 'is_deleted', 'deleted_by', 'created_at']


class ChatGroupMemberSerializer(serializers.ModelSerializer):
    user_detail = UserListSerializer(source='user', read_only=True)

    class Meta:
        model = ChatGroupMember
        fields = ['id', 'user', 'user_detail', 'is_admin', 'joined_at']
        read_only_fields = ['id', 'joined_at']


class ChatGroupSerializer(serializers.ModelSerializer):
    members_detail = serializers.SerializerMethodField()
    last_message = serializers.SerializerMethodField()
    member_count = serializers.SerializerMethodField()

    class Meta:
        model = ChatGroup
        fields = [
            'id', 'name', 'group_type', 'classe', 'matiere', 'is_readonly',
            'members_detail', 'last_message', 'member_count', 'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

    def get_members_detail(self, obj):
        members = obj.chatgroupmember_set.select_related('user').all()
        return ChatGroupMemberSerializer(members, many=True).data

    def get_last_message(self, obj):
        last = obj.messages.filter(is_deleted=False).order_by('-created_at').first()
        return ChatMessageSerializer(last).data if last else None

    def get_member_count(self, obj):
        return obj.chatgroupmember_set.count()
