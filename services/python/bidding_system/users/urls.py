from django.urls import path, include
from rest_framework import routers
from .views import CustomTokenObtainPairView, UserViewSet, TokenRefreshView, UserDetailView, ChangePasswordView, VerifyEmailView

router = routers.DefaultRouter()
router.register('profile', UserViewSet, basename='user')

urlpatterns = [
    path('token/', CustomTokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('profile/me/', UserDetailView.as_view(), name='user_detail'),
    path('profile/change-password/', ChangePasswordView.as_view(), name='change_password'),
    path('profile/verify-email/<str:token>/', VerifyEmailView.as_view(), name='verify_email'),
    path('', include(router.urls)),
]
