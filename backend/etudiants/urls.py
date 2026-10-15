from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    EtudiantViewSet, EnrollmentViewSet, StudentOrientationViewSet, AuditLogViewSet,
    NotificationViewSet, StudentOfficePassViewSet, CertificateRequestViewSet, DeliberationViewSet,
    import_students_endpoint, export_students_endpoint, transfer_student_endpoint,
    review_certificate_request_endpoint, analyze_deliberations_endpoint,
)

router = DefaultRouter()
router.register(r'etudiants', EtudiantViewSet, basename='etudiant')
router.register(r'enrollments', EnrollmentViewSet, basename='enrollment')
router.register(r'orientations', StudentOrientationViewSet, basename='orientation')
router.register(r'audit-logs', AuditLogViewSet, basename='audit-log')
router.register(r'notifications', NotificationViewSet, basename='notification')
router.register(r'office-passes', StudentOfficePassViewSet, basename='office-pass')
router.register(r'certificate-requests', CertificateRequestViewSet, basename='certificate-request')
router.register(r'deliberations', DeliberationViewSet, basename='deliberation')

urlpatterns = [
    path('etudiants/import/', import_students_endpoint, name='etudiant-import'),
    path('etudiants/export/', export_students_endpoint, name='etudiant-export'),
    path('etudiants/<int:pk>/transfer/', transfer_student_endpoint, name='etudiant-transfer'),
    path('deliberations/analyze/', analyze_deliberations_endpoint, name='deliberation-analyze'),
    path('certificate-requests/<int:pk>/review/', review_certificate_request_endpoint, name='certificate-request-review'),
    path('', include(router.urls)),
]
