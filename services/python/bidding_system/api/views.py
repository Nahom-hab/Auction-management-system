from rest_framework.viewsets import ModelViewSet
from core.models import Auction, Item
from .serializers import AuctionSerializer, ItemSerializer
from django_filters import rest_framework as filters
from rest_framework import filters as rest_filters
from .permissions import IsOwnerOrAdmin
from rest_framework import permissions
class AuctionViewSet(ModelViewSet):
    queryset = Auction.objects.select_related('user').prefetch_related('items').all()
    serializer_class = AuctionSerializer
    filter_backends = [filters.DjangoFilterBackend, rest_filters.OrderingFilter, rest_filters.SearchFilter]
    filterset_fields = ['auction_type','status']
    search_fields = ['auction_category',]
    ordering_fields = ['starting_bid','current_max_bid']
    ordering = ['id']
    permission_classes = [permissions.IsAuthenticatedOrReadOnly,IsOwnerOrAdmin]
    
    def get_serializer_context(self):
        return {'request': self.request}
class ItemViewSet(ModelViewSet):
    serializer_class = ItemSerializer

    def get_queryset(self):
        auction_id = self.kwargs['auction_pk']
        return Item.objects.filter(auction_id=auction_id)

    def perform_create(self, serializer):
        auction_id = self.kwargs['auction_pk']
        auction = Auction.objects.get(pk=auction_id)
        serializer.save(auction=auction)
