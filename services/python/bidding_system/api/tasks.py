from celery import shared_task
from django.utils import timezone
from core.models import Auction
@shared_task
def update_auction_status():
    now = timezone.now()
    auctions = Auction.objects.all()

    for auction in auctions:
        if auction.bid_starting_time <= now < auction.bid_closing_time and auction.status != 'running':
            auction.status = 'running'
            auction.save()
        elif now >= auction.bid_closing_time and auction.status != 'finished':
            auction.status = 'finished'
            auction.save()