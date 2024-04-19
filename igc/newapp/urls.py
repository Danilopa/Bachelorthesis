from django.urls import path
import newapp.views

urlpatterns = [
    path('', newapp.views.index, name='index'),
    path('callback', newapp.views.callback, name='callback'),
    path('log', newapp.views.log, name='log'),
]