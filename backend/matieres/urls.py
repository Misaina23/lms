from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import MatiereViewSet

router = DefaultRouter()
router.register(r'matieres', MatiereViewSet, basename='matiere')

urlpatterns = [
    path('', include(router.urls)),
]
