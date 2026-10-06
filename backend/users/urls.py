from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    CustomUserViewSet,
    login_view,
    password_reset_confirm_view,
    password_reset_request_view,
    register_view,
    registration_options,
)

router = DefaultRouter()
router.register(r'users', CustomUserViewSet, basename='user')

urlpatterns = [
    path('', include(router.urls)),
    path('login/', login_view, name='login'),
    path('password-reset/', password_reset_request_view, name='password-reset'),
    path('password-reset/confirm/', password_reset_confirm_view, name='password-reset-confirm'),
    path('register/', register_view, name='register'),
    path('register/options/', registration_options, name='registration-options'),
]
