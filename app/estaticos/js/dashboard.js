// ════════════════════════════════════════════════════════════════════════════════
// DASHBOARD - Gestiona inventario, tickets, búsqueda y filtros del propietario
// ════════════════════════════════════════════════════════════════════════════════

document.addEventListener('DOMContentLoaded', () => {
    
    // Verifica que el usuario esté autenticado y carga su información
    async function verificarSesion() {
        try {
            const response = await fetch('/api/user_info');
            if (response.ok) {
                const data = await response.json();
                const nombre = data.nombre_completo || data.nombre || "Usuario";
                document.getElementById('dashboard-user-name').textContent = nombre;
                document.getElementById('dashboard-user-email').textContent = data.correo || "";
                
                const iniciales = nombre.split(' ').map(n => n[0]).join('').toUpperCase();
                const avatar = document.getElementById('user-avatar-initials');
                if (avatar) avatar.textContent = iniciales.substring(0, 2);
            } else {
                console.warn("No se detectó sesión activa.");
            }
        } catch (error) {
            console.error("Error de conexión con el servidor.");
        }
    }

    // === 1. SELECTORES DE INTERFAZ ===
    const navItems = document.querySelectorAll('.nav-item');
    const views = document.querySelectorAll('.content-view');
    const btnLogout = document.getElementById('btn-logout');
    
    // Variables para caché de artículos y tickets para búsqueda
    let articulosCache = [];
    let ticketsCache = [];

    const modalArticulo = document.getElementById('modal-articulo');
    const btnOpenModal = document.getElementById('btn-open-modal-articulo');
    const btnCloseModal = document.getElementById('btn-close-modal-articulo');
    const btnCancelModal = document.getElementById('btn-cancel-modal');
    const formArticulo = document.getElementById('form-articulo');

    // Crea dropdowns personalizados para filtros con estilos custom
    function setupCustomDropdown(btnId, dropdownId, hiddenSelectId, callback) {
        const btn = document.getElementById(btnId);
        const dropdown = document.getElementById(dropdownId);
        const hiddenSelect = document.getElementById(hiddenSelectId);
        if (!btn || !dropdown || !hiddenSelect) return;

        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const isVisible = dropdown.style.display === 'block';
            document.querySelectorAll('.custom-select-dropdown').forEach(d => d.style.display = 'none');
            dropdown.style.display = isVisible ? 'none' : 'block';
        });

        dropdown.querySelectorAll('.custom-option').forEach(option => {
            option.addEventListener('click', () => {
                const val = option.getAttribute('data-value');
                hiddenSelect.value = val;
                
                // Actualizar visual del botón (label y punto de color)
                const label = btn.querySelector('#' + btnId.replace('btn', 'label'));
                if (label) label.textContent = option.textContent.trim();
                
                // Actualizar clase activa
                dropdown.querySelectorAll('.custom-option').forEach(opt => opt.classList.remove('active'));
                option.classList.add('active');

                dropdown.style.display = 'none';
                if (callback) callback(val);
            });
        });
    }

    // Activar dropdowns del diseño
    setupCustomDropdown('inv-estado-btn', 'inv-estado-dropdown', 'filter-estado-inv', (val) => {
        // Cuando cambia el estado, recargar y aplicar búsqueda
        cargarInventario(val);
        // Disparar el evento de búsqueda si hay texto
        const searchInput = document.getElementById('inventory-search');
        if (searchInput && searchInput.value) {
            searchInput.dispatchEvent(new Event('input'));
        }
    });
    setupCustomDropdown('modal-estado-btn', 'modal-estado-dropdown', 'articulo-estado');
    setupCustomDropdown('tick-estado-btn', 'tick-estado-dropdown', 'filter-estado-tick', () => {
        cargarTickets();
        // Disparar el evento de búsqueda si hay texto
        const ticketsSearchInput = document.getElementById('tickets-search');
        if (ticketsSearchInput && ticketsSearchInput.value) {
            ticketsSearchInput.dispatchEvent(new Event('input'));
        }
    });

    // === 3. NAVEGACIÓN (SPA) ===
    navItems.forEach(item => {
        item.addEventListener('click', () => {
            const targetView = item.getAttribute('data-view');
            navItems.forEach(i => i.classList.remove('active'));
            item.classList.add('active');

            views.forEach(view => {
                view.classList.toggle('active', view.id === targetView);
            });

            if (targetView === 'view-inventario') cargarInventario();
            if (targetView === 'view-dashboard') cargarResumenDashboard();
            if (targetView === 'view-tickets') {
                cargarTickets();
                cargarResumenDashboard();
            }
        });
    });

    // === 4. CONTROL DEL MODAL ===
    // Función para cargar categorías en el modal
    window.cargarCategoriasPorModal = async function() {
        try {
            const response = await fetch('/api/categorias');
            const categorias = await response.json();
            const selectCategoria = document.getElementById('articulo-categoria');
            
            if (selectCategoria) {
                // Mantener la opción por defecto
                selectCategoria.innerHTML = '<option value="">-- Selecciona una categoría --</option>';
                
                // Agregar las categorías dinámicamente
                categorias.forEach(cat => {
                    const option = document.createElement('option');
                    option.value = cat.id;
                    option.textContent = cat.nombre;
                    selectCategoria.appendChild(option);
                });
            }
        } catch (e) {
            console.error("Error al cargar categorías:", e);
        }
    };

    const toggleModal = (show) => {
        if (!modalArticulo) return;
        modalArticulo.style.display = show ? 'flex' : 'none';
        if (show) {
            cargarCategoriasPorModal();
        } else {
            formArticulo.reset();
            delete formArticulo.dataset.editId;
            document.getElementById('modal-title-text').textContent = "Nuevo Artículo";
            document.getElementById('btn-save-articulo').innerHTML = '<i class="fas fa-plus"></i> Crear Artículo';
            const fileNameDisplay = document.getElementById('file-name-display');
            if (fileNameDisplay) fileNameDisplay.textContent = 'Examinar archivo';
        }
    };

    if (btnOpenModal) btnOpenModal.onclick = () => toggleModal(true);
    if (btnCloseModal) btnCloseModal.onclick = () => toggleModal(false);
    if (btnCancelModal) btnCancelModal.onclick = () => toggleModal(false);

    // === 5. ESTADÍSTICAS DASHBOARD ===
    async function cargarResumenDashboard() {
        try {
            // Cargar estadísticas del dashboard
            const response = await fetch('/api/dashboard/stats');
            const stats = await response.json();

            const actualizar = (id, valor) => {
                const el = document.getElementById(id);
                if (el) el.textContent = valor || 0;
            };

            actualizar('stat-total', stats.total);
            actualizar('stat-disponibles', stats.disponibles);
            actualizar('stat-prestados', stats.prestados);
            const statCosto = document.getElementById('stat-total-costo');
            if (statCosto) {
                const valorTotal = Number(stats.valor_total || 0);
                statCosto.textContent = '$' + valorTotal.toLocaleString('es-CO') + ' COP';
            }
            
            if (document.getElementById('stat-disponibles-pct') && stats.total > 0) {
                const pct = Math.round((stats.disponibles / stats.total) * 100);
                document.getElementById('stat-disponibles-pct').textContent = pct + "%";
            }

            // Cargar últimos préstamos
            try {
                const respPrestamos = await fetch('/api/ultimos-prestamos');
                const prestamos = await respPrestamos.json();
                const container = document.getElementById('recent-tickets-list');
                if (container) {
                    if (prestamos.length === 0) {
                        container.innerHTML = '<p class="empty-msg">Sin préstamos recientes</p>';
                    } else {
                        container.innerHTML = prestamos.map(p => `
                            <div class="activity-item">
                                <div class="activity-icon"><i class="fas fa-exchange-alt"></i></div>
                                <div class="activity-text">
                                    <h4>${p.articulo || 'N/A'}</h4>
                                    <p>${p.cliente || 'Cliente'} - <span class="estado-${(p.estado || 'Pendiente').toLowerCase()}">${p.estado || 'Pendiente'}</span></p>
                                </div>
                            </div>
                        `).join('');
                    }
                }
            } catch (e) {
                console.warn("No se pudieron cargar últimos préstamos:", e);
            }
        } catch (e) { 
            console.error("Error stats:", e);
        }
    }

    // === 6. GESTIÓN INVENTARIO ===
    async function cargarInventario(estadoFiltrado = 'todos') {
        const tableBody = document.getElementById('inventory-body');
        if (!tableBody) return;
        tableBody.innerHTML = '<tr><td colspan="7">Cargando...</td></tr>';

        try {
            const response = await fetch('/api/inventario');
            let articulos = await response.json();
            
            // Guardar en caché para búsqueda
            articulosCache = articulos;

            if (estadoFiltrado !== 'todos') {
                articulos = articulos.filter(art => art.estado === estadoFiltrado);
            }

            tableBody.innerHTML = '';
            if (articulos.length === 0) {
                tableBody.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:20px;">Sin artículos en el inventario</td></tr>';
            } else {
                articulos.forEach(art => {
                    tableBody.innerHTML += `
                        <tr>
                            <td>#${art.id}</td>
                            <td><strong>${art.nombre}</strong></td>
                            <td>${art.categoria_id || 'General'}</td>
                            <td><span class="status-badge status-${(art.estado || 'Disponible').toLowerCase()}">${art.estado || 'Disponible'}</span></td>
                            <td>$${Number(art.precio_alquiler || 0).toLocaleString()}</td>
                            <td>${art.fecha_adquisicion ? art.fecha_adquisicion.substring(0, 10) : '---'}</td>
                            <td class="actions-cell">
                                <button onclick="editarArticulo(${art.id})" class="btn-tabla btn-edit" title="Editar"><i class="fas fa-pen"></i></button>
                                <button onclick="eliminarArticulo(${art.id})" class="btn-tabla btn-delete" title="Eliminar"><i class="fas fa-trash"></i></button>
                            </td>
                        </tr>`;
                });
            }
        } catch (e) { 
            console.error("Error cargando inventario:", e);
            tableBody.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:20px;color:red;">Error de carga. Por favor recarga la página.</td></tr>'; 
        }
    }

    // === 7. GESTIÓN TICKETS ===
    async function cargarTickets() {
        const ticketsBody = document.getElementById('tickets-body');
        const miniPendientes = document.getElementById('mini-pendientes');
        const miniProgreso = document.getElementById('mini-progreso');
        const miniDevueltos = document.getElementById('mini-devueltos');
        if (!ticketsBody) return;
        
        try {
            const res = await fetch('/api/tickets');
            const tickets = await res.json();
            
            // Guardar en caché para búsqueda
            ticketsCache = tickets;
            
            let pendientes = 0;
            let progreso = 0;
            let devueltos = 0;

            tickets.forEach(t => {
                const estadoNormalizado = (t.estado || 'pendiente')
                    .toString()
                    .toLowerCase()
                    .normalize('NFD')
                    .replace(/[\u0300-\u036f]/g, '')
                    .trim();

                if (estadoNormalizado === 'pendiente') {
                    pendientes += 1;
                } else if (estadoNormalizado === 'devuelto' || estadoNormalizado === 'devueltos') {
                    devueltos += 1;
                } else if (estadoNormalizado === 'en progreso' || estadoNormalizado === 'en_progreso' || estadoNormalizado === 'entregado') {
                    progreso += 1;
                }
            });

            if (miniPendientes) miniPendientes.textContent = String(pendientes);
            if (miniProgreso) miniProgreso.textContent = String(progreso);
            if (miniDevueltos) miniDevueltos.textContent = String(devueltos);

            ticketsBody.innerHTML = '';
            if (tickets.length === 0) {
                ticketsBody.innerHTML = '<tr><td colspan="8" style="text-align:center;padding:20px;">Sin tickets de préstamo</td></tr>';
            } else {
                tickets.forEach(t => {
                    const estado = (t.estado || 'Pendiente').toLowerCase();
                    const rol = t.rol || 'cliente';
                    
                    // Determinar el botón según el rol y el estado
                    let btnHTML = '';
                    
                    // Si es el dueño del artículo (ME_ALQUILARON)
                    if (rol === 'ME_ALQUILARON') {
                        if (estado === 'pendiente') {
                            btnHTML = `<button class="btn-tabla btn-primary" onclick="confirmarEntrega(${t.id})" title="Confirmar Entrega"><i class="fas fa-check"></i></button>`;
                        } else if (estado === 'entregado' || estado === 'en progreso' || estado === 'en_progreso') {
                            btnHTML = `<button class="btn-tabla btn-primary" onclick="confirmarDevolucion(${t.id})" title="Confirmar Devolución"><i class="fas fa-undo"></i></button>`;
                        } else if (estado === 'devuelto') {
                            btnHTML = `<button class="btn-tabla btn-primary" disabled title="Devuelto"><i class="fas fa-check-double"></i></button>`;
                        }
                    } 
                    // Si es el cliente (MI_ALQUILER)
                    else if (rol === 'MI_ALQUILER') {
                        if (estado === 'entregado' || estado === 'en progreso' || estado === 'en_progreso') {
                            btnHTML = `<button class="btn-tabla btn-primary" onclick="devolverPrestamo(${t.id})" title="Devolver Artículo"><i class="fas fa-undo"></i></button>`;
                        } else if (estado === 'devuelto') {
                            btnHTML = `<button class="btn-tabla btn-primary" disabled title="Devuelto"><i class="fas fa-check-double"></i></button>`;
                        } else {
                            btnHTML = `<button class="btn-tabla btn-primary" disabled title="Esperando confirmación"><i class="fas fa-hourglass"></i></button>`;
                        }
                    }
                    
                    // Formatear fecha a dd/mm/yyyy
                    let fechaFormato = 'N/A';
                    if (t.fecha_salida) {
                        try {
                            const fecha = new Date(t.fecha_salida);
                            if (!isNaN(fecha.getTime())) {
                                const day = String(fecha.getDate()).padStart(2, '0');
                                const month = String(fecha.getMonth() + 1).padStart(2, '0');
                                const year = fecha.getFullYear();
                                fechaFormato = `${day}/${month}/${year}`;
                            }
                        } catch (e) {
                            fechaFormato = 'N/A';
                        }
                    }
                    
                    ticketsBody.innerHTML += `
                        <tr>
                            <td>#${t.id || 'N/A'}</td>
                            <td>${t.cliente || 'N/A'}</td>
                            <td>${t.articulo || 'N/A'}</td>
                            <td><span class="status-badge status-${estado}">${t.estado || 'Pendiente'}</span></td>
                            <td>${fechaFormato}</td>
                            <td>${t.total ? '$' + Number(t.total).toLocaleString() : '$0'}</td>
                            <td>${rol === 'ME_ALQUILARON' ? 'Dueño' : 'Cliente'}</td>
                            <td>
                                ${btnHTML}
                            </td>
                        </tr>`;
                });
            }
        } catch (e) { 
            console.error("Error cargando tickets:", e);
            ticketsBody.innerHTML = '<tr><td colspan="8" style="text-align:center;padding:20px;color:red;">Error al cargar tickets</td></tr>'; 
        }
    }

    // Enviar Formulario Artículo
    if (formArticulo) {
        formArticulo.onsubmit = async (e) => {
            e.preventDefault();
            const idEdit = formArticulo.dataset.editId;
            const esEdicion = Boolean(idEdit);
            const url = esEdicion ? `/api/inventario/editar/${idEdit}` : '/api/inventario/nuevo';
            const formData = new FormData();
            formData.append('nombre', document.getElementById('articulo-nombre').value);
            formData.append('categoria_id', document.getElementById('articulo-categoria').value);
            formData.append('estado_articulo', document.getElementById('articulo-estado').value);
            formData.append('precio_alquiler', document.getElementById('articulo-precio-alquiler').value);
            formData.append('precio', document.getElementById('articulo-precio').value);
            formData.append('fecha_adquisicion', document.getElementById('articulo-fecha-adquisicion')?.value || '');
            formData.append('descripcion', document.getElementById('articulo-descripcion')?.value || '');

            const imagenInput = document.getElementById('articulo-imagen');
            if (imagenInput && imagenInput.files && imagenInput.files[0]) {
                formData.append('imagen', imagenInput.files[0]);
            }

            const res = await fetch(url, {
                method: esEdicion ? 'PUT' : 'POST',
                body: formData
            });

            if (res.ok) {
                mostrarMensaje('Éxito', 'Artículo ' + (idEdit ? 'actualizado' : 'creado') + ' exitosamente');
                toggleModal(false);
                cargarInventario();
                cargarResumenDashboard();
            } else {
                const error = await res.json();
                mostrarMensaje('Error', error.error || 'No se pudo guardar el artículo');
            }
        };
    }

    // === 8. LOGOUT ===
    if (btnLogout) {
        btnLogout.onclick = () => {
            mostrarModalConfirmacion('Cerrar Sesión', '¿Deseas cerrar tu sesión?', () => {
                window.location.href = "/logout";
            });
        };
    }

    // Cierre de dropdowns al hacer clic fuera
    window.addEventListener('click', () => {
        document.querySelectorAll('.custom-select-dropdown').forEach(d => d.style.display = 'none');
    });

    // Actualizar nombre de archivo cuando se selecciona imagen
    const fileInput = document.getElementById('articulo-imagen');
    const fileNameDisplay = document.getElementById('file-name-display');
    if (fileInput && fileNameDisplay) {
        fileInput.addEventListener('change', (e) => {
            if (e.target.files && e.target.files[0]) {
                fileNameDisplay.textContent = e.target.files[0].name;
            } else {
                fileNameDisplay.textContent = 'Examinar archivo';
            }
        });
    }

    // Filtro de búsqueda de inventario
    const searchInput = document.getElementById('inventory-search');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            const searchTerm = e.target.value.toLowerCase();
            const tableBody = document.getElementById('inventory-body');
            const estadoFiltrado = document.getElementById('filter-estado-inv')?.value || 'todos';
            
            if (!tableBody || articulosCache.length === 0) return;
            
            let articulosFiltrados = articulosCache.filter(art => {
                const nombreCoincide = art.nombre.toLowerCase().includes(searchTerm);
                const estadoCoincide = estadoFiltrado === 'todos' || art.estado === estadoFiltrado;
                return nombreCoincide && estadoCoincide;
            });
            
            tableBody.innerHTML = '';
            if (articulosFiltrados.length === 0) {
                tableBody.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:20px;">No se encontraron artículos</td></tr>';
            } else {
                articulosFiltrados.forEach(art => {
                    tableBody.innerHTML += `
                        <tr>
                            <td>#${art.id}</td>
                            <td><strong>${art.nombre}</strong></td>
                            <td>${art.categoria_id || 'General'}</td>
                            <td><span class="status-badge status-${(art.estado || 'Disponible').toLowerCase()}">${art.estado || 'Disponible'}</span></td>
                            <td>$${Number(art.precio_alquiler || 0).toLocaleString()}</td>
                            <td>${art.fecha_adquisicion ? art.fecha_adquisicion.substring(0, 10) : '---'}</td>
                            <td class="actions-cell">
                                <button onclick="editarArticulo(${art.id})" class="btn-tabla btn-edit" title="Editar"><i class="fas fa-pen"></i></button>
                                <button onclick="eliminarArticulo(${art.id})" class="btn-tabla btn-delete" title="Eliminar"><i class="fas fa-trash"></i></button>
                            </td>
                        </tr>`;
                });
            }
        });
    }

    // Filtro de búsqueda de tickets
    const ticketsSearchInput = document.getElementById('tickets-search');
    if (ticketsSearchInput) {
        ticketsSearchInput.addEventListener('input', (e) => {
            const searchTerm = e.target.value.toLowerCase();
            const ticketsBody = document.getElementById('tickets-body');
            
            if (!ticketsBody || ticketsCache.length === 0) return;
            
            let ticketsFiltrados = ticketsCache.filter(t => {
                const clienteCoincide = (t.cliente || '').toLowerCase().includes(searchTerm);
                const articuloCoincide = (t.articulo || '').toLowerCase().includes(searchTerm);
                return clienteCoincide || articuloCoincide;
            });
            
            ticketsBody.innerHTML = '';
            if (ticketsFiltrados.length === 0) {
                ticketsBody.innerHTML = '<tr><td colspan="8" style="text-align:center;padding:20px;">No se encontraron tickets</td></tr>';
            } else {
                ticketsFiltrados.forEach(t => {
                    const estado = (t.estado || 'Pendiente').toLowerCase();
                    const btnText = estado === 'pendiente' ? 'Aceptar Préstamo' : estado === 'entregado' ? 'Devolver' : 'Ver';
                    const btnOnClick = estado === 'pendiente' ? `aceptarPrestamo(${t.id})` : estado === 'entregado' ? `devolverPrestamo(${t.id})` : `mostrarMensaje('Ticket #${t.id}', 'Detalles del ticket #${t.id}')`;
                    
                    // Formatear fecha a dd/mm/yyyy
                    let fechaFormato = 'N/A';
                    if (t.fecha_salida) {
                        try {
                            const fecha = new Date(t.fecha_salida);
                            if (!isNaN(fecha.getTime())) {
                                const day = String(fecha.getDate()).padStart(2, '0');
                                const month = String(fecha.getMonth() + 1).padStart(2, '0');
                                const year = fecha.getFullYear();
                                fechaFormato = `${day}/${month}/${year}`;
                            }
                        } catch (e) {
                            fechaFormato = 'N/A';
                        }
                    }
                    
                    ticketsBody.innerHTML += `
                        <tr>
                            <td>#${t.id || 'N/A'}</td>
                            <td>${t.cliente || 'N/A'}</td>
                            <td>${t.articulo || 'N/A'}</td>
                            <td><span class="status-badge status-${estado}">${t.estado || 'Pendiente'}</span></td>
                            <td>${fechaFormato}</td>
                            <td>${t.total ? '$' + Number(t.total).toLocaleString() : '$0'}</td>
                            <td>${t.rol || 'cliente'}</td>
                            <td>
                                <button class="btn-tabla btn-primary" onclick="${btnOnClick}" title="${btnText}">
                                    <i class="fas fa-${estado === 'pendiente' ? 'check' : estado === 'entregado' ? 'undo' : 'eye'}"></i>
                                </button>
                            </td>
                        </tr>`;
                });
            }
        });
    }

    // Inicio
    verificarSesion();
    cargarResumenDashboard();
    cargarInventario();
});

// Globales
window.editarArticulo = async function(id) {
    try {
        const res = await fetch(`/api/inventario/${id}`);
        const art = await res.json();
        
        document.getElementById('articulo-nombre').value = art.nombre || '';
        document.getElementById('articulo-categoria').value = art.categoria_id || '';
        document.getElementById('articulo-estado').value = art.estado || 'Disponible';
        document.getElementById('articulo-precio').value = art.precio || 0;
        document.getElementById('articulo-precio-alquiler').value = art.precio_alquiler || 0;
        document.getElementById('articulo-fecha-adquisicion').value = art.fecha_adquisicion ? String(art.fecha_adquisicion).substring(0, 10) : '';
        document.getElementById('articulo-descripcion').value = art.descripcion || '';
        
        const form = document.getElementById('form-articulo');
        form.dataset.editId = id;
        document.getElementById('modal-title-text').textContent = "Editando Artículo #" + id;
        document.getElementById('btn-save-articulo').innerHTML = '<i class="fas fa-save"></i> Guardar Cambios';
        
        // Mostrar nombre de archivo si existe
        const fileNameDisplay = document.getElementById('file-name-display');
        if (fileNameDisplay) {
            const imagenNombre = art.imagen_url || art.imagen || '';
            fileNameDisplay.textContent = imagenNombre ? imagenNombre.split('/').pop() : 'Examinar archivo';
        }
        
        // Cargar categorías primero
        await cargarCategoriasPorModal();
        document.getElementById('modal-articulo').style.display = 'flex';
    } catch (e) {
        mostrarMensaje('Error', 'Error al cargar el artículo');
        console.error(e);
    }
};

window.eliminarArticulo = async function(id) {
    mostrarModalConfirmacion('Eliminar Artículo', '¿Estás seguro de que deseas eliminar este artículo?', async () => {
        const res = await fetch(`/api/inventario/eliminar/${id}`, { method: 'DELETE' });
        if (res.ok) {
            mostrarMensaje('Éxito', 'Artículo eliminado exitosamente');
            cargarInventario();
        } else {
            mostrarMensaje('Error', 'No se pudo eliminar el artículo');
        }
    });
};

// Función auxiliar para mostrar mensaje (sin necesidad de confirmación)
window.mostrarMensaje = function(titulo, mensaje) {
    const modal = document.getElementById('modal-confirmacion');
    const modalTitulo = document.getElementById('modal-titulo');
    const modalMensaje = document.getElementById('modal-mensaje');
    const btnConfirmar = document.getElementById('btn-confirmar-accion');
    const btnCancelar = document.getElementById('btn-cancelar-confirmacion');
    const btnClose = document.getElementById('btn-close-confirmacion');

    modalTitulo.textContent = titulo;
    modalMensaje.textContent = mensaje;
    btnConfirmar.textContent = 'Aceptar';
    btnCancelar.style.display = 'none';
    modal.style.display = 'flex';

    const handleClose = () => {
        modal.style.display = 'none';
        btnConfirmar.removeEventListener('click', handleClose);
        btnClose.removeEventListener('click', handleClose);
        btnCancelar.style.display = 'block';
    };

    btnConfirmar.addEventListener('click', handleClose);
    btnClose.addEventListener('click', handleClose);
};

// Función auxiliar para mostrar modal de confirmación
window.mostrarModalConfirmacion = function(titulo, mensaje, onConfirm) {
    const modal = document.getElementById('modal-confirmacion');
    const modalTitulo = document.getElementById('modal-titulo');
    const modalMensaje = document.getElementById('modal-mensaje');
    const btnConfirmar = document.getElementById('btn-confirmar-accion');
    const btnCancelar = document.getElementById('btn-cancelar-confirmacion');
    const btnClose = document.getElementById('btn-close-confirmacion');

    modalTitulo.textContent = titulo;
    modalMensaje.textContent = mensaje;
    btnConfirmar.textContent = 'Confirmar';
    btnCancelar.style.display = 'block';
    modal.style.display = 'flex';

    const handleConfirm = () => {
        modal.style.display = 'none';
        btnConfirmar.removeEventListener('click', handleConfirm);
        btnCancelar.removeEventListener('click', handleCancel);
        btnClose.removeEventListener('click', handleCancel);
        if (onConfirm) onConfirm();
    };

    const handleCancel = () => {
        modal.style.display = 'none';
        btnConfirmar.removeEventListener('click', handleConfirm);
        btnCancelar.removeEventListener('click', handleCancel);
        btnClose.removeEventListener('click', handleCancel);
    };
    
    btnConfirmar.addEventListener('click', handleConfirm);
    btnCancelar.addEventListener('click', handleCancel);
    btnClose.addEventListener('click', handleCancel);
};

// Aceptar préstamo (como dueño del artículo)
window.aceptarPrestamo = async function(ticketId) {
    window.mostrarModalConfirmacion(
        '¿Confirmar entrega?',
        '¿Deseas confirmar la entrega de este artículo al usuario?',
        async () => {
            try {
                const res = await fetch(`/api/prestamos/${ticketId}/confirmar-entrega-dueno`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' }
                });

                if (res.ok) {
                    window.mostrarModalConfirmacion(
                        '✓ Éxito',
                        'Entrega confirmada correctamente',
                        () => cargarTickets()
                    );
                } else {
                    const error = await res.json();
                    window.mostrarModalConfirmacion(
                        '✗ Error',
                        'Error: ' + (error.message || 'No se pudo confirmar'),
                        null
                    );
                }
            } catch (e) {
                window.mostrarModalConfirmacion(
                    '✗ Error',
                    'Error al procesar la solicitud',
                    null
                );
            }
        }
    );
};

// Confirmar entrega del artículo (solo para el dueño)
window.confirmarEntrega = async function(ticketId) {
    window.mostrarModalConfirmacion(
        '¿Confirmar entrega?',
        '¿Deseas confirmar que entregaste este artículo al cliente?',
        async () => {
            try {
                const res = await fetch(`/api/prestamos/${ticketId}/confirmar-entrega-dueno`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' }
                });

                if (res.ok) {
                    window.mostrarModalConfirmacion(
                        '✓ Éxito',
                        'Entrega confirmada correctamente',
                        () => cargarTickets()
                    );
                } else {
                    const error = await res.json();
                    window.mostrarModalConfirmacion(
                        '✗ Error',
                        'Error: ' + (error.message || 'No se pudo confirmar'),
                        null
                    );
                }
            } catch (e) {
                window.mostrarModalConfirmacion(
                    '✗ Error',
                    'Error al procesar la solicitud',
                    null
                );
            }
        }
    );
};

// Confirmar devolución del artículo (solo para el dueño)
window.confirmarDevolucion = async function(ticketId) {
    window.mostrarModalConfirmacion(
        '¿Confirmar devolución?',
        '¿Deseas confirmar que recibiste de vuelta este artículo?',
        async () => {
            try {
                const res = await fetch(`/api/prestamos/${ticketId}/registrar-devolucion-dueno`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' }
                });

                if (res.ok) {
                    window.mostrarModalConfirmacion(
                        '✓ Éxito',
                        'Devolución confirmada correctamente',
                        () => cargarTickets()
                    );
                } else {
                    const error = await res.json();
                    window.mostrarModalConfirmacion(
                        '✗ Error',
                        'Error: ' + (error.message || 'No se pudo confirmar'),
                        null
                    );
                }
            } catch (e) {
                window.mostrarModalConfirmacion(
                    '✗ Error',
                    'Error al procesar la solicitud',
                    null
                );
            }
        }
    );
};

// Devolver artículo (para el cliente)
window.devolverPrestamo = async function(ticketId) {
    window.mostrarModalConfirmacion(
        '¿Devolver artículo?',
        '¿Deseas confirmar que devuelves este artículo?',
        async () => {
            try {
                const res = await fetch(`/api/prestamos/${ticketId}/devolver`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' }
                });

                if (res.ok) {
                    window.mostrarModalConfirmacion(
                        '✓ Éxito',
                        'Devolución registrada correctamente',
                        () => cargarTickets()
                    );
                } else {
                    const error = await res.json();
                    window.mostrarModalConfirmacion(
                        '✗ Error',
                        'Error: ' + (error.message || 'No se pudo devolver'),
                        null
                    );
                }
            } catch (e) {
                window.mostrarModalConfirmacion(
                    '✗ Error',
                    'Error al procesar la solicitud',
                    null
                );
            }
        }
    );
};