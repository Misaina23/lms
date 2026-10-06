from django.urls import reverse
from rest_framework.authtoken.models import Token
from rest_framework.test import APITestCase

from users.models import CustomUser
from .models import ChatGroup, ChatGroupMember, ChatMessage


class ChatWorkflowTests(APITestCase):
    @classmethod
    def setUpTestData(cls):
        cls.teacher = CustomUser.objects.create_user(
            username='teacher',
            email='teacher@lycee.com',
            password='teacherpass',
            first_name='Jean',
            last_name='Professeur',
            matricule='CHATPROF',
            role=CustomUser.Role.PROFESSEUR,
        )
        cls.secretary = CustomUser.objects.create_user(
            username='secretary',
            email='secretary@lycee.com',
            password='secretarypass',
            first_name='Marie',
            last_name='Secretaire',
            matricule='CHATSEC',
            role=CustomUser.Role.SECRETARIAT,
        )
        cls.other_staff = CustomUser.objects.create_user(
            username='other',
            email='other@lycee.com',
            password='otherpass',
            first_name='Paul',
            last_name='Surveillant',
            matricule='CHATOTHER',
            role=CustomUser.Role.SURVEILLANT,
        )
        cls.pending = CustomUser.objects.create_user(
            username='pending',
            email='pending@lycee.com',
            password='pendingpass',
            first_name='Aina',
            last_name='EnAttente',
            matricule='CHATPENDING',
            role=CustomUser.Role.PROFESSEUR,
            status=CustomUser.Status.PENDING_VERIFICATION,
            is_active=False,
        )

    def authenticate_as(self, user):
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {Token.objects.get_or_create(user=user)[0].key}')

    def test_staff_can_start_direct_chat_and_exchange_messages(self):
        self.authenticate_as(self.teacher)

        response = self.client.post(reverse('chat-group-direct'), {'recipient': self.secretary.id})

        self.assertEqual(response.status_code, 201)
        group = ChatGroup.objects.get(id=response.data['id'])
        self.assertEqual(group.members.count(), 2)
        sent = self.client.post(reverse('chat-group-send', args=[group.id]), {'content': 'Bonjour'}, format='json')
        self.assertEqual(sent.status_code, 201, sent.data)
        self.assertEqual(ChatMessage.objects.get(group=group).content, 'Bonjour')

    def test_pending_account_cannot_be_added_to_a_direct_chat(self):
        self.authenticate_as(self.teacher)

        response = self.client.post(reverse('chat-group-direct'), {'recipient': self.pending.id})

        self.assertEqual(response.status_code, 400)
        self.assertEqual(ChatGroup.objects.count(), 0)

    def test_non_member_cannot_read_group_messages(self):
        group = ChatGroup.objects.create(name='Équipe', group_type=ChatGroup.GroupType.PRIVATE)
        ChatGroupMember.objects.create(group=group, user=self.teacher, is_admin=True)
        self.authenticate_as(self.other_staff)

        response = self.client.get(reverse('chat-group-messages', args=[group.id]))

        self.assertEqual(response.status_code, 404)
