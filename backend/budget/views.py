from django.http import HttpResponse
from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from django.db.models import Sum, Count, Q
from django.db.models.functions import TruncMonth
from decimal import Decimal
import datetime

from .models import BudgetCategory, BudgetItem, BudgetSummary, BudgetReport
from .serializers import (
    BudgetCategorySerializer, BudgetItemSerializer, BudgetItemCreateSerializer,
    BudgetSummarySerializer, BudgetReportSerializer, BudgetStatsSerializer
)
from .exports import export_budget_to_pdf, export_budget_to_excel, export_budget_to_csv
from users.permissions import IsAdminOrReadOnly, IsAdminOnly


class BudgetCategoryViewSet(viewsets.ModelViewSet):
    queryset = BudgetCategory.objects.all()
    serializer_class = BudgetCategorySerializer
    permission_classes = [IsAdminOrReadOnly]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['category_type', 'is_system']

    def get_permissions(self):
        if self.action in ['destroy']:
            return [IsAdminOnly()]
        return super().get_permissions()

    def perform_destroy(self, instance):
        if instance.is_system:
            return Response({'detail': 'Cannot delete system category'}, status=status.HTTP_400_BAD_REQUEST)
        super().perform_destroy(instance)


class BudgetItemViewSet(viewsets.ModelViewSet):
    queryset = BudgetItem.objects.select_related('category', 'created_by', 'validated_by', 'related_enrollment__student__user').all()
    permission_classes = [IsAdminOrReadOnly]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['item_type', 'category', 'academic_year', 'revenue_source', 'expense_type', 'is_validated']

    def get_serializer_class(self):
        if self.action in ['create', 'update', 'partial_update']:
            return BudgetItemCreateSerializer
        return BudgetItemSerializer

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)

    @action(detail=True, methods=['post'], permission_classes=[permissions.IsAdminUser])
    def validate_item(self, request, pk=None):
        item = self.get_object()
        if item.is_validated:
            return Response({'detail': 'Already validated'}, status=status.HTTP_400_BAD_REQUEST)
        item.is_validated = True
        item.validated_by = request.user
        item.save()
        # Recalculate summary
        summary, _ = BudgetSummary.objects.get_or_create(academic_year=item.academic_year)
        summary.recalculate()
        return Response({'status': 'validated', 'item': BudgetItemSerializer(item).data})

    @action(detail=False, methods=['get'], permission_classes=[permissions.IsAuthenticated])
    def stats(self, request):
        academic_year = request.query_params.get('academic_year')
        if not academic_year:
            return Response({'detail': 'academic_year required'}, status=status.HTTP_400_BAD_REQUEST)

        items = BudgetItem.objects.filter(academic_year=academic_year)

        # Total revenue/expense
        revenue_agg = items.filter(item_type=BudgetItem.ItemType.REVENUE).aggregate(
            total=Sum('amount')
        )
        expense_agg = items.filter(item_type=BudgetItem.ItemType.EXPENSE).aggregate(
            total=Sum('amount')
        )
        total_revenue = revenue_agg['total'] or Decimal('0')
        total_expense = expense_agg['total'] or Decimal('0')

        # Revenue by category
        revenue_by_cat = items.filter(item_type=BudgetItem.ItemType.REVENUE).values(
            'category__name', 'category__category_type'
        ).annotate(
            total=Sum('amount'),
            count=Count('id')
        ).order_by('-total')

        # Expense by category
        expense_by_cat = items.filter(item_type=BudgetItem.ItemType.EXPENSE).values(
            'category__name', 'category__category_type'
        ).annotate(
            total=Sum('amount'),
            count=Count('id')
        ).order_by('-total')

        # Revenue by month
        revenue_by_month = items.filter(item_type=BudgetItem.ItemType.REVENUE).annotate(
            month=TruncMonth('date')
        ).values('month').annotate(
            total=Sum('amount')
        ).order_by('month')

        # Expense by month
        expense_by_month = items.filter(item_type=BudgetItem.ItemType.EXPENSE).annotate(
            month=TruncMonth('date')
        ).values('month').annotate(
            total=Sum('amount')
        ).order_by('month')

        # Revenue by source
        revenue_by_source = items.filter(item_type=BudgetItem.ItemType.REVENUE).values(
            'revenue_source'
        ).annotate(
            total=Sum('amount'),
            count=Count('id')
        ).order_by('-total')

        # Expense by type
        expense_by_type = items.filter(item_type=BudgetItem.ItemType.EXPENSE).values(
            'expense_type'
        ).annotate(
            total=Sum('amount'),
            count=Count('id')
        ).order_by('-total')

        data = {
            'academic_year': academic_year,
            'total_revenue': total_revenue,
            'total_expense': total_expense,
            'balance': total_revenue - total_expense,
            'revenue_by_category': list(revenue_by_cat),
            'expense_by_category': list(expense_by_cat),
            'revenue_by_month': [
                {'month': r['month'].strftime('%Y-%m') if r['month'] else 'N/A', 'total': r['total']}
                for r in revenue_by_month
            ],
            'expense_by_month': [
                {'month': e['month'].strftime('%Y-%m') if e['month'] else 'N/A', 'total': e['total']}
                for e in expense_by_month
            ],
            'revenue_by_source': list(revenue_by_source),
            'expense_by_type': list(expense_by_type),
        }
        return Response(BudgetStatsSerializer(data).data)

    @action(detail=False, methods=['get'], permission_classes=[IsAdminOnly])
    def export_pdf(self, request):
        academic_year = request.query_params.get('academic_year')
        if not academic_year:
            return Response({'detail': 'academic_year required'}, status=status.HTTP_400_BAD_REQUEST)
        
        items = BudgetItem.objects.filter(academic_year=academic_year).select_related('category')
        categories_map = {cat.id: {'name': cat.name} for cat in BudgetCategory.objects.all()}
        
        try:
            buffer = export_budget_to_pdf(items, categories_map, academic_year=academic_year)
            response = HttpResponse(buffer.getvalue(), content_type='application/pdf')
            response['Content-Disposition'] = f'attachment; filename="budget_{academic_year}.pdf"'
            return response
        except Exception as e:
            return Response({'detail': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=False, methods=['get'], permission_classes=[IsAdminOnly])
    def export_excel(self, request):
        academic_year = request.query_params.get('academic_year')
        if not academic_year:
            return Response({'detail': 'academic_year required'}, status=status.HTTP_400_BAD_REQUEST)
        
        items = BudgetItem.objects.filter(academic_year=academic_year).select_related('category')
        categories_map = {cat.id: {'name': cat.name} for cat in BudgetCategory.objects.all()}
        
        try:
            buffer = export_budget_to_excel(items, categories_map, academic_year=academic_year)
            response = HttpResponse(buffer.getvalue(), content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
            response['Content-Disposition'] = f'attachment; filename="budget_{academic_year}.xlsx"'
            return response
        except Exception as e:
            return Response({'detail': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=False, methods=['get'], permission_classes=[IsAdminOnly])
    def export_csv(self, request):
        academic_year = request.query_params.get('academic_year')
        if not academic_year:
            return Response({'detail': 'academic_year required'}, status=status.HTTP_400_BAD_REQUEST)
        
        items = BudgetItem.objects.filter(academic_year=academic_year).select_related('category')
        categories_map = {cat.id: {'name': cat.name} for cat in BudgetCategory.objects.all()}
        
        try:
            buffer = export_budget_to_csv(items, categories_map, academic_year=academic_year)
            response = HttpResponse(buffer.getvalue(), content_type='text/csv')
            response['Content-Disposition'] = f'attachment; filename="budget_{academic_year}.csv"'
            return response
        except Exception as e:
            return Response({'detail': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=False, methods=['post'], permission_classes=[IsAdminOnly])
    def generate_report(self, request):
        academic_year = request.data.get('academic_year')
        period_type = request.data.get('period_type', BudgetReport.Period.MONTHLY)
        period_start = request.data.get('period_start')
        period_end = request.data.get('period_end')

        if not academic_year:
            return Response({'detail': 'academic_year required'}, status=status.HTTP_400_BAD_REQUEST)

        # Calculate period dates
        today = datetime.date.today()
        if period_type == BudgetReport.Period.MONTHLY:
            if not period_start:
                period_start = today.replace(day=1)
            if not period_end:
                # Last day of current month
                if period_start.month == 12:
                    period_end = period_start.replace(year=period_start.year + 1, month=1, day=1) - datetime.timedelta(days=1)
                else:
                    period_end = period_start.replace(month=period_start.month + 1, day=1) - datetime.timedelta(days=1)
        elif period_type == BudgetReport.Period.QUARTERLY:
            if not period_end:
                period_end = today
            if not period_start:
                period_start = period_end - datetime.timedelta(days=90)
        elif period_type == BudgetReport.Period.YEARLY:
            # Find school config for academic year
            from classes.models import SchoolConfig
            config = SchoolConfig.objects.filter(academic_year=academic_year).first()
            if config:
                # Approximate: Sept to June
                year_start = int(academic_year.split('-')[0])
                period_start = datetime.date(year_start, 9, 1)
                period_end = datetime.date(year_start + 1, 6, 30)
            else:
                period_start = datetime.date(today.year, 9, 1)
                period_end = datetime.date(today.year + 1, 6, 30)

        report = BudgetReport.objects.create(
            academic_year=academic_year,
            period_type=period_type,
            period_start=period_start,
            period_end=period_end,
            generated_by=request.user,
        )

        # Generate report data
        items = BudgetItem.objects.filter(
            academic_year=academic_year,
            date__gte=period_start,
            date__lte=period_end
        ).select_related('category')

        revenue_items = items.filter(item_type=BudgetItem.ItemType.REVENUE)
        expense_items = items.filter(item_type=BudgetItem.ItemType.EXPENSE)

        revenue_by_cat = revenue_items.values('category__name').annotate(
            total=Sum('amount'), count=Count('id')
        ).order_by('-total')
        expense_by_cat = expense_items.values('category__name').annotate(
            total=Sum('amount'), count=Count('id')
        ).order_by('-total')

        revenue_by_month = revenue_items.annotate(month=TruncMonth('date')).values('month').annotate(
            total=Sum('amount')
        ).order_by('month')
        expense_by_month = expense_items.annotate(month=TruncMonth('date')).values('month').annotate(
            total=Sum('amount')
        ).order_by('month')

        total_revenue = revenue_items.aggregate(total=Sum('amount'))['total'] or Decimal('0')
        total_expense = expense_items.aggregate(total=Sum('amount'))['total'] or Decimal('0')

        report.data_json = {
            'academic_year': academic_year,
            'period_type': period_type,
            'period_start': period_start.isoformat(),
            'period_end': period_end.isoformat(),
            'total_revenue': str(total_revenue),
            'total_expense': str(total_expense),
            'balance': str(total_revenue - total_expense),
            'revenue_by_category': [
                {'category': r['category__name'], 'total': str(r['total']), 'count': r['count']}
                for r in revenue_by_cat
            ],
            'expense_by_category': [
                {'category': e['category__name'], 'total': str(e['total']), 'count': e['count']}
                for e in expense_by_cat
            ],
            'revenue_by_month': [
                {'month': r['month'].strftime('%Y-%m') if r['month'] else 'N/A', 'total': str(r['total'])}
                for r in revenue_by_month
            ],
            'expense_by_month': [
                {'month': e['month'].strftime('%Y-%m') if e['month'] else 'N/A', 'total': str(e['total'])}
                for e in expense_by_month
            ],
            'items_count': items.count(),
        }
        report.status = BudgetReport.Status.READY
        report.completed_at = datetime.datetime.now()
        report.save()

        return Response(BudgetReportSerializer(report).data, status=status.HTTP_201_CREATED)


class BudgetSummaryViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = BudgetSummary.objects.all()
    serializer_class = BudgetSummarySerializer
    permission_classes = [IsAdminOrReadOnly]

    @action(detail=False, methods=['post'], permission_classes=[permissions.IsAdminUser])
    def recalculate_all(self, request):
        summaries = BudgetSummary.objects.all()
        for summary in summaries:
            summary.recalculate()
        return Response({'recalculated': summaries.count()})


class BudgetReportViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = BudgetReport.objects.select_related('generated_by').all()
    serializer_class = BudgetReportSerializer
    permission_classes = [IsAdminOrReadOnly]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['academic_year', 'period_type', 'status']