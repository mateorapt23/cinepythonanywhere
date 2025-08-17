// static/micine/grafo_asientos.js
document.addEventListener("DOMContentLoaded", () => {
  const data = window.asientosData;
  if (!data) return;

  // --- Grafo grande (asientos estáticos, sin interacción) ---
  const containerGrande = document.getElementById('grafo-container');
  containerGrande.innerHTML = '';

  const filas = data.filas;
  const columnas = data.columnas;

  const maxWidth = Math.min(1000, Math.max(700, columnas * 60));
  const seatGap = Math.max(36, Math.floor(maxWidth / (columnas + 2)));
  const hPadding = seatGap;
  const vPadding = seatGap;
  const widthGrande = columnas * seatGap + hPadding * 2;
  const heightGrande = filas * seatGap + vPadding * 2;

  const SVG_NS = "http://www.w3.org/2000/svg";
  const svgGrande = document.createElementNS(SVG_NS, 'svg');
  svgGrande.setAttribute('viewBox', `0 0 ${widthGrande} ${heightGrande}`);
  svgGrande.style.width = '100%';
  svgGrande.style.height = 'auto';
  svgGrande.style.background = 'transparent';
  svgGrande.classList.add('grafo-svg');

  // Posiciones fijas para nodos grandes
  const positionsGrande = {};
  data.nodes.forEach(node => {
    const x = hPadding + (node.columna - 1) * seatGap + seatGap / 2;
    const y = vPadding + (node.fila - 1) * seatGap + seatGap / 2;
    positionsGrande[node.id] = { x, y, node };
  });

  // Dibujar aristas grandes
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

  // Dibujar nodos grandes
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
    title.textContent = `${node.label} — ${node.vendido ? 'Vendido' : 'Disponible'}`;
    circle.appendChild(title);

    circle.addEventListener('click', () => {
      alert(`${node.label}\nFila: ${node.fila}\nColumna: ${node.columna}\nEstado: ${node.vendido ? 'Vendido' : 'Disponible'}`);
    });
  });

  containerGrande.appendChild(svgGrande);

  // --- Grafo pequeño (subgrafo usuario + vecinos) con D3 y simulación ---

  // Función para obtener vecinos de un nodo
  function obtenerVecinos(nodoId, edges) {
    const vecinos = new Set();
    edges.forEach(edge => {
      if (edge.from === nodoId) vecinos.add(edge.to);
      else if (edge.to === nodoId) vecinos.add(edge.from);
    });
    return vecinos;
  }

  const nodosSubgrafo = new Map();
  const aristasSubgrafo = [];

  data.user_seats.forEach(id => {
    const nodo = data.nodes.find(n => n.id === id);
    if (nodo) nodosSubgrafo.set(id, {...nodo});
  });

  data.user_seats.forEach(id => {
    const vecinos = obtenerVecinos(id, data.edges);
    vecinos.forEach(vId => {
      if (!nodosSubgrafo.has(vId)) {
        const vecinoNodo = data.nodes.find(n => n.id === vId);
        if (vecinoNodo) nodosSubgrafo.set(vId, {...vecinoNodo});
      }
    });
  });

  data.edges.forEach(edge => {
    if (nodosSubgrafo.has(edge.from) && nodosSubgrafo.has(edge.to)) {
      aristasSubgrafo.push(edge);
    }
  });

  // Transformar aristas para D3: source/target en vez de from/to
  const aristasSubgrafoD3 = aristasSubgrafo.map(edge => ({
    source: edge.from,
    target: edge.to
  }));

  console.log('Nodos subgrafo:', nodosSubgrafo);
  console.log('Aristas subgrafo (D3):', aristasSubgrafoD3);

  const containerPequeno = document.getElementById('grafo-pequeno-container');
  if (!containerPequeno) {
    console.error('No existe contenedor para grafo pequeño');
    return;
  }
  containerPequeno.innerHTML = '';

  // Crear contenedor para texto info (si no existe)
  let infoContainer = document.getElementById('grafo-info');
  if (!infoContainer) {
    infoContainer = document.createElement('div');
    infoContainer.id = 'grafo-info';
    infoContainer.style.color = '#eee';
    infoContainer.style.marginTop = '1rem';
    infoContainer.style.maxWidth = '400px';
    infoContainer.style.fontFamily = 'Arial, sans-serif';
    infoContainer.style.fontSize = '14px';
    // Para que quede a la derecha, uso flexbox (puedes ajustar el CSS)
    const wrapper = document.createElement('div');
    wrapper.style.display = 'flex';
    wrapper.style.gap = '1rem';
    wrapper.style.justifyContent = 'center';
    wrapper.style.alignItems = 'flex-start';
    wrapper.appendChild(containerPequeno);
    wrapper.appendChild(infoContainer);
    // Reemplazamos el padre por el wrapper
    containerPequeno.parentNode.replaceChild(wrapper, containerPequeno);
  } else {
    infoContainer.innerHTML = '';
  }

  const widthPequeno = 400;
  const heightPequeno = 300;

  const svgPequeno = d3.select(containerPequeno)
    .append('svg')
    .attr('width', widthPequeno)
    .attr('height', heightPequeno);

  const svgGroupPequeno = svgPequeno.append('g');

  svgPequeno.call(d3.zoom().on("zoom", (event) => {
    svgGroupPequeno.attr("transform", event.transform);
  }));

  const nodesArray = Array.from(nodosSubgrafo.values());

  if(nodesArray.length === 0) {
    console.warn('No hay nodos en el subgrafo para mostrar');
    return;
  }

  // --- FUNCIONES para análisis de grafo ---

  // Verifica si el grafo es conexo (BFS)
  function esConexo(nodos, aristas) {
    if (nodos.length === 0) return true;
    const adyacencia = new Map();
    nodos.forEach(n => adyacencia.set(n.id, []));
    aristas.forEach(a => {
      adyacencia.get(a.source).push(a.target);
      adyacencia.get(a.target).push(a.source);
    });
    const visitados = new Set();
    const queue = [nodos[0].id];
    while (queue.length) {
      const actual = queue.shift();
      if (!visitados.has(actual)) {
        visitados.add(actual);
        adyacencia.get(actual).forEach(v => {
          if (!visitados.has(v)) queue.push(v);
        });
      }
    }
    return visitados.size === nodos.length;
  }

  // Análisis de grados de vértices
  function analizarVertices(nodos, aristas) {
    const grados = new Map();
    nodos.forEach(n => grados.set(n.id, 0));
    aristas.forEach(a => {
      grados.set(a.source, grados.get(a.source) + 1);
      grados.set(a.target, grados.get(a.target) + 1);
    });
    let aislados = 0, colgantes = 0, otros = 0;
    grados.forEach(g => {
      if (g === 0) aislados++;
      else if (g === 1) colgantes++;
      else otros++;
    });
    return { aislados, colgantes, otros };
  }

  // Análisis Euleriano (simplificado)
  function tipoEuleriano(nodos, aristas) {
    if (!esConexo(nodos, aristas)) return 'No conexo';
    const grados = new Map();
    nodos.forEach(n => grados.set(n.id, 0));
    aristas.forEach(a => {
      grados.set(a.source, grados.get(a.source) + 1);
      grados.set(a.target, grados.get(a.target) + 1);
    });
    const nodosImpares = Array.from(grados.values()).filter(g => g % 2 !== 0).length;
    if (nodosImpares === 0) return 'Circuito Euleriano';
    else if (nodosImpares === 2) return 'Camino Euleriano';
    else return 'No Euleriano';
  }

  // Para Hamiltoniano solo dejamos "Pendiente" (no hacemos cálculo)
  const tipoHamiltoniano = 'Pendiente';

  // Calculamos propiedades
  const conectado = esConexo(nodesArray, aristasSubgrafoD3) ? 'Conexo' : 'No conexo';
  const euleriano = tipoEuleriano(nodesArray, aristasSubgrafoD3);
  const vertices = analizarVertices(nodesArray, aristasSubgrafoD3);

  // Texto para mostrar
  const texto = `
    <strong>Tipo de grafo:</strong> No dirigido<br/>
    <strong>Conexión:</strong> ${conectado}<br/>
    <strong>Hamiltoniano:</strong> ${tipoHamiltoniano}<br/>
    <strong>Euleriano:</strong> ${euleriano}<br/>
    <strong>Vértices:</strong> Aislados: ${vertices.aislados}, Colgantes: ${vertices.colgantes}, Otros: ${vertices.otros}
  `;

  // Mostrar texto
  infoContainer.innerHTML = texto;

  // --- FIN análisis texto ---

  const simulation = d3.forceSimulation(nodesArray)
    .force("link", d3.forceLink(aristasSubgrafoD3).id(d => d.id).distance(50).strength(1))
    .force("charge", d3.forceManyBody().strength(-200))
    .force("center", d3.forceCenter(widthPequeno / 2, heightPequeno / 2));

  const link = svgGroupPequeno.append("g")
    .attr("stroke", "#999")
    .attr("stroke-width", 1.5)
    .selectAll("line")
    .data(aristasSubgrafoD3)
    .join("line");

  const node = svgGroupPequeno.append("g")
    .selectAll("circle")
    .data(nodesArray)
    .join("circle")
    .attr("r", 10)
    .attr("fill", d => data.user_seats.includes(d.id) ? "#ffd700" : (d.vendido ? "#d9534f" : "#2ecc71"))
    .call(drag(simulation));

  const labels = svgGroupPequeno.append("g")
    .selectAll("text")
    .data(nodesArray)
    .join("text")
    .text(d => d.label)
    .attr("font-size", 10)
    .attr("fill", "#fff")
    .attr("text-anchor", "middle")
    .attr("dy", 4);

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
});