from rest_framework import viewsets
from django_filters.rest_framework import DjangoFilterBackend
from users.permissions import IsAdminOrReadOnly, IsAdminOnly, CanViewSchedule
from users.models import CustomUser
from django.db.models import Sum
import datetime

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
    filterset_fields = ['professeur', 'classe', 'matiere', 'academic_year', 'is_main_teacher']

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