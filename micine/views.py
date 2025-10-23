from django.shortcuts import render, redirect, get_object_or_404
from django.contrib.auth.forms import UserCreationForm, AuthenticationForm
from django.contrib.auth import login, logout
from django.contrib.auth.decorators import login_required
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.contrib import messages
from django.db.models import Prefetch
from django.utils import timezone
import json, string, random
from collections import deque
from datetime import date
from .models import (
    Pelicula, Funcion, Asiento, Snack, VotoPelicula, 
    SnacksCompra, Compra
)

VOTACION_CIERRE = timezone.datetime(2025, 8, 25, 23, 59, 59)

def registro(request):
    if request.method == 'POST':
        form = UserCreationForm(request.POST)
        if form.is_valid():
            form.save()  # Guarda el usuario
            return redirect('login')  # Redirige a login
    else:
        form = UserCreationForm()
    return render(request, 'micine/registro.html', {'form': form})

def login_view(request):
    if request.method == 'POST':
        form = AuthenticationForm(request, data=request.POST)
        if form.is_valid():
            user = form.get_user()
            login(request, user)
            return redirect('home')
    else:
        form = AuthenticationForm()
    return render(request, 'micine/login.html', {'form': form})

def logout_view(request):
    logout(request)
    return redirect('login')

@login_required
def home(request):
    peliculas = Pelicula.objects.filter(habilitada_votacion=False)
    return render(request, 'micine/cartelera.html', {'peliculas': peliculas})

def snacks(request):
    snacks = Snack.objects.all()
    return render(request, "micine/snacks.html", {
        "snacks": snacks,
        "today": date.today()  
    })

@csrf_exempt
def comprar_snack(request):
    if request.method == "POST":
        import json
        data = json.loads(request.body)
        snack_id = data.get("snack_id")
        cantidad = int(data.get("cantidad", 1))
        fecha_compra = data.get("fecha_compra")

        fecha_obj = date.fromisoformat(fecha_compra)

        # Validar que la fecha no sea pasada
        if fecha_obj < date.today():
            return JsonResponse({"success": False, "error": "No se puede comprar en una fecha pasada."})

        snack = get_object_or_404(Snack, id=snack_id)
        SnacksCompra.objects.create(
            usuario=request.user,
            snack=snack,
            cantidad=cantidad,
            fecha_compra=fecha_obj
        )
        return JsonResponse({"success": True})

    return JsonResponse({"success": False, "error": "Método no permitido."})

def contacto(request):
    return render(request, 'micine/contacto.html')

def votacionpeliculas(request):
    peliculas = Pelicula.objects.filter(habilitada_votacion=True)
    total_votos = VotoPelicula.objects.count()

    votos_por_pelicula = {p.id: 0 for p in peliculas}
    for voto in VotoPelicula.objects.all():
       if voto.pelicula.id in votos_por_pelicula:
            votos_por_pelicula[voto.pelicula.id] += 1

    porcentajes = {}
    for p in peliculas:
        if total_votos > 0:
            porcentajes[p.id] = int((votos_por_pelicula[p.id] / total_votos) * 100)
        else:
            porcentajes[p.id] = 0

    for pelicula in peliculas:
        pelicula.porcentaje_votos = porcentajes.get(pelicula.id, 0)

    try:
        voto_usuario = VotoPelicula.objects.get(usuario=request.user)
        usuario_voto_id = voto_usuario.pelicula.id
    except VotoPelicula.DoesNotExist:
        usuario_voto_id = None

    if request.method == 'POST':
        pelicula_id = request.POST.get('pelicula_id')
        if pelicula_id:
           pelicula = get_object_or_404(Pelicula, id=pelicula_id)
           try:
               voto_obj = VotoPelicula.objects.get(usuario=request.user)
               voto_obj.pelicula = pelicula
               voto_obj.save()
           except VotoPelicula.DoesNotExist:
               VotoPelicula.objects.create(usuario=request.user, pelicula=pelicula)

           return redirect('votacionpeliculas')
        else:
            messages.error(request, "Por favor selecciona una película para votar antes de enviar.")
   

    return render(request, 'micine/votacionpeliculas.html', {
        'peliculas': peliculas,
        'usuario_voto_id': usuario_voto_id,
        'fecha_cierre': VOTACION_CIERRE,
        'porcentajes': porcentajes,
    })

def tickets_usuario(request):
    tickets = Compra.objects.filter(usuario=request.user).order_by('-fecha_compra')
    return render(request, 'micine/ticketsusuario.html', {'tickets': tickets})

def ticket_detalle(request, ticket_id):
    ticket = get_object_or_404(
        Compra.objects.prefetch_related(
            Prefetch('asientos', queryset=Asiento.objects.all())
        ),
        id=ticket_id, usuario=request.user
    )
    asientos_letras = [f"{numero_a_letra(a.fila)}-{a.columna}" for a in ticket.asientos.all()]
    ticket_dict = {
        'id': ticket.id,
        'funcion': ticket.funcion,
        'asientos_letras': asientos_letras,
        'fecha_compra': ticket.fecha_compra,
    }
    return render(request, 'micine/tickets.html', {'tickets': [ticket_dict]})
def numero_a_letra(num):
    return string.ascii_uppercase[num - 1]

def tickets(request):
    tickets = Compra.objects.filter(usuario=request.user).prefetch_related('asientos', 'funcion__pelicula')
    for ticket in tickets:
        ticket.asientos_letras = [f"{numero_a_letra(a.fila)}-{a.columna}" for a in ticket.asientos.all()]
    return render(request, 'micine/tickets.html', {'tickets': tickets})
    

def funciones_por_pelicula(request, pelicula_id):
    pelicula = get_object_or_404(Pelicula, id=pelicula_id)
    funciones = Funcion.objects.filter(pelicula=pelicula).order_by('fecha', 'hora')
    return render(request, 'micine/funciones.html', {'pelicula': pelicula, 'funciones': funciones})


def asientos(request, funcion_id):
    funcion = get_object_or_404(Funcion, id=funcion_id)

    # Si la función aún no tiene lado asignado, se define y guarda
    if not funcion.puerta_lado:
        funcion.puerta_lado = random.choice(["izquierda", "derecha"])
        funcion.save()

    filas = funcion.sala.filas
    columnas = funcion.sala.columnas
    asientos_vendidos = Asiento.objects.filter(funcion=funcion).values_list('fila', 'columna')

    if request.method == 'POST':
        fila = int(request.POST.get('fila'))
        columna = int(request.POST.get('columna'))
        return redirect('comprar_asientos', funcion_id=funcion.id)

    matriz_asientos = []
    for fila_num in range(1, filas + 1):
        letra_fila = chr(64 + fila_num)  # 1 -> A, 2 -> B, 3 -> C...
        fila_asientos = []
        for col_num in range(1, columnas + 1):
            vendido = (fila_num, col_num) in asientos_vendidos
            fila_asientos.append({
                'fila_num': fila_num,
                'fila_letra': letra_fila,
                'columna': col_num,
                'vendido': vendido,
            })
        matriz_asientos.append(fila_asientos)

    return render(request, 'micine/asientos.html', {
        'funcion': funcion,
        'matriz_asientos': matriz_asientos,
        'random_side': funcion.puerta_lado
    })

def comprar_asientos(request, funcion_id):
    funcion = get_object_or_404(Funcion, id=funcion_id)

    if request.method == 'POST':
        asientos_seleccionados = json.loads(request.POST.get('asientos', '[]'))
        exitos = 0
        errores = 0
        asientos_creados = []

        for asiento_str in asientos_seleccionados:
            fila, columna = map(int, asiento_str.split('-'))

            # Verifica si el asiento ya existe (vendido)
            ya_existente = Asiento.objects.filter(
                funcion=funcion,
                fila=fila,
                columna=columna
            ).exists()

            if not ya_existente:
                # Crear el asiento como vendido
                asiento = Asiento.objects.create(
                    funcion=funcion,
                    fila=fila,
                    columna=columna,
                    estado='vendido'
                )
                asientos_creados.append(asiento)
                exitos += 1
            else:
                errores += 1

        if exitos:
            # Crear una sola compra para todos los asientos comprados
            compra = Compra.objects.create(
                usuario=request.user,
                funcion=funcion,
                fecha_compra=timezone.now()
            )
            compra.asientos.set(asientos_creados)  # asigna todos los asientos a la compra
            compra.save()

            messages.success(request, f'{exitos} asiento(s) comprado(s) exitosamente.')
        if errores:
            messages.warning(request, f'{errores} asiento(s) ya estaban ocupados.')

        return redirect('asientos', funcion_id=funcion.id)
    
def grafo_asientos(request, ticket_id):
    # Acceso solo si el ticket pertenece al usuario
    compra = get_object_or_404(
        Compra.objects.prefetch_related('asientos', 'funcion__sala', 'funcion__pelicula'),
        id=ticket_id, usuario=request.user
    )
    funcion = compra.funcion
    sala = funcion.sala
    filas = sala.filas
    columnas = sala.columnas

    # Asientos vendidos en esta función
    asientos_vendidos = set(Asiento.objects.filter(funcion=funcion).values_list('fila', 'columna'))

    # Construimos nodos y aristas del grafo
    nodes = []
    edges = []
    for r in range(1, filas + 1):
        letra = chr(64 + r)  # 1 -> A
        for c in range(1, columnas + 1):
            node_id = f"{r}-{c}"                 
            label = f"{letra}-{c}"                
            sold = (r, c) in asientos_vendidos
            nodes.append({
                "id": node_id,
                "label": label,
                "fila": r,
                "columna": c,
                "vendido": sold
            })
            # arista a la derecha 
            if c < columnas:
                edges.append({"from": node_id, "to": f"{r}-{c+1}"})
            # arista abajo
            if r < filas:
                edges.append({"from": node_id, "to": f"{r+1}-{c}"})

    # Asientos comprados en este ticket 
    user_seats = [f"{a.fila}-{a.columna}" for a in compra.asientos.all()]

    payload = {
        "nodes": nodes,
        "edges": edges,
        "user_seats": user_seats,
        "filas": filas,
        "columnas": columnas,
        "funcion_id": funcion.id,
        "sala_nombre": sala.nombre,
        "pelicula_titulo": funcion.pelicula.titulo,
        "ticket_id": compra.id,
    }

    return render(request, 'micine/grafo_asientos.html', {
        "asientos_json": json.dumps(payload),
        "ticket": compra,
    })

def grafo_rutas(request, ticket_id):
    compra = get_object_or_404(
        Compra.objects.prefetch_related('asientos', 'funcion__sala', 'funcion__pelicula'),
        id=ticket_id, usuario=request.user
    )
    funcion = compra.funcion
    sala = funcion.sala
    filas = sala.filas
    columnas = sala.columnas

    # Asientos vendidos en esta función
    asientos_vendidos = set(Asiento.objects.filter(funcion=funcion).values_list('fila', 'columna'))

    # Construir nodos y aristas del grafo grande (grid)
    nodes = []
    edges = []
    for r in range(1, filas + 1):
        letra = chr(64 + r)
        for c in range(1, columnas + 1):
            node_id = f"{r}-{c}"
            label = f"{letra}-{c}"
            sold = (r, c) in asientos_vendidos
            nodes.append({
                "id": node_id,
                "label": label,
                "fila": r,
                "columna": c,
                "vendido": sold
            })
            # aristas 
            if c < columnas:
                edges.append({"from": node_id, "to": f"{r}-{c+1}"})
            if r < filas:
                edges.append({"from": node_id, "to": f"{r+1}-{c}"})

    user_seats = [f"{a.fila}-{a.columna}" for a in compra.asientos.all()]

    # ------------------------
    # Camino corto a la puerta (grafo reducido 1)
    
    if funcion.puerta_lado == 'izquierda':
        puerta_id = "1-1"
    else:
        puerta_id = f"1-{columnas}"

# Construir adyacencia para BFS
    adjacency = {}
    for r in range(1, filas + 1):
        for c in range(1, columnas + 1):
            node_id = f"{r}-{c}"
            vecinos = []
            if c > 1:
                vecinos.append(f"{r}-{c-1}")
            if c < columnas:
                vecinos.append(f"{r}-{c+1}")
            if r > 1:
                vecinos.append(f"{r-1}-{c}")
            if r < filas:
                vecinos.append(f"{r+1}-{c}")
            adjacency[node_id] = vecinos


    def bfs_camino_corto(adjacency, inicio, objetivo):
        queue = deque([inicio])
        padres = {inicio: None}
        while queue:
           actual = queue.popleft()
           if actual == objetivo:
                camino = []
                while actual:
                    camino.append(actual)
                    actual = padres[actual]
                return camino[::-1]
           for vecino in adjacency.get(actual, []):
               if vecino not in padres:
                   padres[vecino] = actual
                   queue.append(vecino)
        return []

    caminos = []
    nodos_en_camino = set()
    for asiento in user_seats:
        camino = bfs_camino_corto(adjacency, asiento, puerta_id)
        caminos.append(camino)
        nodos_en_camino.update(camino)

    camino_nodos = [n for n in nodes if n['id'] in nodos_en_camino]

    camino_edges = []
    for camino in caminos:
       for i in range(len(camino) - 1):
           camino_edges.append({"source": camino[i], "target": camino[i+1]})

    
    nodo_salida = {
    "id": "salida",
    "label": "Salida",
    "fila": None,
    "columna": None,
    "vendido": False,
    "color": "#9b59b6"
    }
    camino_nodos.append(nodo_salida)

    camino_edges.append({
       "source": puerta_id,
       "target": "salida"
    })

# Quitar duplicados
    camino_edges = [dict(t) for t in {tuple(sorted(d.items())) for d in camino_edges}]

    camino_corto = {
       "nodes": camino_nodos,
       "edges": camino_edges
    }

    # Distancia pantalla - asientos (grafo reducido 2)

    pantalla_id = "pantalla"
    pantalla_nodo = {"id": pantalla_id, "label": "Pantalla", "color": "#3498db"}

    distancia_nodes = [pantalla_nodo]
    distancia_edges = []

    for seat_id in user_seats:
        nodo = next((n for n in nodes if n["id"] == seat_id), None)
        if nodo:
            distancia_nodes.append(nodo)
            # Calcular distancia ficticia en metros
            fila_p = filas // 10  # aprox la fila donde esta la pantalla (arriba)
            # Pantalla arriba: fila=0
            fila_p = 0
            nodo_fila = nodo['fila']
            nodo_col = nodo['columna']
            distancia = ((nodo_fila - fila_p)**2 + (nodo_col - columnas/2)**2)**0.5 * 0.8
            distancia = round(distancia, 2)
            distancia_edges.append({
                "source": pantalla_id,
                "target": nodo["id"],
                "distance": f"{distancia} m"
            })

    distancia_pantalla = {
        "nodes": distancia_nodes,
        "edges": distancia_edges
    }

    # Ruta del usuario (grafo dirigido 3)

    ruta_nodes = [
        {"id": "entrada", "label": "Entrada", "color": "#e67e22"},
        {"id": "snacks", "label": "Snacks Bar", "color": "#e74c3c"},
        {"id": "sala", "label": f"Sala {sala.nombre}", "color": "#8e44ad"},
    ]
    for nodo_asiento in nodes:
        if nodo_asiento["id"] in user_seats:
            ruta_nodes.append({**nodo_asiento, "color": "#f1c40f"})

    ruta_edges = [
        {"source": "entrada", "target": "snacks"},
        {"source": "snacks", "target": "sala"},
        {"source": "sala", "target": user_seats[0] if user_seats else None},
    ]
    # Añadir enlaces entre asientos
    for i in range(len(user_seats) - 1):
        ruta_edges.append({"source": user_seats[i], "target": user_seats[i+1]})

    ruta_edges = [e for e in ruta_edges if e["target"] is not None]

    ruta_usuario = {
        "nodes": ruta_nodes,
        "edges": ruta_edges
    }

    payload = {
        "nodes": nodes,
        "edges": edges,
        "user_seats": user_seats,
        "filas": filas,
        "columnas": columnas,
        "puerta_lado": funcion.puerta_lado,
        "camino_corto": camino_corto,
        "distancia_pantalla": distancia_pantalla,
        "ruta_usuario": ruta_usuario,
    }

    return render(request, 'micine/grafo_rutas.html', {
        "rutas_json": json.dumps(payload),
        "ticket": compra,
    })