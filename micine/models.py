from django.db import models
from django.contrib.auth.models import User

class Pelicula(models.Model):
    titulo = models.CharField(max_length=100)
    sinopsis = models.TextField()
    duracion = models.IntegerField()
    clasificacion = models.CharField(max_length=10)
    imagen = models.ImageField(upload_to='peliculas/', blank=True, null=True)
    habilitada_votacion = models.BooleanField(default=False)
    _porcentaje_votos = 0  # atributo privado para uso interno 

    def __str__(self):
        return self.titulo
    
    @property
    def porcentaje_votos(self):
        return getattr(self, '_porcentaje_votos', 0)

    @porcentaje_votos.setter
    def porcentaje_votos(self, value):
        self._porcentaje_votos = value

class Sala(models.Model):
    nombre = models.CharField(max_length=50)
    filas = models.IntegerField()
    columnas = models.IntegerField()

    def __str__(self):
        return self.nombre

class Funcion(models.Model):
    pelicula = models.ForeignKey(Pelicula, on_delete=models.CASCADE)
    sala = models.ForeignKey(Sala, on_delete=models.CASCADE)
    fecha = models.DateField()
    hora = models.TimeField()
    puerta_lado = models.CharField(
        max_length=10,
        choices=[('izquierda', 'Izquierda'), ('derecha', 'Derecha')],
        blank=True,
        null=True
    )

    def __str__(self):
        return f"{self.pelicula.titulo} - {self.fecha} {self.hora}"

class Asiento(models.Model):
    funcion = models.ForeignKey(Funcion, on_delete=models.CASCADE)
    fila = models.IntegerField()
    columna = models.IntegerField()
    estado = models.CharField(max_length=10, default='vendido') 

    def __str__(self):
        return f"F{self.fila}-C{self.columna} ({self.estado})"
    
    class Meta:
        unique_together = ('funcion', 'fila', 'columna')

class Snack(models.Model):
    nombre = models.CharField(max_length=100)
    descripcion = models.TextField()
    precio = models.DecimalField(max_digits=5, decimal_places=2)
    imagen = models.ImageField(upload_to="snacks/", blank=True, null=True)

    def __str__(self):
        return self.nombre
    
class Compra(models.Model):
    usuario = models.ForeignKey(User, on_delete=models.CASCADE)
    funcion = models.ForeignKey(Funcion, on_delete=models.CASCADE)
    asientos = models.ManyToManyField(Asiento)
    fecha_compra = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        try:
           asientos_str = ", ".join([f"{a.fila}-{a.columna}" for a in self.asientos.all()])
        except:
           asientos_str = "(asientos no disponibles)"
        return f"{self.usuario} - {self.funcion} - Asientos: {asientos_str}"
    @property
    def asientos_letras(self):
        # Convierte fila numérica a letra A, B, C...
        return [f"{chr(a.fila + 64)}-{a.columna}" for a in self.asientos.all()]
    
class SnacksCompra(models.Model):
    usuario = models.ForeignKey(User, on_delete=models.CASCADE)
    snack = models.ForeignKey(Snack, on_delete=models.CASCADE)
    cantidad = models.PositiveIntegerField(default=1)
    fecha_compra = models.DateField()  

    def __str__(self):
        return f"{self.usuario.username} compró {self.cantidad} x {self.snack.nombre}"
    
class VotoPelicula(models.Model):
    usuario = models.OneToOneField(User, on_delete=models.CASCADE)  # 1 voto por usuario
    pelicula = models.ForeignKey(Pelicula, on_delete=models.CASCADE)
    fecha_voto = models.DateTimeField(auto_now=True)
    
    def __str__(self):
        return f"{self.usuario.username} votó por {self.pelicula.titulo}"