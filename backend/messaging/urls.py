from rest_framework.routers import DefaultRouter

from .views import ChatGroupViewSet, ChatMessageViewSet

router = DefaultRouter()
router.register(r'chat-groups', ChatGroupViewSet, basename='chat-group')
router.register(r'chat-messages', ChatMessageViewSet, basename='chat-message')

urlpatterns = router.urls
