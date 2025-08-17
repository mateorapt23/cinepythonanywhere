document.addEventListener("DOMContentLoaded", function () {
  const asientos = document.querySelectorAll(".asiento.disponible");
  const inputHidden = document.getElementById("asientos-seleccionados");

  let seleccionados = [];

  asientos.forEach(asiento => {
    asiento.addEventListener("click", () => {
      const fila = asiento.dataset.fila;
      const columna = asiento.dataset.columna;
      const clave = `${fila}-${columna}`;

      if (seleccionados.includes(clave)) {
        seleccionados = seleccionados.filter(a => a !== clave);
        asiento.classList.remove("seleccionado");
      } else {
        seleccionados.push(clave);
        asiento.classList.add("seleccionado");
      }

      inputHidden.value = JSON.stringify(seleccionados);
    });
  });
});