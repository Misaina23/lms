from django.urls import reverse
from rest_framework.test import APITestCase
from rest_framework.authtoken.models import Token
from users.models import CustomUser
from classes.models import Classe, TeacherAssignment
from etudiants.models import Etudiant
from matieres.models import Matiere
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
        cls.etudiant = Etudiant.objects.create(
            matricule='ELV001',
            first_name='Marie',
            last_name='Durand',
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

    def test_admin_can_scan_student_qr_for_attendance(self):
        url = reverse('absence-scan')
        payload = {
            'matricule': self.etudiant.matricule,
            'date_absence': '2026-10-06',
            'heure_debut': '10:00:00',
            'heure_fin': '12:00:00',
        }

        response = self.client.post(url, payload)

        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.data['statut'], Absence.Status.PRESENT)
        self.assertIsNotNone(response.data['recorded_at'])

    def test_scan_rejects_duplicate_student_for_same_class_period(self):
        url = reverse('absence-scan')
        payload = {
            'matricule': self.etudiant.matricule,
            'date_absence': '2026-10-06',
            'heure_debut': '10:00:00',
            'heure_fin': '12:00:00',
        }

        self.assertEqual(self.client.post(url, payload).status_code, 201)
        duplicate_response = self.client.post(url, payload)

        self.assertEqual(duplicate_response.status_code, 409)

    def test_secretariat_cannot_record_attendance_by_qr(self):
        secretary = CustomUser.objects.create_user(
            username='secretariat-attendance',
            email='secretariat-attendance@lycee.com',
            password='secretariatpass',
            first_name='Marie',
            last_name='Secretaire',
            matricule='SECATT001',
            role=CustomUser.Role.SECRETARIAT,
        )
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {Token.objects.create(user=secretary).key}')

        response = self.client.post(reverse('absence-scan'), {
            'matricule': self.etudiant.matricule,
            'date_absence': '2026-10-06',
            'heure_debut': '10:00:00',
            'heure_fin': '12:00:00',
        })

        self.assertEqual(response.status_code, 403)

    def test_teacher_can_scan_only_students_in_assigned_classes(self):
        matiere = Matiere.objects.create(nom='Mathématiques', code='MATH')
        TeacherAssignment.objects.create(
            professeur=self.professeur,
            classe=self.classe,
            matiere=matiere,
            academic_year='2026-2027',
        )
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {Token.objects.create(user=self.professeur).key}')
        payload = {
            'matricule': self.etudiant.matricule,
            'date_absence': '2026-10-06',
            'heure_debut': '13:00:00',
            'heure_fin': '14:00:00',
        }

        response = self.client.post(reverse('absence-scan'), payload)

        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.data['professeur'], self.professeur.id)

    def test_teacher_cannot_create_attendance_for_unassigned_class(self):
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {Token.objects.create(user=self.professeur).key}')

        response = self.client.post(reverse('absence-list'), {
            'etudiant': self.etudiant.id,
            'date_absence': '2026-10-06',
            'heure_debut': '15:00:00',
            'heure_fin': '16:00:00',
            'statut': 'PRESENT',
        }, format='json')

        self.assertEqual(response.status_code, 400)
