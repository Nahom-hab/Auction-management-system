# core/tasks.py

from __future__ import absolute_import, unicode_literals
from celery import shared_task
from django.utils import timezone
from .models import Auction

@shared_task
def update_auction_status():
    # Log the task execution for debugging
    print("Updating auction status...")
    # Your task logic here
    now = timezone.now()
    auctions = Auction.objects.filter(bid_starting_time__lte=now, bid_closing_time__gte=now)
    auctions.update(status='running')
    
    auctions = Auction.objects.filter(bid_closing_time__lt=now)
    auctions.update(status='finished')
    
    print("Auction status updated.")
