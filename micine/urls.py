from django.urls import path
from . import views

urlpatterns = [
    path('', views.login_view, name='login'),  # raíz va a registro
    path('registro/', views.registro, name='registro'),
    path('login/', views.login_view, name='login'),
    path('logout/', views.logout_view, name='logout'),
    path('snacks/', views.snacks, name='snacks'),
    path("comprar-snack/", views.comprar_snack, name="comprar_snack"),
    path('contacto/', views.contacto, name='contacto'),
    path('votacionpeliculas/', views.votacionpeliculas, name='votacionpeliculas'),
    path('ticketsusuario/', views.tickets_usuario, name='tickets_usuario'),
    path('ticket/<int:ticket_id>/', views.ticket_detalle, name='ticket_detalle'),
    path('tickets/', views.tickets, name='tickets'),
    path('ticket/<int:ticket_id>/grafo-asientos/', views.grafo_asientos, name='grafo_asientos'),
    path('ticket/<int:ticket_id>/grafo_rutas/', views.grafo_rutas, name='grafo_rutas'),
    path('funciones/<int:pelicula_id>/', views.funciones_por_pelicula, name='funciones_por_pelicula'),
    path('funcion/<int:funcion_id>/asientos/', views.asientos, name='asientos'),
    path('comprar_asientos/<int:funcion_id>/', views.comprar_asientos, name='comprar_asientos'),
    path('home/', views.home, name='home'),  # cartelera queda en /home/
]
