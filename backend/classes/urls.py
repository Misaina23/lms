from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import ClasseViewSet

router = DefaultRouter()
router.register(r'classes', ClasseViewSet, basename='classe')

urlpatterns = [
    path('', include(router.urls)),
]
