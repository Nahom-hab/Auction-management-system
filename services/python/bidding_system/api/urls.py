from rest_framework.routers import DefaultRouter
from django.urls import path,include
from .views import AuctionViewSet

router = DefaultRouter()
router.register('auctions',AuctionViewSet)
urlpatterns = router.urls
