from django.shortcuts import render
from core.models import Auction,Item
from .serializers import AuctionSerializer
from rest_framework.viewsets import ModelViewSet

class AuctionViewSet(ModelViewSet):
    queryset = Auction.objects.select_related('user').all()
    serializer_class = AuctionSerializer