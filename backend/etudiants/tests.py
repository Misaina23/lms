from django.urls import reverse
from rest_framework.test import APITestCase
from rest_framework.authtoken.models import Token
from users.models import CustomUser
from classes.models import Classe
from .models import Etudiant


class EtudiantViewSetTests(APITestCase):
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
        cls.classe = Classe.objects.create(
            nom='6eme A',
            niveau=Classe.Niveau.SECONDAIRE_GENERAL,
            capacite=40,
        )
        cls.etudiant = Etudiant.objects.create(
            matricule='ELV001',
            first_name='Marie',
            last_name='Dupont',
            classe=cls.classe,
            date_inscription='2024-09-01',
            actif=True,
        )

    def setUp(self):
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {self.admin_user.auth_token.key}')

    def test_list_etudiants(self):
        url = reverse('etudiant-list')
        response = self.client.get(url)
        self.assertEqual(response.status_code, 200)
        self.assertGreaterEqual(len(response.data['results']), 1)

    def test_create_etudiant(self):
        url = reverse('etudiant-list')
        data = {
            'matricule': 'ELV002',
            'first_name': 'Pierre',
            'last_name': 'Martin',
            'classe': self.classe.id,
            'date_inscription': '2024-09-01',
            'actif': True,
        }
        response = self.client.post(url, data)
        self.assertEqual(response.status_code, 201)
        self.assertEqual(Etudiant.objects.count(), 2)

    def test_retrieve_etudiant(self):
        url = reverse('etudiant-detail', args=[self.etudiant.id])
        response = self.client.get(url)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['actif'], True)
