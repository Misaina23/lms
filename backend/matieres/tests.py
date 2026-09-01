from django.urls import reverse
from rest_framework.test import APITestCase
from rest_framework.authtoken.models import Token
from users.models import CustomUser
from .models import Matiere


class MatiereViewSetTests(APITestCase):
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
        cls.matiere = Matiere.objects.create(nom='Mathématiques', code='MATH')

    def setUp(self):
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {self.admin_user.auth_token.key}')

    def test_list_matieres(self):
        url = reverse('matiere-list')
        response = self.client.get(url)
        self.assertEqual(response.status_code, 200)
        self.assertGreaterEqual(len(response.data['results']), 1)

    def test_create_matiere(self):
        url = reverse('matiere-list')
        data = {'nom': 'Physique', 'code': 'PHYS', 'description': 'Cours de physique'}
        response = self.client.post(url, data)
        self.assertEqual(response.status_code, 201)
        self.assertEqual(Matiere.objects.count(), 2)

    def test_retrieve_matiere(self):
        url = reverse('matiere-detail', args=[self.matiere.id])
        response = self.client.get(url)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['code'], 'MATH')
