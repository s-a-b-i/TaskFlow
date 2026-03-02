"""
Root URL configuration for Team Task Manager.
"""

from django.contrib import admin
from django.urls import path, include

from django.http import JsonResponse

def api_root(request):
    return JsonResponse({
        "message": "Team Task Manager API is running",
        "status": "online",
        "documentation": "/admin/"
    })

urlpatterns = [
    path('', api_root),
    path('admin/', admin.site.urls),
    path('api/', include('api.urls')),
]
