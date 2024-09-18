from __future__ import absolute_import, unicode_literals
import os
from celery import Celery
from django.conf import settings
from django.apps import apps

# Set the default Django settings module for the 'celery' program.
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'bidding_system.settings')

app = Celery('bidding_system')


app.config_from_object('django.conf:settings', namespace='CELERY')


apps.populate(settings.INSTALLED_APPS)

app.autodiscover_tasks()


import core.tasks
