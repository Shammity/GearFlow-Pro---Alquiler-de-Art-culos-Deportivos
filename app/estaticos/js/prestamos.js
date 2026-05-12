// ════════════════════════════════════════════════════════════════════════════════
// LÓGICA DE PRÉSTAMO - Gestiona reservas y alquiler de artículos
// ════════════════════════════════════════════════════════════════════════════════

let usuarioActual = null;
let articuloSeleccionado = null;

// Cierra el modal de préstamo y limpia el formulario
function cerrarModalPrestamo() {
    document.getElementById('modal-prestamo').style.display = 'none';
    document.getElementById('form-prestamo').reset();
    const calculoCosto = document.getElementById('calculo-costo');
    if (calculoCosto) calculoCosto.style.display = 'none';
}

// ════════════════════════════════════════════════════════════════════════════════
// ABRIR MODAL DE PRÉSTAMO
// ════════════════════════════════════════════════════════════════════════════════
function abrirModalPrestamo(idArticulo, nombre, precio, garantia) {
    if (!usuarioActual || !usuarioActual.logueado) {
        alert('Por favor inicia sesión para alquilar artículos');
        window.location.href = '/auth/login';
        return;
    }
    
    articuloSeleccionado = { idArticulo, nombre, precio, garantia };
    
    document.getElementById('modal-nombre').textContent = nombre;
    document.getElementById('modal-precio').textContent = `Precio: $${Number(precio).toLocaleString()}/día`;
    document.getElementById('modal-garantia').textContent = `Garantía: $${Number(garantia).toLocaleString()}`;
    
    // Establecer fecha mínima como hoy
    const hoy = new Date().toISOString().split('T')[0];
    document.getElementById('fecha-salida').min = hoy;
    document.getElementById('fecha-retorno').min = hoy;
    
    document.getElementById('modal-prestamo').style.display = 'flex';
}

// ════════════════════════════════════════════════════════════════════════════════
// INICIALIZACIÓN
// ════════════════════════════════════════════════════════════════════════════════
document.addEventListener('DOMContentLoaded', () => {
    console.log('[PRESTAMOS] Inicializando...');
    checkUserSession();
    cargarProductosDelBackend();
    
    // Event listeners para el modal
    const btnCerrar = document.getElementById('btn-cerrar-modal');
    const btnCancelar = document.getElementById('btn-cancelar-modal');
    const formPrestamo = document.getElementById('form-prestamo');
    
    if (btnCerrar) btnCerrar.addEventListener('click', cerrarModalPrestamo);
    if (btnCancelar) btnCancelar.addEventListener('click', cerrarModalPrestamo);
    if (formPrestamo) formPrestamo.addEventListener('submit', procesarPrestamo);
    
    // Calcular costo en tiempo real
    const fechaSalida = document.getElementById('fecha-salida');
    const fechaRetorno = document.getElementById('fecha-retorno');
    if (fechaSalida) fechaSalida.addEventListener('change', actualizarCalculo);
    if (fechaRetorno) fechaRetorno.addEventListener('change', actualizarCalculo);
    
    // Setup de búsqueda
    const filterSku = document.getElementById('filter-sku');
    if (filterSku) {
        filterSku.addEventListener('input', (e) => {
            const termino = e.target.value.toLowerCase();
            const cards = document.querySelectorAll('.product-card');
            cards.forEach(card => {
                const nombre = card.querySelector('.product-info h3')?.textContent.toLowerCase() || '';
                const sku = card.querySelector('.product-meta')?.textContent.toLowerCase() || '';
                card.style.display = nombre.includes(termino) || sku.includes(termino) ? 'block' : 'none';
            });
        });
    }
});

// ════════════════════════════════════════════════════════════════════════════════
// VERIFICAR SESIÓN DEL USUARIO
// ════════════════════════════════════════════════════════════════════════════════
async function checkUserSession() {
    try {
        const response = await fetch('/auth/verificar-sesion');
        const data = await response.json();
        
        usuarioActual = data.logueado ? data : null;
        
        if (data.logueado) {
            console.log(`[PRESTAMOS] Usuario logueado: ${data.nombre}`);
            mostrarUILogueado(data);
            cargarMisPrestamos();
        } else {
            console.log('[PRESTAMOS] Usuario no logueado');
            mostrarUINoLogueado();
        }
    } catch (e) {
        console.error('[PRESTAMOS] Error verificar sesión:', e);
    }
}

// ════════════════════════════════════════════════════════════════════════════════
// ACTUALIZAR UI SEGÚN ESTADO DE SESIÓN
// ════════════════════════════════════════════════════════════════════════════════
function mostrarUILogueado(usuario) {
    // Ocultar botones de login/register
    document.getElementById('btn-login').style.display = 'none';
    document.getElementById('btn-register').style.display = 'none';
    
    // Mostrar nombre y logout
    const userNameEl = document.getElementById('user-name');
    userNameEl.textContent = `¡Hola, ${usuario.nombre}!`;
    userNameEl.classList.remove('hidden');
    document.getElementById('btn-logout').classList.remove('hidden');
    
    // Mostrar sección de usuario
    document.getElementById('user-summary').classList.remove('hidden');
    document.getElementById('link-tickets').classList.remove('hidden');
    document.getElementById('mis-prestamos').classList.remove('hidden');
}

function mostrarUINoLogueado() {
    document.getElementById('btn-login').style.display = 'block';
    document.getElementById('btn-register').style.display = 'block';
    document.getElementById('user-name').classList.add('hidden');
    document.getElementById('btn-logout').classList.add('hidden');
    document.getElementById('user-summary').classList.add('hidden');
    document.getElementById('link-tickets').classList.add('hidden');
    document.getElementById('mis-prestamos').classList.add('hidden');
}

// ════════════════════════════════════════════════════════════════════════════════
// CARGAR PRODUCTOS DESDE EL BACKEND
// ════════════════════════════════════════════════════════════════════════════════
async function cargarProductosDelBackend() {
    try {
        const response = await fetch('/api/inventario');
        if (!response.ok) throw new Error('Error en API');
        
        const data = await response.json();
        console.log(`[PRESTAMOS] Se cargaron ${data.articulos?.length || 0} artículos`);
        
        renderProductos(data.articulos || []);
    } catch (e) {
        console.error('[PRESTAMOS] Error cargando productos:', e);
        document.getElementById('contenedor-articulos').innerHTML = `
            <p style="grid-column: 1/-1; text-align: center; color: #e74c3c;">
                ⚠️ Error al cargar inventario: ${e.message}
            </p>
        `;
    }
}

// ════════════════════════════════════════════════════════════════════════════════
// RENDERIZAR PRODUCTOS
// ════════════════════════════════════════════════════════════════════════════════
function renderProductos(articulos) {
    const contenedor = document.getElementById('contenedor-articulos');
    
    if (!articulos || articulos.length === 0) {
        contenedor.innerHTML = '<p style="grid-column: 1/-1; text-align: center;">No hay artículos disponibles</p>';
        return;
    }
    
    const html = articulos.map(art => `
        <div class="product-card" style="background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.1); transition: transform 0.3s;">
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; color: white; font-size: 48px;">
                ${obtenerIconoCategoria(art.nombre_categoria)}
            </div>
            <div style="padding: 20px;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                    <span style="font-size: 12px; background: #f0f4ff; color: #667eea; padding: 4px 12px; border-radius: 20px; font-weight: 600;">
                        ${art.sku}
                    </span>
                    <span style="font-size: 16px; font-weight: 700; color: #667eea;">
                        $${Number(art.precio_prestamo).toLocaleString()}
                    </span>
                </div>
                <h3 style="margin: 10px 0; color: #1f2937; font-size: 16px; font-weight: 700;">
                    ${art.nombre_articulo}
                </h3>
                <p style="margin: 10px 0; color: #6b7280; font-size: 13px;">
                    Categoría: ${art.nombre_categoria}
                </p>
                <p style="margin: 10px 0; color: #6b7280; font-size: 13px; border-top: 1px solid #e5e7eb; padding-top: 10px;">
                    Garantía: $${Number(art.deposito_garantia).toLocaleString()}
                </p>
                <div style="margin-top: 15px;">
                    ${art.estado_articulo === 'Disponible' 
                        ? `<button onclick="abrirModalPrestamo(${art.id_articulo}, '${art.nombre_articulo}', ${art.precio_prestamo}, ${art.deposito_garantia})" 
                                   style="width: 100%; padding: 12px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: 600;">
                                   🛒 Alquilar
                           </button>`
                        : `<button disabled style="width: 100%; padding: 12px; background: #ccc; color: #666; border: none; border-radius: 8px; font-weight: 600;">
                                   ❌ No disponible
                           </button>`
                    }
                </div>
            </div>
        </div>
    `).join('');
    
    contenedor.innerHTML = html;
}

// ════════════════════════════════════════════════════════════════════════════════
// OBTENER ICONO SEGÚN CATEGORÍA
// ════════════════════════════════════════════════════════════════════════════════
function obtenerIconoCategoria(categoria) {
    const iconos = {
        'Fútbol': '⚽',
        'Ciclismo': '🚴',
        'Tenis': '🎾',
        'Gimnasio': '🏋️',
        'Natación': '🏊',
        'Atletismo': '🏃',
    };
    return iconos[categoria] || '🎽';
}

// ════════════════════════════════════════════════════════════════════════════════
// ABRIR MODAL DE PRÉSTAMO
// ════════════════════════════════════════════════════════════════════════════════
function abrirModalPrestamo(idArticulo, nombre, precio, garantia) {
    if (!usuarioActual || !usuarioActual.logueado) {
        alert('Por favor inicia sesión para alquilar artículos');
        window.location.href = '/auth/login';
        return;
    }
    
    articuloSeleccionado = { idArticulo, nombre, precio, garantia };
    
    document.getElementById('modal-nombre').textContent = nombre;
    document.getElementById('modal-precio').textContent = `Precio: $${Number(precio).toLocaleString()}/día`;
    document.getElementById('modal-garantia').textContent = `Garantía: $${Number(garantia).toLocaleString()}`;
    
    // Establecer fecha mínima como hoy
    const hoy = new Date().toISOString().split('T')[0];
    document.getElementById('fecha-salida').min = hoy;
    document.getElementById('fecha-retorno').min = hoy;
    
    document.getElementById('modal-prestamo').style.display = 'flex';
}

function cerrarModalPrestamo() {
    document.getElementById('modal-prestamo').style.display = 'none';
    document.getElementById('form-prestamo').reset();
    document.getElementById('calculo-costo').style.display = 'none';
}

// ════════════════════════════════════════════════════════════════════════════════
// ACTUALIZAR CÁLCULO DE COSTO
// ════════════════════════════════════════════════════════════════════════════════
function actualizarCalculo() {
    const fechaSalida = document.getElementById('fecha-salida').value;
    const fechaRetorno = document.getElementById('fecha-retorno').value;
    
    if (!fechaSalida || !fechaRetorno) return;
    
    const salida = new Date(fechaSalida);
    const retorno = new Date(fechaRetorno);
    const dias = Math.ceil((retorno - salida) / (1000 * 60 * 60 * 24));
    
    if (dias <= 0) {
        alert('La fecha de retorno debe ser posterior a la de salida');
        return;
    }
    
    const alquiler = articuloSeleccionado.precio * dias;
    const total = alquiler + articuloSeleccionado.garantia;
    
    document.getElementById('calculo-dias').textContent = dias;
    document.getElementById('calculo-alquiler').textContent = `$${alquiler.toLocaleString()}`;
    document.getElementById('calculo-total').textContent = total.toLocaleString();
    document.getElementById('calculo-costo').style.display = 'block';
}

// ════════════════════════════════════════════════════════════════════════════════
// PROCESAR PRÉSTAMO
// ════════════════════════════════════════════════════════════════════════════════
async function procesarPrestamo(e) {
    e.preventDefault();
    
    const fechaSalida = document.getElementById('fecha-salida').value;
    const fechaRetorno = document.getElementById('fecha-retorno').value;
    
    try {
        const response = await fetch('/prestamos/crear', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                id_articulo: articuloSeleccionado.idArticulo,
                fecha_salida: fechaSalida,
                fecha_retorno: fechaRetorno
            })
        });
        
        const data = await response.json();
        
        if (!response.ok) throw new Error(data.error);
        
        console.log('[PRESTAMOS] Préstamo creado:', data);
        
        // Mostrar información de pago
        alert(`✅ Préstamo creado\n\nArtículo: ${data.articulo}\nDías: ${data.dias}\nAlquiler: $${data.costo_alquiler.toLocaleString()}\nGarantía: $${data.deposito_garantia.toLocaleString()}\nTotal: $${data.monto_total.toLocaleString()}\n\nSiguiente: Realiza el pago para confirmar`);
        
        cerrarModalPrestamo();
        cargarMisPrestamos();
        
    } catch (e) {
        console.error('[PRESTAMOS] Error:', e);
        alert(`❌ Error: ${e.message}`);
    }
}

// ════════════════════════════════════════════════════════════════════════════════
// CARGAR MIS PRÉSTAMOS
// ════════════════════════════════════════════════════════════════════════════════
async function cargarMisPrestamos() {
    if (!usuarioActual || !usuarioActual.logueado) return;
    
    try {
        const response = await fetch('/prestamos/mis-tickets');
        if (!response.ok) throw new Error('Error cargando préstamos');
        
        const data = await response.json();
        const tickets = data.tickets || [];
        
        console.log(`[PRESTAMOS] Se cargaron ${tickets.length} préstamo(s)`);
        
        const contenedor = document.getElementById('lista-prestamos');
        
        if (tickets.length === 0) {
            contenedor.innerHTML = '<p style="text-align: center; color: #999;">No tienes préstamos activos</p>';
            return;
        }
        
        const html = tickets.map(t => `
            <div style="background: white; border-radius: 10px; padding: 20px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); border-left: 4px solid #667eea;">
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 15px;">
                    <div>
                        <p style="color: #999; font-size: 12px; margin-bottom: 5px;">ARTÍCULO</p>
                        <h3 style="margin: 0; color: #1f2937;">${t.nombre_articulo}</h3>
                        <p style="margin: 5px 0 0; color: #667eea; font-weight: 600; font-size: 14px;">SKU: ${t.sku}</p>
                    </div>
                    <div>
                        <p style="color: #999; font-size: 12px; margin-bottom: 5px;">ESTADO</p>
                        <div style="display: flex; gap: 10px;">
                            <span style="background: ${t.estado === 'devuelto' ? '#d4edda' : t.estado === 'pagado' ? '#cfe2ff' : '#fff3cd'}; 
                                        color: ${t.estado === 'devuelto' ? '#155724' : t.estado === 'pagado' ? '#084298' : '#664d03'}; 
                                        padding: 6px 12px; border-radius: 20px; font-size: 12px; font-weight: 600;">
                                ${t.estado === 'devuelto' ? '✓ Devuelto' : t.estado === 'pagado' ? '✓ Pagado' : '⏳ Pendiente'}
                            </span>
                        </div>
                    </div>
                </div>
                <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 15px; border-top: 1px solid #e5e7eb; padding-top: 15px;">
                    <div>
                        <p style="color: #999; font-size: 12px; margin: 0;">Salida</p>
                        <p style="margin: 5px 0 0; font-weight: 600; color: #1f2937;">${new Date(t.fecha_salida).toLocaleDateString('es-CO')}</p>
                    </div>
                    <div>
                        <p style="color: #999; font-size: 12px; margin: 0;">Retorno</p>
                        <p style="margin: 5px 0 0; font-weight: 600; color: #1f2937;">${new Date(t.fecha_retorno).toLocaleDateString('es-CO')}</p>
                    </div>
                    <div>
                        <p style="color: #999; font-size: 12px; margin: 0;">Costo</p>
                        <p style="margin: 5px 0 0; font-weight: 600; color: #667eea;">$${Number(t.costo_total).toLocaleString()}</p>
                    </div>
                </div>
                ${t.estado === 'pendiente_pago' ? `
                    <button onclick="pagarPrestamo(${t.id_ticket})" style="width: 100%; margin-top: 15px; padding: 10px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; border: none; border-radius: 6px; font-weight: 600; cursor: pointer;">
                        💳 Pagar Ahora
                    </button>
                ` : ''}
                ${t.estado === 'pagado' ? `
                    <button onclick="devolverPrestamo(${t.id_ticket})" style="width: 100%; margin-top: 15px; padding: 10px; background: #28a745; color: white; border: none; border-radius: 6px; font-weight: 600; cursor: pointer;">
                        ↩️ Registrar Devolución
                    </button>
                ` : ''}
            </div>
        `).join('');
        
        contenedor.innerHTML = html;
        
        // Actualizar estadísticas
        const activos = tickets.filter(t => t.estado !== 'devuelto').length;
        const garantias = tickets.reduce((sum, t) => sum + (t.estado !== 'devuelto' ? t.deposito_garantia || 0 : 0), 0);
        const pendientes = tickets.filter(t => t.estado !== 'devuelto').length;
        
        document.getElementById('count-tickets').textContent = activos;
        document.getElementById('total-deposits').textContent = `$${garantias.toLocaleString()}`;
        document.getElementById('pending-returns').textContent = pendientes;
        
    } catch (e) {
        console.error('[PRESTAMOS] Error cargando mis préstamos:', e);
    }
}

// ════════════════════════════════════════════════════════════════════════════════
// PAGAR PRÉSTAMO
// ════════════════════════════════════════════════════════════════════════════════
async function pagarPrestamo(ticketId) {
    if (!confirm('¿Confirmar pago de este préstamo?')) return;
    
    try {
        const response = await fetch(`/prestamos/pagar/${ticketId}`, {
            method: 'POST'
        });
        
        const data = await response.json();
        if (!response.ok) throw new Error(data.error);
        
        alert('✅ ¡Pago registrado correctamente!');
        cargarMisPrestamos();
        
    } catch (e) {
        alert(`❌ Error: ${e.message}`);
    }
}

// ════════════════════════════════════════════════════════════════════════════════
// DEVOLVER PRÉSTAMO
// ════════════════════════════════════════════════════════════════════════════════
async function devolverPrestamo(ticketId) {
    if (!confirm('¿Confirmar devolución de este artículo?')) return;
    
    try {
        const response = await fetch(`/prestamos/devolver/${ticketId}`, {
            method: 'POST'
        });
        
        const data = await response.json();
        if (!response.ok) throw new Error(data.error);
        
        alert('✅ ¡Devolución registrada! Tu garantía ha sido reembolsada.');
        cargarMisPrestamos();
        
    } catch (e) {
        alert(`❌ Error: ${e.message}`);
    }
}

// ════════════════════════════════════════════════════════════════════════════════
// CERRAR MODAL AL PRESIONAR ESC
// ════════════════════════════════════════════════════════════════════════════════
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        cerrarModalPrestamo();
    }
});
