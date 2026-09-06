from rest_framework import serializers
from .models import BudgetCategory, BudgetItem, BudgetSummary, BudgetReport
from users.serializers import UserListSerializer


class BudgetCategorySerializer(serializers.ModelSerializer):
    items_count = serializers.SerializerMethodField()

    class Meta:
        model = BudgetCategory
        fields = ['id', 'name', 'category_type', 'description', 'is_system', 'items_count', 'created_at', 'updated_at']
        read_only_fields = ['id', 'created_at', 'updated_at', 'is_system']

    def get_items_count(self, obj):
        return obj.items.count()


class BudgetItemSerializer(serializers.ModelSerializer):
    category_detail = BudgetCategorySerializer(source='category', read_only=True)
    created_by_detail = UserListSerializer(source='created_by', read_only=True)
    validated_by_detail = UserListSerializer(source='validated_by', read_only=True)
    related_enrollment_detail = serializers.SerializerMethodField()
    related_teacher_assignment_detail = serializers.SerializerMethodField()

    class Meta:
        model = BudgetItem
        fields = [
            'id', 'item_type', 'category', 'category_detail', 'academic_year', 'date',
            'amount', 'devise', 'description', 'designation', 'reference_number', 'attachment',
            'revenue_source', 'expense_type', 'related_enrollment', 'related_enrollment_detail',
            'related_teacher_assignment', 'related_teacher_assignment_detail',
            'created_by', 'created_by_detail', 'validated_by', 'validated_by_detail',
            'is_validated', 'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'created_by', 'validated_by', 'is_validated']

    def get_related_enrollment_detail(self, obj):
        if obj.related_enrollment:
            return {
                'id': obj.related_enrollment.id,
                'student': obj.related_enrollment.student.user.get_full_name() if obj.related_enrollment.student else None,
                'receipt_number': obj.related_enrollment.receipt_number,
            }
        return None

    def get_related_teacher_assignment_detail(self, obj):
        if obj.related_teacher_assignment:
            return {
                'id': obj.related_teacher_assignment.id,
                'teacher': obj.related_teacher_assignment.professeur.get_full_name(),
                'classe': obj.related_teacher_assignment.classe.nom,
                'matiere': obj.related_teacher_assignment.matiere.nom,
            }
        return None


class BudgetItemCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = BudgetItem
        fields = [
            'item_type', 'category', 'academic_year', 'date',
            'amount', 'devise', 'description', 'designation', 'reference_number', 'attachment',
            'revenue_source', 'expense_type', 'related_enrollment', 'related_teacher_assignment',
        ]

    def validate(self, data):
        item_type = data.get('item_type')
        if item_type == BudgetItem.ItemType.REVENUE and not data.get('revenue_source'):
            data['revenue_source'] = BudgetItem.RevenueSource.OTHER_REVENUE
        if item_type == BudgetItem.ItemType.EXPENSE and not data.get('expense_type'):
            data['expense_type'] = BudgetItem.ExpenseType.OTHER_EXPENSE
        return data


class BudgetSummarySerializer(serializers.ModelSerializer):
    class Meta:
        model = BudgetSummary
        fields = ['academic_year', 'total_revenue', 'total_expense', 'balance', 'last_calculated']
        read_only_fields = fields


class BudgetReportSerializer(serializers.ModelSerializer):
    generated_by_detail = UserListSerializer(source='generated_by', read_only=True)

    class Meta:
        model = BudgetReport
        fields = [
            'id', 'academic_year', 'period_type', 'period_start', 'period_end',
            'status', 'file', 'data_json', 'generated_by', 'generated_by_detail',
            'created_at', 'completed_at',
        ]
        read_only_fields = ['id', 'status', 'file', 'data_json', 'generated_by', 'created_at', 'completed_at']


class BudgetStatsSerializer(serializers.Serializer):
    """Serializer for budget statistics and charts."""
    academic_year = serializers.CharField()
    total_revenue = serializers.DecimalField(max_digits=14, decimal_places=2)
    total_expense = serializers.DecimalField(max_digits=14, decimal_places=2)
    balance = serializers.DecimalField(max_digits=14, decimal_places=2)
    revenue_by_category = serializers.ListField(child=serializers.DictField())
    expense_by_category = serializers.ListField(child=serializers.DictField())
    revenue_by_month = serializers.ListField(child=serializers.DictField())
    expense_by_month = serializers.ListField(child=serializers.DictField())
    revenue_by_source = serializers.ListField(child=serializers.DictField())
    expense_by_type = serializers.ListField(child=serializers.DictField())