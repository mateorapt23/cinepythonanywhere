// static/micine/grafo_rutas.js
document.addEventListener("DOMContentLoaded", () => {
  const data = window.rutasData;
  if (!data) return;

  const SVG_NS = "http://www.w3.org/2000/svg";

  // --- Grafo grande (asientos + pantalla + puerta) ---
  const containerGrande = document.getElementById('grafo-container');
  containerGrande.innerHTML = '';

  const filas = data.filas;
  const columnas = data.columnas;
  const seatGap = Math.max(36, Math.floor(1000 / (columnas + 2)));
  const hPadding = seatGap;
  const vPadding = seatGap;
  const widthGrande = columnas * seatGap + hPadding * 2;
  const heightGrande = filas * seatGap + vPadding * 2 + 60; // espacio extra para pantalla y puerta

  const svgGrande = document.createElementNS(SVG_NS, 'svg');
  svgGrande.setAttribute('viewBox', `0 0 ${widthGrande} ${heightGrande}`);
  svgGrande.style.width = '100%';
  svgGrande.style.height = 'auto';
  svgGrande.style.background = 'transparent';
  svgGrande.classList.add('grafo-svg');

  // Posiciones nodos asientos
  const positionsGrande = {};
  data.nodes.forEach(node => {
    const x = hPadding + (node.columna - 1) * seatGap + seatGap / 2;
    const y = vPadding * 2 + (node.fila - 1) * seatGap + seatGap / 2;
    positionsGrande[node.id] = { x, y, node };
  });

  // Dibujar aristas asientos
  data.edges.forEach(edge => {
    const a = positionsGrande[edge.from];
    const b = positionsGrande[edge.to];
    if (!a || !b) return;
    const line = document.createElementNS(SVG_NS, 'line');
    line.setAttribute('x1', a.x);
    line.setAttribute('y1', a.y);
    line.setAttribute('x2', b.x);
    line.setAttribute('y2', b.y);
    line.setAttribute('stroke', '#444');
    line.setAttribute('stroke-width', 2);
    line.setAttribute('stroke-linecap', 'round');
    svgGrande.appendChild(line);
  });

  // Dibujar nodos asientos
  data.nodes.forEach(node => {
    const pos = positionsGrande[node.id];
    if (!pos) return;

    let fill = node.vendido ? '#d9534f' : '#2ecc71';
    if (data.user_seats.includes(node.id)) fill = '#ffd700';

    const radius = Math.min(18, seatGap * 0.35);

    const circle = document.createElementNS(SVG_NS, 'circle');
    circle.setAttribute('cx', pos.x);
    circle.setAttribute('cy', pos.y);
    circle.setAttribute('r', radius);
    circle.setAttribute('fill', fill);
    circle.setAttribute('stroke', '#222');
    circle.setAttribute('stroke-width', 1.5);
    circle.classList.add('seat-node');
    circle.style.cursor = 'pointer';
    svgGrande.appendChild(circle);

    const text = document.createElementNS(SVG_NS, 'text');
    text.setAttribute('x', pos.x);
    text.setAttribute('y', pos.y + radius + 12);
    text.setAttribute('text-anchor', 'middle');
    text.setAttribute('font-size', Math.max(10, radius * 0.9));
    text.setAttribute('fill', '#fff');
    text.textContent = node.label;
    svgGrande.appendChild(text);

    const title = document.createElementNS(SVG_NS, 'title');
    title.textContent = `${node.label} — ${node.vendido ? 'Ocupado' : 'Disponible'}`;
    circle.appendChild(title);

    circle.addEventListener('click', () => {
      alert(`${node.label}\nFila: ${node.fila}\nColumna: ${node.columna}\nEstado: ${node.vendido ? 'Ocupado' : 'Disponible'}`);
    });
  });

  // Dibujar pantalla arriba (centrada)
  const pantallaX = widthGrande / 2;
  const pantallaY = vPadding / 2;

  const rectPantalla = document.createElementNS(SVG_NS, 'rect');
  rectPantalla.setAttribute('x', pantallaX - 60);
  rectPantalla.setAttribute('y', pantallaY);
  rectPantalla.setAttribute('width', 120);
  rectPantalla.setAttribute('height', 30);
  rectPantalla.setAttribute('fill', '#3498db');
  rectPantalla.setAttribute('rx', 6);
  rectPantalla.setAttribute('ry', 6);
  svgGrande.appendChild(rectPantalla);

  const textPantalla = document.createElementNS(SVG_NS, 'text');
  textPantalla.setAttribute('x', pantallaX);
  textPantalla.setAttribute('y', pantallaY + 20);
  textPantalla.setAttribute('text-anchor', 'middle');
  textPantalla.setAttribute('font-size', 14);
  textPantalla.setAttribute('fill', '#fff');
  textPantalla.textContent = 'Pantalla';
  svgGrande.appendChild(textPantalla);

  // Dibujar puerta a izquierda o derecha
  const puertaY = vPadding / 2;
  const puertaX = data.puerta_lado === 'izquierda' ? hPadding / 2 : widthGrande - hPadding / 2 - 40;

  const rectPuerta = document.createElementNS(SVG_NS, 'rect');
  rectPuerta.setAttribute('x', puertaX);
  rectPuerta.setAttribute('y', puertaY);
  rectPuerta.setAttribute('width', 40);
  rectPuerta.setAttribute('height', 40);
  rectPuerta.setAttribute('fill', '#9b59b6');
  rectPuerta.setAttribute('rx', 8);
  rectPuerta.setAttribute('ry', 8);
  svgGrande.appendChild(rectPuerta);

  const textPuerta = document.createElementNS(SVG_NS, 'text');
  textPuerta.setAttribute('x', puertaX + 20);
  textPuerta.setAttribute('y', puertaY + 25);
  textPuerta.setAttribute('text-anchor', 'middle');
  textPuerta.setAttribute('font-size', 14);
  textPuerta.setAttribute('fill', '#fff');
  textPuerta.textContent = 'Salida';
  svgGrande.appendChild(textPuerta);

  containerGrande.appendChild(svgGrande);

  // --- Función común para grafo reducido con D3 (zoom+drag) ---
  function crearGrafoReducido(containerId, nodes, links, isDirected = false, linkLabels = null) {
    const width = 300;
    const height = 250;

    const container = document.getElementById(containerId);
    container.innerHTML = '';

    const svg = d3.select(container)
      .append('svg')
      .attr('width', width)
      .attr('height', height);

    const svgGroup = svg.append('g');

    svg.call(d3.zoom().on("zoom", (event) => {
      svgGroup.attr("transform", event.transform);
    }));

    const simulation = d3.forceSimulation(nodes)
      .force("link", d3.forceLink(links).id(d => d.id).distance(80).strength(1))
      .force("charge", d3.forceManyBody().strength(-300))
      .force("center", d3.forceCenter(width / 2, height / 2));

    const link = svgGroup.append("g")
      .attr("stroke", isDirected ? "#ffa500" : "#999")
      .attr("stroke-width", 1.5)
      .selectAll("line")
      .data(links)
      .join("line")
      .attr("marker-end", d => isDirected ? "url(#arrowhead)" : null);

    // Definir marker para flechas si es dirigido
    if (isDirected) {
      svg.append("defs").append("marker")
        .attr("id", "arrowhead")
        .attr("viewBox", "0 -5 10 10")
        .attr("refX", 15)
        .attr("refY", 0)
        .attr("markerWidth", 7)
        .attr("markerHeight", 7)
        .attr("orient", "auto")
        .append("path")
        .attr("d", "M0,-5L10,0L0,5")
        .attr("fill", "#ffa500");
    }

    const node = svgGroup.append("g")
      .selectAll("circle")
      .data(nodes)
      .join("circle")
      .attr("r", 12)
      .attr("fill", d => d.color || "#2ecc71")
      .call(drag(simulation));

    const labels = svgGroup.append("g")
      .selectAll("text")
      .data(nodes)
      .join("text")
      .text(d => d.label)
      .attr("font-size", 11)
      .attr("fill", "#fff")
      .attr("text-anchor", "middle")
      .attr("dy", 4);

    if (linkLabels) {
      const linkText = svgGroup.append("g")
        .selectAll("text")
        .data(links)
        .join("text")
        .text(d => d[linkLabels])
        .attr("font-size", 10)
        .attr("fill", "#eee")
        .attr("text-anchor", "middle");
      
      simulation.on("tick", () => {
        link
          .attr("x1", d => d.source.x)
          .attr("y1", d => d.source.y)
          .attr("x2", d => d.target.x)
          .attr("y2", d => d.target.y);

        linkText
          .attr("x", d => (d.source.x + d.target.x) / 2)
          .attr("y", d => (d.source.y + d.target.y) / 2);

        node
          .attr("cx", d => d.x)
          .attr("cy", d => d.y);

        labels
          .attr("x", d => d.x)
          .attr("y", d => d.y);
      });

    } else {
      simulation.on("tick", () => {
        link
          .attr("x1", d => d.source.x)
          .attr("y1", d => d.source.y)
          .attr("x2", d => d.target.x)
          .attr("y2", d => d.target.y);

        node
          .attr("cx", d => d.x)
          .attr("cy", d => d.y);

        labels
          .attr("x", d => d.x)
          .attr("y", d => d.y);
      });
    }

    function drag(simulation) {
      function dragstarted(event, d) {
        if (!event.active) simulation.alphaTarget(0.3).restart();
        d.fx = d.x;
        d.fy = d.y;
      }
      function dragged(event, d) {
        d.fx = event.x;
        d.fy = event.y;
      }
      function dragended(event, d) {
        if (!event.active) simulation.alphaTarget(0);
        d.fx = null;
        d.fy = null;
      }
      return d3.drag()
        .on("start", dragstarted)
        .on("drag", dragged)
        .on("end", dragended);
    }
  }

  // --- Datos para grafo 1: camino corto a puerta ---
  // Aquí asumimos que data.camino_corto es una lista de nodos y edges que forman ese camino
  if (data.camino_corto) {
    crearGrafoReducido(
      'grafo-camino-corto',
      data.camino_corto.nodes || [],
      data.camino_corto.edges || [],
      false
    );
  }

  // --- Datos para grafo 2: distancia pantalla - asientos ---
  // data.distancia_pantalla: { nodes: [], edges: [] }, edges con propiedad 'distance' para mostrar
  if (data.distancia_pantalla) {
    crearGrafoReducido(
      'grafo-pantalla-distancia',
      data.distancia_pantalla.nodes || [],
      data.distancia_pantalla.edges || [],
      false,
      'distance'
    );
  }

  // --- Datos para grafo 3: ruta del usuario ---
  // Grafo dirigido con nodes y edges
  if (data.ruta_usuario) {
    crearGrafoReducido(
      'grafo-ruta-usuario',
      data.ruta_usuario.nodes || [],
      data.ruta_usuario.edges || [],
      true
    );
  }

});