from rest_framework import viewsets, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from users.permissions import IsAdminOrReadOnly, IsAdminOnly, CanViewSchedule
from users.models import CustomUser
from django.db.models import Sum
import datetime

from matieres.models import Matiere
from .models import Classe, Room, TeacherAssignment, MatiereCoefficient, SchoolConfig
from .serializers import (
    ClasseSerializer, RoomSerializer, TeacherAssignmentSerializer,
    MatiereCoefficientSerializer, SchoolConfigSerializer, TeacherSummarySerializer,
)
from budget.models import BudgetItem, BudgetCategory, BudgetSummary


class ClasseViewSet(viewsets.ModelViewSet):
    queryset = Classe.objects.all().order_by('niveau', 'nom')
    serializer_class = ClasseSerializer
    permission_classes = [CanViewSchedule]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['niveau', 'stream', 'academic_year', 'capacite']

    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [IsAdminOnly()]
        return super().get_permissions()

    @action(detail=False, methods=['get'], url_path='coverage', permission_classes=[permissions.AllowAny])
    def coverage(self, request):
        academic_year = request.query_params.get('academic_year') or '2024-2025'
        classes = self.get_queryset().filter(academic_year=academic_year) if academic_year else self.get_queryset()
        missing_subjects = []
        all_matieres = list(Matiere.objects.all().order_by('nom'))

        for classe in classes:
            current_year = classe.academic_year or academic_year
            assigned_subject_ids = set(
                TeacherAssignment.objects.filter(classe=classe, academic_year=current_year).values_list('matiere_id', flat=True)
            )

            for matiere in all_matieres:
                if matiere.id in assigned_subject_ids:
                    continue

                teacher_candidates = CustomUser.objects.filter(
                    role=CustomUser.Role.PROFESSEUR,
                    status=CustomUser.Status.ACTIVE,
                    is_active=True,
                ).select_related('matiere').order_by('matiere__nom', 'last_name', 'first_name')

                teacher_suggestions = []
                for teacher in teacher_candidates:
                    teacher_assignment_count = TeacherAssignment.objects.filter(
                        professeur=teacher,
                        academic_year=current_year,
                    ).count()
                    is_primary_match = teacher.matiere_id == matiere.id
                    priority_score = 100 if is_primary_match else 55
                    priority_score += 10 if teacher.teacher_type == CustomUser.TeacherType.FONCTIONNAIRE else 5
                    priority_score -= min(teacher_assignment_count * 5, 30)
                    if teacher.matiere_id is None:
                        priority_score -= 10

                    teacher_suggestions.append({
                        'id': teacher.id,
                        'matricule': teacher.matricule,
                        'first_name': teacher.first_name,
                        'last_name': teacher.last_name,
                        'email': teacher.email,
                        'matiere': {
                            'id': teacher.matiere.id if teacher.matiere else None,
                            'nom': teacher.matiere.nom if teacher.matiere else '—',
                            'code': teacher.matiere.code if teacher.matiere else None,
                        },
                        'is_primary_match': is_primary_match,
                        'priority_score': priority_score,
                        'assigned_courses_count': teacher_assignment_count,
                    })

                teacher_suggestions.sort(key=lambda item: (-item['priority_score'], item['last_name'], item['first_name']))

                missing_subjects.append({
                    'classe': {
                        'id': classe.id,
                        'nom': classe.nom,
                        'niveau': classe.niveau,
                        'stream': classe.stream,
                    },
                    'matiere': {
                        'id': matiere.id,
                        'nom': matiere.nom,
                        'code': matiere.code,
                    },
                    'academic_year': current_year,
                    'suggested_teachers': teacher_suggestions,
                    'teachers': teacher_suggestions,
                })

        return Response({
            'count': len(missing_subjects),
            'missing_subjects': missing_subjects,
        })

    @action(detail=False, methods=['get'], url_path='coverage-alerts', permission_classes=[permissions.AllowAny])
    def coverage_alerts(self, request):
        coverage = self.coverage(request).data
        alerts = []

        for item in coverage.get('missing_subjects', []):
            recommended = item.get('suggested_teachers', [])
            if not recommended:
                severity = 'critical'
                recommended_action = 'Recruter ou affecter un enseignant disponible immédiatement.'
            else:
                best_match = recommended[0]
                if best_match.get('is_primary_match'):
                    severity = 'high'
                    recommended_action = 'Affecter immédiatement le meilleur enseignant principal compatible.'
                else:
                    severity = 'medium'
                    recommended_action = 'Mettre en place une aide enseignante ou un remplaçant prioritaire.'

            alerts.append({
                'classe': item['classe'],
                'matiere': item['matiere'],
                'academic_year': item['academic_year'],
                'severity': severity,
                'recommended_action': recommended_action,
                'best_match': recommended[0] if recommended else None,
                'suggester_count': len(recommended),
            })

        alerts.sort(key=lambda alert: {'critical': 0, 'high': 1, 'medium': 2}.get(alert['severity'], 3))
        return Response({
            'count': len(alerts),
            'alerts': alerts,
        })


class RoomViewSet(viewsets.ModelViewSet):
    queryset = Room.objects.all()
    serializer_class = RoomSerializer
    permission_classes = [IsAdminOnly]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['batiment']


class TeacherAssignmentViewSet(viewsets.ModelViewSet):
    queryset = TeacherAssignment.objects.select_related('professeur', 'classe', 'matiere').all()
    serializer_class = TeacherAssignmentSerializer
    permission_classes = [IsAdminOrReadOnly]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['professeur', 'classe', 'matiere', 'academic_year', 'is_main_teacher', 'is_substitute']

    def perform_create(self, serializer):
        assignment = serializer.save()
        self._create_salary_budget_item(assignment)

    def perform_update(self, serializer):
        assignment = serializer.save()
        self._create_salary_budget_item(assignment)

    def _create_salary_budget_item(self, assignment):
        teacher = assignment.professeur
        if teacher.teacher_type == CustomUser.TeacherType.SUPPLEANT and teacher.base_salary:
            category = BudgetCategory.objects.filter(
                name='Paiement enseignants non-fonctionnaires',
                category_type=BudgetCategory.CategoryType.EXPENSE
            ).first()
            if category:
                BudgetItem.objects.get_or_create(
                    related_teacher_assignment=assignment,
                    item_type=BudgetItem.ItemType.EXPENSE,
                    expense_type=BudgetItem.ExpenseType.TEACHER_NON_PERM,
                    defaults={
                        'category': category,
                        'academic_year': assignment.academic_year,
                        'date': datetime.date.today(),
                        'amount': teacher.base_salary,
                        'devise': 'MGA',
                        'description': f"Salaire {teacher.get_full_name()} - {assignment.classe.nom} / {assignment.matiere.nom}",
                        'designation': f"Salaire enseignant non-fonctionnaire",
                        'expense_type': BudgetItem.ExpenseType.TEACHER_NON_PERM,
                        'created_by': self.request.user if hasattr(self, 'request') else None,
                    }
                )


class MatiereCoefficientViewSet(viewsets.ModelViewSet):
    queryset = MatiereCoefficient.objects.select_related('matiere').all()
    serializer_class = MatiereCoefficientSerializer
    permission_classes = [IsAdminOrReadOnly]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['matiere', 'niveau', 'stream']


class SchoolConfigViewSet(viewsets.ModelViewSet):
    queryset = SchoolConfig.objects.all()
    serializer_class = SchoolConfigSerializer
    permission_classes = [IsAdminOnly]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['active', 'academic_year']