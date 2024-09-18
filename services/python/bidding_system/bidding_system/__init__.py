# bidding_system/__init__.py

from __future__ import absolute_import, unicode_literals

# This will make sure the app is loaded when Django starts so that shared_task will use this app.
from .celery import app as celery_app

__all__ = ('celery_app',)
