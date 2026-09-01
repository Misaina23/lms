from django.urls import reverse
from rest_framework.test import APITestCase
from rest_framework.authtoken.models import Token
from users.models import CustomUser
from classes.models import Classe
from etudiants.models import Etudiant
from .models import Absence


class AbsenceViewSetTests(APITestCase):
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
        cls.professeur = CustomUser.objects.create_user(
            username='prof',
            email='prof@lycee.com',
            password='profpass',
            first_name='Jean',
            last_name='Dupont',
            matricule='PRF001',
            role=CustomUser.Role.PROFESSEUR,
        )
        cls.classe = Classe.objects.create(nom='6eme A', niveau=Classe.Niveau.SECONDAIRE_GENERAL, capacite=40)
        cls.eleve_user = CustomUser.objects.create_user(
            username='eleve',
            email='eleve@lycee.com',
            password='elevepass',
            first_name='Marie',
            last_name='Durand',
            matricule='ELV001',
            role=CustomUser.Role.ELEVE,
        )
        cls.etudiant = Etudiant.objects.create(
            user=cls.eleve_user,
            classe=cls.classe,
            date_inscription='2024-09-01',
            actif=True,
        )
        cls.absence = Absence.objects.create(
            etudiant=cls.etudiant,
            professeur=cls.professeur,
            date_absence='2024-10-01',
            heure_debut='08:00:00',
            heure_fin='10:00:00',
            motif='Maladie',
            justifiee=True,
        )

    def setUp(self):
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {self.admin_user.auth_token.key}')

    def test_list_absences(self):
        url = reverse('absence-list')
        response = self.client.get(url)
        self.assertEqual(response.status_code, 200)
        self.assertGreaterEqual(len(response.data['results']), 1)

    def test_create_absence(self):
        url = reverse('absence-list')
        data = {
            'etudiant': self.etudiant.id,
            'professeur': self.professeur.id,
            'date_absence': '2024-10-02',
            'heure_debut': '08:00:00',
            'heure_fin': '10:00:00',
            'motif': 'RDV médical',
            'justifiee': True,
        }
        response = self.client.post(url, data)
        self.assertEqual(response.status_code, 201)
        self.assertEqual(Absence.objects.count(), 2)

    def test_retrieve_absence(self):
        url = reverse('absence-detail', args=[self.absence.id])
        response = self.client.get(url)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['motif'], 'Maladie')
