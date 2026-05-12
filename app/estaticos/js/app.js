// ════════════════════════════════════════════════════════════════════════════════
// CONFIGURACIÓN GEARFLOW - ARCHIVO APP.JS (VERSIÓN COMPLETA Y FUNCIONAL)
// Controla: sesión de usuario, carga de artículos, carrito, filtros y eventos UI
// ════════════════════════════════════════════════════════════════════════════════

let carrito = [];
let articulosListado = [];
let usuarioLogueado = false;

document.addEventListener('DOMContentLoaded', () => {
    verificarSesion();
    cargarArticulos();
    configurarEventosUI();
    configurarFiltros();
    
    // Verificamos en qué página estamos para cargar los datos correspondientes
    if (document.getElementById('cuerpo-tabla-tickets')) {
        cargarTablaTickets();
        actualizarContadoresDashboard();
    }

    if (document.getElementById('cuerpo-tabla-inventario')) {
        cargarInventario();
    }
});

// ════════════════════════════════════════════════════════════════════════════════
// 1. VERIFICAR SESIÓN - Verifica si hay usuario logueado y muestra/oculta zonas
// ════════════════════════════════════════════════════════════════════════════════
async function verificarSesion() {
    try {
        const res = await fetch('/api/check-session');
        const data = await res.json();

        const guestZone = document.getElementById('guest-zone');
        const userZone = document.getElementById('user-zone');
        const usernameDisplay = document.getElementById('username-display');
        const modoPropietario = document.getElementById('modo-propietario');

        if (data.logged_in) {
            usuarioLogueado = true;
            if (guestZone) guestZone.classList.add('hidden');
            if (userZone) userZone.classList.remove('hidden');
            if (usernameDisplay) usernameDisplay.textContent = data.usuario.nombre;
            
            if (modoPropietario) {
                modoPropietario.classList.remove('hidden');
                modoPropietario.onclick = () => window.location.href = '/dashboard';
            }
        } else {
            usuarioLogueado = false;
            if (guestZone) guestZone.classList.remove('hidden');
            if (userZone) userZone.classList.add('hidden');
        }
    } catch (e) {
        console.error("Error verificando sesión:", e);
    }
}

// ════════════════════════════════════════════════════════════════════════════════
// 2. CARGAR ARTÍCULOS - Obtiene todos los artículos del servidor y los muestra en la grilla
// ════════════════════════════════════════════════════════════════════════════════
async function cargarArticulos() {
    const grid = document.getElementById('grid-articulos');
    if (!grid) return;

    grid.innerHTML = '<p class="loading-msg">Cargando equipamiento de alto rendimiento...</p>';

    try {
        const res = await fetch('/api/articulos');
        const articulos = await res.json();
        articulosListado = articulos;

        grid.innerHTML = '';
        
        if (articulos.length === 0) {
            grid.innerHTML = '<p class="empty-msg">No hay artículos disponibles en este momento.</p>';
            return;
        }

        articulos.forEach(art => {
            const card = document.createElement('div');
            card.className = 'product-card';
            card.dataset.categoria = (art.categoria || 'general').toLowerCase();
            card.dataset.nombre = (art.nombre || '').toLowerCase();
            
            card.innerHTML = `
                <div class="card-badge">${art.categoria || 'Deporte'}</div>
                <div class="card-image">
                    <img src="${art.imagen_url || art.imagen || '/estaticos/img/default.png'}" alt="${art.nombre}" loading="lazy">
                </div>
                <div class="card-body">
                    <p class="category-text">${art.categoria || 'General'}</p>
                    <h3>${art.nombre}</h3>
                    <p class="description">${art.descripcion || 'Artículo de calidad'}</p>
                    <p class="price">$${(parseFloat(art.precio) || 0).toLocaleString()} <small>COP/día</small></p>
                    <p class="status">Estado: <span class="status-badge">${art.estado || 'Disponible'}</span></p>
                    <button onclick="abrirModalReserva(${art.id}, '${art.nombre.replace(/'/g, "\\'")}', ${art.precio})" class="btn-add">
                        Reservar ahora
                    </button>
                </div>
            `;
            grid.appendChild(card);
        });
    } catch (e) {
        console.error("Error al cargar artículos:", e);
        grid.innerHTML = '<p class="error-msg">Error al cargar los artículos</p>';
    }
}

// ════════════════════════════════════════════════════════════════════════════════
// 3. ABRIR MODAL RESERVA - Abre el modal para reservar un artículo (requiere login)
// ════════════════════════════════════════════════════════════════════════════════
function abrirModalReserva(id, nombre, precio) {
    // Verificar si el usuario está logueado
    if (!usuarioLogueado) {
        window.location.href = '/auth/login';
        return;
    }
    
    const modal = document.getElementById('modal-reservar');
    const form = document.getElementById('form-reservar');
    if (!modal || !form) return;

    form.dataset.idArticulo = id;
    form.dataset.nombre = nombre;
    form.dataset.precio = precio;
    
    // Limpiar campos
    document.getElementById('reserva-fecha-inicio').value = new Date().toISOString().split('T')[0];
    document.getElementById('reserva-dias').value = 1;
    
    modal.classList.remove('hidden');
}

const formReserva = document.getElementById('form-reservar');
if (formReserva) {
    formReserva.addEventListener('submit', (e) => {
        e.preventDefault();
        const form = e.target;
        const item = {
            id: parseInt(form.dataset.idArticulo),
            nombre: form.dataset.nombre,
            precio: parseFloat(form.dataset.precio) || 0,
            fecha: document.getElementById('reserva-fecha-inicio').value,
            dias: parseInt(document.getElementById('reserva-dias').value) || 1
        };

        // Validar
        if (!item.fecha || item.dias < 1) {
            alert('Por favor, completa todos los campos correctamente');
            return;
        }

        carrito.push(item);
        actualizarInterfazCarrito();
        document.getElementById('modal-reservar').classList.add('hidden');
        form.reset();
        
        // Mostrar confirmación
        const btnCarrito = document.getElementById('btn-carrito');
        if (btnCarrito) {
            btnCarrito.style.animation = 'pulse 0.5s';
            setTimeout(() => btnCarrito.style.animation = '', 500);
        }
    });
}

// Actualiza la interfaz del carrito cuando hay cambios en los artículos
function actualizarInterfazCarrito() {
    const contenedor = document.getElementById('carrito-items');
    const count = document.getElementById('carrito-count');
    const totalLabel = document.getElementById('carrito-total');
    
    if (count) count.textContent = carrito.length;
    if (contenedor) {
        contenedor.innerHTML = '';
        let total = 0;
        
        carrito.forEach((item, index) => {
            const subtotal = item.precio * item.dias;
            total += subtotal;
            contenedor.innerHTML += `
                <div class="cart-item">
                    <div class="item-info">
                        <strong>${item.nombre}</strong><br>
                        <small>${item.dias} día${item.dias > 1 ? 's' : ''}</small>
                    </div>
                    <span class="item-price">$${subtotal.toLocaleString()}</span>
                    <button onclick="eliminarDelCarrito(${index})" class="btn-remove" title="Eliminar del carrito">✕</button>
                </div>
            `;
        });
        
        if (totalLabel) totalLabel.textContent = `$${total.toLocaleString()}`;
        if (carrito.length === 0) {
            contenedor.innerHTML = '<p class="empty-msg">El carrito está vacío</p>';
        }
    }
}

// Elimina un artículo del carrito por su índice
function eliminarDelCarrito(index) {
    carrito.splice(index, 1);
    actualizarInterfazCarrito();
}

// ════════════════════════════════════════════════════════════════════════════════
// 4. GESTIÓN DE DASHBOARD - Carga datos de tickets, inventario y estadísticas
// ════════════════════════════════════════════════════════════════════════════════
// Carga todos los tickets del usuario desde la base de datos
async function cargarTablaTickets() {
    const tabla = document.getElementById('cuerpo-tabla-tickets');
    if (!tabla) return;

    try {
        const res = await fetch('/api/tickets');
        const tickets = await res.json();

        tabla.innerHTML = '';
        if (tickets.length === 0) {
            tabla.innerHTML = '<tr><td colspan="8" class="empty-msg">No hay actividad reciente en préstamos.</td></tr>';
            return;
        }

        tickets.forEach(t => {
            const esMiAlquiler = t.rol === 'MI_ALQUILER';
            
            const badgeRol = esMiAlquiler 
                ? '<span class="badge-custom badge-pedido"><i class="fas fa-shopping-bag"></i> Mi Alquiler</span>' 
                : '<span class="badge-custom badge-prestamo"><i class="fas fa-hand-holding-usd"></i> Me Alquilaron</span>';

            const usuarioLabel = esMiAlquiler 
                ? '<span class="user-me">Yo</span>' 
                : '<span class="user-other">Cliente</span>';

            let acciones = '';
            if (esMiAlquiler && t.estado === 'Entregado') {
                acciones = `<button onclick="devolverArticulo(${t.id})" class="btn-action small">Devolver</button>`;
            } else if (!esMiAlquiler && (t.estado === 'Pendiente' || t.estado === 'En Progreso')) {
                acciones = `<button onclick="confirmarTicket(${t.id})" class="btn-action small">Entregar</button>`;
            } else {
                acciones = '<i class="fas fa-check-circle text-success"></i>';
            }

            tabla.innerHTML += `
                <tr class="${esMiAlquiler ? 'fila-alquiler' : 'fila-venta'}">
                    <td><span class="text-muted">#${t.id}</span></td>
                    <td><strong>${t.articulo}</strong></td>
                    <td>${usuarioLabel}</td>
                    <td>${badgeRol}</td>
                    <td><span class="status-tag status-${(t.estado || 'pendiente').toLowerCase()}">${t.estado}</span></td>
                    <td>${t.fecha_salida || '---'}</td>
                    <td><span class="price-text">$${(parseFloat(t.total) || 0).toLocaleString()}</span></td>
                    <td>${acciones}</td>
                </tr>
            `;
        });
    } catch (e) {
        console.error("Error cargando tickets:", e);
    }
}
// Actualiza los contadores (total, disponibles, prestados) en el dashboard
async function actualizarContadoresDashboard() {
    try {
        const res = await fetch('/api/dashboard/stats');
        const data = await res.json();
        
        if(document.getElementById('stat-total')) document.getElementById('stat-total').textContent = data.total || 0;
        if(document.getElementById('stat-disponibles')) document.getElementById('stat-disponibles').textContent = data.disponibles || 0;
        if(document.getElementById('stat-prestados')) document.getElementById('stat-prestados').textContent = data.prestados || 0;
        if(document.getElementById('stat-total-costo')) document.getElementById('stat-total-costo').textContent = `$${(data.total_valor || 0).toLocaleString()} COP`;
    } catch (e) {
        console.error("Error en contadores:", e);
    }
}

// ════════════════════════════════════════════════════════════════════════════════
// 5. GESTIÓN DE INVENTARIO - Carga y administra artículos del propietario
// ════════════════════════════════════════════════════════════════════════════════
async function cargarInventario(filtro = 'Todos los estados') {
    const tabla = document.getElementById('cuerpo-tabla-inventario');
    if (!tabla) return;

    try {
        const res = await fetch('/api/mis-articulos');
        let articulos = await res.json();

        // Aplicamos el filtro de estado si es necesario
        if (filtro !== 'Todos los estados') {
            articulos = articulos.filter(art => art.estado === filtro);
        }

        tabla.innerHTML = '';
        if (articulos.length === 0) {
            tabla.innerHTML = '<tr><td colspan="7" class="empty-msg">No hay artículos que coincidan.</td></tr>';
            return;
        }

        articulos.forEach(art => {
            const precioValido = parseFloat(art.precio) || 0;
            
            tabla.innerHTML += `
                <tr>
                    <td>#${art.id}</td>
                    <td><strong>${art.nombre || 'Sin nombre'}</strong></td>
                    <td>${art.categoria || 'General'}</td>
                    <td><span class="status-tag status-${(art.estado || 'disponible').toLowerCase()}">${art.estado || 'Disponible'}</span></td>
                    <td>$${precioValido.toLocaleString()}</td>
                    <td>$${(parseFloat(art.deposito_garantia) || 0).toLocaleString()}</td>
                    <td class="acciones-celda">
                        <button class="btn-tabla btn-edit" onclick="editarArticulo(${art.id})" title="Editar">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn-tabla btn-delete" onclick="eliminarArticulo(${art.id})" title="Eliminar">
                            <i class="fas fa-trash-alt"></i>
                        </button>
                    </td>
                </tr>
            `;
        });
    } catch (e) {
        console.error("Error cargando inventario:", e);
    }
}

// ════════════════════════════════════════════════════════════════════════════════
// 6. FUNCIONES DE ACCIÓN - Operaciones sobre artículos y tickets
// ════════════════════════════════════════════════════════════════════════════════
// Elimina un artículo de la base de datos después de confirmar
async function eliminarArticulo(id) {
    if (!confirm(`¿Estás seguro de eliminar el artículo #${id}?`)) return;
    
    try {
        const res = await fetch(`/api/inventario/eliminar/${id}`, { method: 'DELETE' });
        const data = await res.json();
        if (data.success) {
            alert("Artículo eliminado.");
            cargarInventario(); 
        } else {
            alert("Error: " + (data.error || data.message));
        }
    } catch (e) {
        console.error("Error al eliminar:", e);
        alert("Error al eliminar el artículo");
    }
}

function editarArticulo(id) {
    window.location.href = `/editar-articulo?id=${id}`;
}

async function confirmarTicket(id) {
    if(!confirm(`¿Confirmas que el equipo del ticket #${id} ha sido entregado?`)) return;
    
    try {
        const res = await fetch(`/api/prestamos/${id}/confirmar-entrega`, { method: 'POST' });
        const data = await res.json();
        
        if (data.success) {
            alert('Entrega confirmada');
            cargarTablaTickets();
        } else {
            alert('Error: ' + (data.message || 'Error desconocido'));
        }
    } catch (e) {
        console.error("Error:", e);
        alert('Error al confirmar entrega');
    }
}

async function devolverArticulo(id) {
    if(!confirm(`¿Estás devolviendo el artículo del ticket #${id}?`)) return;
    
    try {
        const res = await fetch(`/api/prestamos/${id}/devolver`, { method: 'POST' });
        const data = await res.json();
        
        if (data.success) {
            alert('Artículo devuelto exitosamente');
            cargarTablaTickets();
        } else {
            alert('Error: ' + (data.message || 'Error desconocido'));
        }
    } catch (e) {
        console.error("Error:", e);
        alert('Error al devolver artículo');
    }
}

// ════════════════════════════════════════════════════════════════════════════════
// 6.5 MODAL DE ÉXITO - Muestra confirmación cuando se crea un ticket
// ════════════════════════════════════════════════════════════════════════════════
// Muestra el modal de éxito con animación cuando se reserva un artículo
function mostrarModalExito(idTicket) {
    const modal = document.getElementById('modal-exito');
    const ticketNumber = document.getElementById('ticket-number');
    if (modal && ticketNumber) {
        ticketNumber.textContent = `Número de ticket: #${idTicket}`;
        modal.classList.remove('hidden');
    }
}

// Cierra el modal de éxito
function cerrarModalExito() {
    const modal = document.getElementById('modal-exito');
    if (modal) modal.classList.add('hidden');
}

// ════════════════════════════════════════════════════════════════════════════════
// 7. PROCESAR CARRITO Y CREAR PRÉSTAMOS
// ════════════════════════════════════════════════════════════════════════════════
// Procesa la compra de los artículos en el carrito y crea un ticket
async function procesarCarrito() {
    if (carrito.length === 0) {
        alert("El carrito está vacío");
        return;
    }

    try {
        const res = await fetch('/api/prestamos/crear', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ items: carrito })
        });
        const data = await res.json();

        if (data.success) {
            mostrarModalExito(data.id_ticket);
            carrito = [];
            actualizarInterfazCarrito();
            document.getElementById('modal-carrito').classList.add('hidden');
            
            // Recargar catálogo para actualizar estados
            setTimeout(() => cargarArticulos(), 1000);
        } else {
            alert("Error: " + (data.message || 'Error desconocido'));
        }
    } catch (e) {
        console.error("Error al crear préstamo:", e);
        alert('Error al procesar el carrito');
    }
}

// ════════════════════════════════════════════════════════════════════════════════
// 8. FILTROS Y BÚSQUEDA
// ════════════════════════════════════════════════════════════════════════════════
// Configura los filtros de categoría y búsqueda en la página pública
function configurarFiltros() {
    // Filtro de búsqueda
    const searchInput = document.querySelector('.search-wrapper input');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            const termino = e.target.value.toLowerCase();
            document.querySelectorAll('.product-card').forEach(card => {
                const nombre = card.dataset.nombre || '';
                card.style.display = nombre.includes(termino) ? 'block' : 'none';
            });
        });
    }

    // Filtro de categorías
    const chips = document.querySelectorAll('.category-filters .chip');
    chips.forEach(chip => {
        chip.addEventListener('click', () => {
            // Remover activo de todos
            chips.forEach(c => c.classList.remove('active'));
            // Agregar activo al clickeado
            chip.classList.add('active');
            
            const categoria = chip.textContent.trim();
            const cards = document.querySelectorAll('.product-card');
            
            cards.forEach(card => {
                if (categoria === 'Todos') {
                    card.style.display = 'block';
                } else {
                    card.style.display = card.dataset.categoria === categoria.toLowerCase() ? 'block' : 'none';
                }
            });
        });
    });
}

// ════════════════════════════════════════════════════════════════════════════════
// 9. EVENTOS DE UI Y LOGOUT
// ════════════════════════════════════════════════════════════════════════════════
function configurarEventosUI() {
    // Botón "Comenzar a alquilar" en el hero
    const btnComenzarAlquilar = document.getElementById('btn-comenzar-alquilar');
    if (btnComenzarAlquilar) {
        btnComenzarAlquilar.addEventListener('click', () => {
            // Si no está logueado, ir a login
            if (!usuarioLogueado) {
                window.location.href = '/auth/login';
            }
            // Si está logueado, no hacer nada (porque ya está en la página con artículos)
        });
    }
    
    // Cerrar modales y carrito
    document.querySelectorAll('.close-modal, .close-carrito, #cerrar-carrito').forEach(btn => {
        if (btn) {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                document.querySelectorAll('.custom-modal, .cart-overlay, .modal-overlay').forEach(m => m.classList.add('hidden'));
            });
        }
    });

    // Abrir carrito
    const btnCarrito = document.getElementById('btn-carrito');
    if (btnCarrito) {
        btnCarrito.addEventListener('click', () => {
            document.getElementById('modal-carrito').classList.remove('hidden');
        });
    }

    // Procesar carrito
    const btnProcesar = document.getElementById('btn-procesar-carrito');
    if (btnProcesar) {
        btnProcesar.addEventListener('click', procesarCarrito);
    }

    // Perfil y menú
    const btnProfile = document.getElementById('btn-profile');
    if (btnProfile) {
        btnProfile.addEventListener('click', (e) => {
            e.stopPropagation();
            const dropdown = document.getElementById('profile-dropdown');
            if (dropdown) dropdown.classList.toggle('hidden');
        });
    }

    // Logout
    const menuLogout = document.getElementById('menu-logout');
    if (menuLogout) {
        menuLogout.addEventListener('click', async () => {
            await fetch('/logout');
            window.location.href = '/auth/login';
        });
    }

    // Cerrar dropdown al clickear fuera
    document.addEventListener('click', () => {
        const drop = document.getElementById('profile-dropdown');
        if (drop) drop.classList.add('hidden');
    });

    // Modal de nuevo artículo (si existe)
    const btnPublicar = document.getElementById('btn-publicar-articulo');
    if (btnPublicar) {
        btnPublicar.addEventListener('click', () => {
            const modal = document.getElementById('modal-nuevo-articulo');
            if (modal) modal.classList.remove('hidden');
        });
    }
}

// 6. FUNCIONES DE ACCIÓN DEL INVENTARIO
async function eliminarArticulo(id) {
    if (!confirm(`¿Estás seguro de eliminar el artículo #${id}?`)) return;
    
    try {
        const res = await fetch(`/api/articulos/eliminar/${id}`, { method: 'DELETE' });
        const data = await res.json();
        if (data.success) {
            alert("Artículo eliminado.");
            cargarInventario(); // Recargamos la tabla
        } else {
            alert("Error: " + data.message);
        }
    } catch (e) {
        console.error("Error al eliminar:", e);
    }
}

function editarArticulo(id) {
    // Redirigir a la página de edición con el ID en la URL
    window.location.href = `/editar-articulo?id=${id}`;
}

// 7. EVENTOS DE UI Y LOGOUT
async function procesarPrestamo() {
    if (carrito.length === 0) return alert("El carrito está vacío");

    try {
        const res = await fetch('/api/prestamos/crear', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ items: carrito })
        });
        const data = await res.json();

        if (data.success) {
            const modal = document.getElementById('modal-exito');
            if (modal) {
                document.getElementById('success-message').textContent = '¡Ticket generado con éxito!';
                document.getElementById('ticket-number').textContent = '';
                modal.classList.remove('hidden');
            }
            carrito = [];
            actualizarInterfazCarrito();
            setTimeout(() => window.location.href = '/dashboard', 1500);
        } else {
            alert("Error: " + data.message);
        }
    } catch (e) {
        console.error("Error al enviar préstamo:", e);
    }
}

function configurarEventosDashboard() {
    // --- Lógica del Filtro de Estados ---
    const selectFiltro = document.querySelector('.inventory-header select');
    if (selectFiltro) {
        selectFiltro.addEventListener('change', (e) => {
            cargarInventario(e.target.value);
        });
    }

    document.querySelectorAll('.close-modal, #cerrar-carrito').forEach(btn => {
        btn.onclick = () => {
            document.querySelectorAll('.custom-modal, .cart-overlay, .modal-overlay').forEach(m => m.classList.add('hidden'));
        };
    });

    const btnCarrito = document.getElementById('btn-carrito');
    if (btnCarrito) {
        btnCarrito.onclick = () => document.getElementById('modal-carrito').classList.remove('hidden');
    }

    const btnProcesar = document.getElementById('btn-procesar-carrito');
    if (btnProcesar) btnProcesar.onclick = procesarPrestamo;

    const btnProfile = document.getElementById('btn-profile');
    if (btnProfile) {
        btnProfile.onclick = (e) => {
            e.stopPropagation();
            document.getElementById('profile-dropdown').classList.toggle('hidden');
        };
    }

    const menuLogout = document.getElementById('menu-logout');
    if (menuLogout) {
        menuLogout.onclick = async () => {
            // Ajustamos a la ruta definida en tu __init__.py
            await fetch('/logout'); 
            window.location.href = '/auth/login';
        };
    }

    window.onclick = () => {
        const drop = document.getElementById('profile-dropdown');
        if (drop) drop.classList.add('hidden');
    };
}

function confirmarTicket(id) {
    if(confirm(`¿Confirmas que el equipo del ticket #${id} ha sido entregado?`)) {
        // Aquí llamarías a tu API para actualizar el estado a "Finalizado"
        console.log("Ticket finalizado:", id);
    }
}