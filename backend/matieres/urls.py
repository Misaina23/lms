from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import MatiereViewSet, ExamPeriodViewSet

router = DefaultRouter()
router.register(r'matieres', MatiereViewSet, basename='matiere')
router.register(r'exam-periods', ExamPeriodViewSet, basename='exam-period')

urlpatterns = [
    path('', include(router.urls)),
]
