from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import EtudiantViewSet, EnrollmentViewSet, StudentOrientationViewSet, AuditLogViewSet, NotificationViewSet

router = DefaultRouter()
router.register(r'etudiants', EtudiantViewSet, basename='etudiant')
router.register(r'enrollments', EnrollmentViewSet, basename='enrollment')
router.register(r'orientations', StudentOrientationViewSet, basename='orientation')
router.register(r'audit-logs', AuditLogViewSet, basename='audit-log')
router.register(r'notifications', NotificationViewSet, basename='notification')

urlpatterns = [
    path('', include(router.urls)),
]
