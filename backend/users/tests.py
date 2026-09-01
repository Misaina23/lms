from django.urls import reverse
from rest_framework.test import APITestCase
from rest_framework.authtoken.models import Token
from .models import CustomUser


class CustomUserViewSetTests(APITestCase):
    @classmethod
    def setUpTestData(cls):
        cls.admin_user = CustomUser.objects.create_user(
            username='admin',
            email='admin@lycee.com',
            password='adminpass',
            first_name='Admin',
            last_name='User',
            matricule='ADM001',
            role=CustomUser.Role.ADMIN,
        )
        Token.objects.create(user=cls.admin_user)

    def setUp(self):
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {self.admin_user.auth_token.key}')

    def test_list_users(self):
        url = reverse('user-list')
        response = self.client.get(url)
        self.assertEqual(response.status_code, 200)
        self.assertGreaterEqual(len(response.data['results']), 1)

    def test_create_user(self):
        url = reverse('user-list')
        data = {
            'username': 'prof1',
            'matricule': 'PRF001',
            'first_name': 'Jean',
            'last_name': 'Dupont',
            'email': 'jean@lycee.com',
            'role': CustomUser.Role.PROFESSEUR,
        }
        response = self.client.post(url, data)
        self.assertEqual(response.status_code, 201)
        self.assertEqual(CustomUser.objects.count(), 2)

    def test_retrieve_user(self):
        url = reverse('user-detail', args=[self.admin_user.id])
        response = self.client.get(url)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['email'], 'admin@lycee.com')
