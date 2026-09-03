from django.contrib import admin

from .models import ChatGroup, ChatGroupMember, ChatMessage


@admin.register(ChatGroup)
class ChatGroupAdmin(admin.ModelAdmin):
    list_display = ('name', 'group_type', 'classe', 'matiere', 'is_readonly', 'updated_at')
    list_filter = ('group_type', 'is_readonly')


@admin.register(ChatMessage)
class ChatMessageAdmin(admin.ModelAdmin):
    list_display = ('group', 'sender', 'is_deleted', 'created_at')
    list_filter = ('group', 'is_deleted')
    search_fields = ('content', 'sender__email')
