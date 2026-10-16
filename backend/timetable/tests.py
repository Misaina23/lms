from django.urls import reverse
from rest_framework.authtoken.models import Token
from rest_framework.test import APITestCase

from classes.models import Classe
from classes.models import TeacherAssignment
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

    def test_generation_options_only_include_active_assignments_for_selected_year(self):
        TeacherAssignment.objects.create(
            professeur=self.teacher_one,
            classe=self.classe_one,
            matiere=self.maths,
            academic_year='2026-2027',
        )
        TeacherAssignment.objects.create(
            professeur=self.teacher_two,
            classe=self.classe_two,
            matiere=self.francais,
            academic_year='2025-2026',
        )

        response = self.client.get(
            reverse('timetable-generation-options'),
            {'academic_year': '2026-2027'},
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['classes'], [{
            'id': self.classe_one.id,
            'name': self.classe_one.nom,
        }, {
            'id': self.classe_two.id,
            'name': self.classe_two.nom,
        }])
        self.assertEqual(len(response.data['assignments']), 1)
        self.assertEqual(response.data['assignments'][0]['teacher_id'], self.teacher_one.id)

    def test_only_admin_can_request_generation_options_or_create_a_plan(self):
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {Token.objects.create(user=self.teacher_one).key}')

        options = self.client.get(
            reverse('timetable-generation-options'),
            {'academic_year': '2026-2027'},
        )
        generated = self.client.post(reverse('timetable-generate'), {
            'academic_year': '2026-2027',
            'sessions': [{
                'class_id': self.classe_one.id,
                'subject_id': self.maths.id,
                'weekly_sessions': 1,
            }],
        }, format='json')

        self.assertEqual(options.status_code, 403)
        self.assertEqual(generated.status_code, 403)

    def test_generator_returns_distributed_preview_without_persisting(self):
        TeacherAssignment.objects.create(
            professeur=self.teacher_one,
            classe=self.classe_one,
            matiere=self.maths,
            academic_year='2026-2027',
        )

        response = self.client.post(reverse('timetable-generate'), {
            'academic_year': '2026-2027',
            'sessions': [{
                'class_id': self.classe_one.id,
                'subject_id': self.maths.id,
                'weekly_sessions': 3,
            }],
        }, format='json')

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['lesson_duration_minutes'], 60)
        self.assertEqual(len(response.data['slots']), 3)
        self.assertEqual(
            len({slot['day_of_week'] for slot in response.data['slots']}),
            3,
        )
        self.assertTrue(all(slot['professeur'] == self.teacher_one.id for slot in response.data['slots']))
        self.assertEqual(TimetableSlot.objects.count(), 0)

    def test_generator_rejects_missing_assignment_and_invalid_session_volume(self):
        no_assignment = self.client.post(reverse('timetable-generate'), {
            'academic_year': '2026-2027',
            'sessions': [{
                'class_id': self.classe_one.id,
                'subject_id': self.maths.id,
                'weekly_sessions': 2,
            }],
        }, format='json')
        self.assertEqual(no_assignment.status_code, 400)
        self.assertIn('enseignant actif', no_assignment.data['detail'])

        invalid_volume = self.client.post(reverse('timetable-generate'), {
            'academic_year': '2026-2027',
            'sessions': [{
                'class_id': self.classe_one.id,
                'subject_id': self.maths.id,
                'weekly_sessions': 0,
            }],
        }, format='json')
        self.assertEqual(invalid_volume.status_code, 400)
        self.assertIn('sessions', invalid_volume.data)

        excessive_volume = self.client.post(reverse('timetable-generate'), {
            'academic_year': '2026-2027',
            'sessions': [{
                'class_id': self.classe_one.id,
                'subject_id': self.maths.id,
                'weekly_sessions': 7,
            }],
        }, format='json')
        self.assertEqual(excessive_volume.status_code, 400)

    def test_apply_saves_generated_plan_and_rejects_conflicting_batch(self):
        TeacherAssignment.objects.create(
            professeur=self.teacher_one,
            classe=self.classe_one,
            matiere=self.maths,
            academic_year='2026-2027',
        )
        preview = self.client.post(reverse('timetable-generate'), {
            'academic_year': '2026-2027',
            'sessions': [{
                'class_id': self.classe_one.id,
                'subject_id': self.maths.id,
                'weekly_sessions': 2,
            }],
        }, format='json')
        unauthorized_teacher_plan = self.client.post(reverse('timetable-generate-apply'), {
            'academic_year': '2026-2027',
            'slots': [{**preview.data['slots'][0], 'professeur': self.teacher_two.id}],
        }, format='json')
        self.assertEqual(unauthorized_teacher_plan.status_code, 400)
        self.assertEqual(TimetableSlot.objects.count(), 0)

        applied = self.client.post(reverse('timetable-generate-apply'), {
            'academic_year': '2026-2027',
            'slots': preview.data['slots'],
        }, format='json')

        self.assertEqual(applied.status_code, 201)
        self.assertEqual(len(applied.data), 2)
        self.assertEqual(TimetableSlot.objects.count(), 2)

        conflicting_slots = [
            {
                'classe': self.classe_one.id,
                'matiere': self.maths.id,
                'professeur': self.teacher_one.id,
                'day_of_week': 4,
                'start_hour': '08:00',
                'end_hour': '09:00',
                'room': '',
            },
            {
                'classe': self.classe_one.id,
                'matiere': self.maths.id,
                'professeur': self.teacher_one.id,
                'day_of_week': 4,
                'start_hour': '08:30',
                'end_hour': '09:30',
                'room': '',
            },
        ]
        conflict_response = self.client.post(reverse('timetable-generate-apply'), {
            'academic_year': '2026-2027',
            'slots': conflicting_slots,
        }, format='json')

        self.assertEqual(conflict_response.status_code, 400)
        self.assertEqual(TimetableSlot.objects.count(), 2)
