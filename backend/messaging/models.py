import uuid
from django.db import models
from users.models import CustomUser
from classes.models import Classe
from matieres.models import Matiere


class ChatGroup(models.Model):
    class GroupType(models.TextChoices):
        PRIVATE = 'PRIVATE', 'Privé (prof ↔ prof)'
        SUBJECT = 'SUBJECT', 'Groupe de matière'
        CLASS = 'CLASS', 'Groupe de classe'
        ADMIN_ANNOUNCE = 'ADMIN_ANNOUNCE', 'Annonces Admin (lecture seule)'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=150)
    group_type = models.CharField(max_length=20, choices=GroupType.choices)
    classe = models.ForeignKey(Classe, on_delete=models.CASCADE, null=True, blank=True, related_name='chat_groups')
    matiere = models.ForeignKey(Matiere, on_delete=models.CASCADE, null=True, blank=True, related_name='chat_groups')
    members = models.ManyToManyField(
        CustomUser,
        through='ChatGroupMember',
        related_name='chat_groups',
    )
    is_readonly = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-updated_at']

    def __str__(self):
        return f"{self.name} ({self.get_group_type_display()})"


class ChatGroupMember(models.Model):
    group = models.ForeignKey(ChatGroup, on_delete=models.CASCADE)
    user = models.ForeignKey(CustomUser, on_delete=models.CASCADE)
    is_admin = models.BooleanField(default=False)
    joined_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ['group', 'user']

    def __str__(self):
        return f"{self.user.get_full_name()} in {self.group.name}"


class ChatMessage(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    group = models.ForeignKey(ChatGroup, on_delete=models.CASCADE, related_name='messages')
    sender = models.ForeignKey(CustomUser, on_delete=models.SET_NULL, null=True, related_name='chat_messages')
    content = models.TextField()
    attachment = models.FileField(upload_to='chat/', null=True, blank=True)
    mentions = models.ManyToManyField(CustomUser, blank=True, related_name='mentions')
    is_deleted = models.BooleanField(default=False)
    deleted_by = models.ForeignKey(
        CustomUser, on_delete=models.SET_NULL, null=True, blank=True, related_name='chat_messages_deleted'
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['created_at']

    def __str__(self):
        sender = self.sender.get_full_name() if self.sender else 'Inconnu'
        preview = self.content[:50] + ('…' if len(self.content) > 50 else '')
        return f"{sender} → {self.group.name}: {preview}"
