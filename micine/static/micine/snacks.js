document.addEventListener("DOMContentLoaded", () => {

    const fechaInput = document.getElementById("fecha-compra");

    document.querySelectorAll(".comprar-btn").forEach(btn => {
        btn.addEventListener("click", () => {
            const snackId = btn.dataset.snackId;
            const fechaCompra = fechaInput.value;

            if (!fechaCompra) {
                alert("Por favor selecciona una fecha de compra.");
                return;
            }

            if (confirm("¿Seguro que quieres comprar este snack?")) {
                // Enviar al backend mediante POST
                fetch(comprarSnackUrl, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "X-CSRFToken": getCookie('csrftoken')
                    },
                    body: JSON.stringify({
                        snack_id: snackId,
                        fecha_compra: fechaCompra,
                        cantidad: 1
                    })
                })
                .then(response => response.json())
                .then(data => {
                    if (data.success) {
                        alert("¡Compra registrada correctamente!");
                    } else {
                        alert("Error al registrar la compra.");
                    }
                })
                .catch(err => {
                    console.error(err);
                    alert("Error en la conexión.");
                });
            }
        });
    });

});

// Función para obtener CSRF token de Django
function getCookie(name) {
    let cookieValue = null;
    if (document.cookie && document.cookie !== '') {
        const cookies = document.cookie.split(';');
        for (let cookie of cookies) {
            cookie = cookie.trim();
            if (cookie.startsWith(name + '=')) {
                cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                break;
            }
        }
    }
    return cookieValue;
}