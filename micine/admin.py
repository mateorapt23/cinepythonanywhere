from django.contrib import admin
from .models import Pelicula, Sala, Funcion, Asiento, Snack, Compra
import string

def numero_a_letra(num):
    return string.ascii_uppercase[num - 1]  # 1 -> A, 2 -> B, etc.

@admin.register(Pelicula)
class PeliculaAdmin(admin.ModelAdmin):
    list_display = ('titulo', 'clasificacion', 'duracion')
    search_fields = ('titulo', 'clasificacion')

@admin.register(Sala)
class SalaAdmin(admin.ModelAdmin):
    list_display = ('nombre', 'filas', 'columnas')

@admin.register(Funcion)
class FuncionAdmin(admin.ModelAdmin):
    list_display = ('pelicula', 'sala', 'fecha', 'hora')
    list_filter = ('fecha', 'pelicula')

@admin.register(Asiento)
class AsientoAdmin(admin.ModelAdmin):
    list_display = ('funcion', 'fila_letra', 'columna', 'estado')
    list_filter = ('estado',)

    def fila_letra(self, obj):
        return numero_a_letra(obj.fila)
    fila_letra.short_description = 'Fila'

@admin.register(Snack)
class SnackAdmin(admin.ModelAdmin):
    list_display = ('nombre', 'precio', 'imagen')  # Muestra imagen en lista (opcional)
    fields = ('nombre', 'descripcion', 'precio', 'imagen')

@admin.register(Compra)
class CompraAdmin(admin.ModelAdmin):
    list_display = ('usuario', 'funcion', 'mostrar_asientos', 'fecha_compra')

    def mostrar_asientos(self, obj):
        return ", ".join([f"{numero_a_letra(a.fila)}-{a.columna}" for a in obj.asientos.all()])
    mostrar_asientos.short_description = 'Asientos'