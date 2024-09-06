from rest_framework.routers import DefaultRouter
from django.urls import path,include
from .views import AuctionViewSet,ItemViewSet
from rest_framework_nested.routers import NestedDefaultRouter
router = DefaultRouter()
router.register('auctions',AuctionViewSet)

item_router = NestedDefaultRouter(router,'auctions', lookup = 'auction')
item_router.register('items', ItemViewSet, basename='auction-items')

urlpatterns = [
    path('', include(router.urls)),   
    path('', include(item_router.urls)), 
]
