from django.urls import path, include
from rest_framework import routers
from rest_framework_nested.routers import NestedDefaultRouter
from .views import CustomTokenObtainPairView, UserViewSet,TokenRefreshView,UserDetailView,UserImageViewSet

router = routers.DefaultRouter()
router.register('profile', UserViewSet,basename='user')

image_router = NestedDefaultRouter(router,'profile', lookup = 'user')
image_router.register('images', UserImageViewSet, basename='user-images')

urlpatterns = [
    path('token/', CustomTokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('token/refresh/', TokenRefreshView.as_view(), name ='token_refresh'),
    path('profile/me/', UserDetailView.as_view(), name = "user_detail"),
    path('', include(router.urls)),
    path('', include(image_router.urls)),
]
