from django.urls import reverse
from rest_framework.authtoken.models import Token
from rest_framework.test import APITestCase

from classes.models import Classe
from matieres.models import Matiere
from users.models import CustomUser
from .models import TimetableSlot


class TimetableConflictTests(APITestCase):
    @classmethod
    def setUpTestData(cls):
        cls.admin = CustomUser.objects.create_user(
            username='schedule-admin',
            email='schedule-admin@lycee.com',
            password='StrongPassword123!',
            first_name='Schedule',
            last_name='Admin',
            matricule='SCHADM01',
            role=CustomUser.Role.ADMIN,
        )
        cls.teacher_one = CustomUser.objects.create_user(
            username='schedule-teacher-one',
            email='schedule-teacher-one@lycee.com',
            password='StrongPassword123!',
            first_name='Teacher',
            last_name='One',
            matricule='SCHTCH01',
            role=CustomUser.Role.PROFESSEUR,
        )
        cls.teacher_two = CustomUser.objects.create_user(
            username='schedule-teacher-two',
            email='schedule-teacher-two@lycee.com',
            password='StrongPassword123!',
            first_name='Teacher',
            last_name='Two',
            matricule='SCHTCH02',
            role=CustomUser.Role.PROFESSEUR,
        )
        cls.classe_one = Classe.objects.create(
            nom='Classe A',
            niveau=Classe.Niveau.SECONDAIRE_GENERAL,
            academic_year='2026-2027',
            capacite=30,
        )
        cls.classe_two = Classe.objects.create(
            nom='Classe B',
            niveau=Classe.Niveau.SECONDAIRE_GENERAL,
            academic_year='2026-2027',
            capacite=30,
        )
        cls.maths = Matiere.objects.create(code='MATH', nom='Mathématiques')
        cls.francais = Matiere.objects.create(code='FR', nom='Français')
        cls.token = Token.objects.create(user=cls.admin)

    def setUp(self):
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {self.token.key}')

    def create_slot(
        self,
        *,
        classe=None,
        professeur=None,
        room='',
        start_hour='08:00',
        end_hour='09:00',
        matiere=None,
        academic_year='2026-2027',
    ):
        return TimetableSlot.objects.create(
            classe=classe or self.classe_one,
            matiere=matiere or self.maths,
            professeur=professeur,
            day_of_week=0,
            start_hour=start_hour,
            end_hour=end_hour,
            room=room,
            academic_year=academic_year,
        )

    def post_slot(self, **overrides):
        payload = {
            'classe': self.classe_one.id,
            'matiere': self.maths.id,
            'professeur': self.teacher_one.id,
            'day_of_week': 0,
            'start_hour': '08:00',
            'end_hour': '09:00',
            'room': 'A1',
            'academic_year': '2026-2027',
        }
        payload.update(overrides)
        return self.client.post(reverse('timetable-list'), payload, format='json')

    def test_allows_overlapping_slots_with_distinct_resources(self):
        self.create_slot(
            classe=self.classe_one,
            professeur=self.teacher_one,
            room='A1',
        )

        response = self.post_slot(
            classe=self.classe_two.id,
            professeur=self.teacher_two.id,
            room='B2',
            matiere=self.francais.id,
        )

        self.assertEqual(response.status_code, 201)

    def test_rejects_overlap_for_same_class_even_with_different_teacher_and_room(self):
        self.create_slot(classe=self.classe_one, professeur=self.teacher_one, room='A1')

        response = self.post_slot(professeur=self.teacher_two.id, room='B2')

        self.assertEqual(response.status_code, 400)
        self.assertIn('classe', str(response.data).lower())

    def test_rejects_overlap_for_same_teacher_across_classes(self):
        self.create_slot(classe=self.classe_one, professeur=self.teacher_one, room='A1')

        response = self.post_slot(
            classe=self.classe_two.id,
            professeur=self.teacher_one.id,
            room='B2',
        )

        self.assertEqual(response.status_code, 400)
        self.assertIn('professeur', str(response.data).lower())

    def test_rejects_overlap_for_same_room_case_insensitively(self):
        self.create_slot(classe=self.classe_one, professeur=self.teacher_one, room='Salle A')

        response = self.post_slot(
            classe=self.classe_two.id,
            professeur=self.teacher_two.id,
            room='salle a',
        )

        self.assertEqual(response.status_code, 400)
        self.assertIn('salle', str(response.data).lower())

    def test_allows_adjacent_slots_for_same_resources(self):
        self.create_slot(
            classe=self.classe_one,
            professeur=self.teacher_one,
            room='A1',
            start_hour='08:00',
            end_hour='09:00',
        )

        response = self.post_slot(start_hour='09:00', end_hour='10:00')

        self.assertEqual(response.status_code, 201)

    def test_rejects_end_time_not_after_start_time(self):
        response = self.post_slot(start_hour='09:00', end_hour='09:00')

        self.assertEqual(response.status_code, 400)
        self.assertIn('end_hour', response.data)

    def test_conflicts_endpoint_reports_each_pair_once(self):
        self.create_slot(classe=self.classe_one, professeur=self.teacher_one, room='A1')
        self.create_slot(
            classe=self.classe_two,
            professeur=self.teacher_one,
            room='B2',
            matiere=self.francais,
        )

        response = self.client.get(reverse('timetable-conflicts'), {'academic_year': '2026-2027'})

        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data['conflicts']), 1)
        self.assertEqual(len(response.data['conflicts'][0]['slots']), 2)
