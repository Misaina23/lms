from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import NoteViewSet, ExamPeriodViewSet

router = DefaultRouter()
router.register(r'notes', NoteViewSet, basename='note')
router.register(r'exam-periods', ExamPeriodViewSet, basename='exam-period')

urlpatterns = [
    path('', include(router.urls)),
]
