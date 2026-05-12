// ════════════════════════════════════════════════════════════════════════════════
// PANEL ADMINISTRADOR - Carga reportes y controla artículos
// ════════════════════════════════════════════════════════════════════════════════

document.addEventListener('DOMContentLoaded', async () => {
    await cargarDashboard();
});

// Carga estadísticas del dashboard (tickets, ganancias, artículos)
async function cargarDashboard() {
    try {
        const respuesta = await obtenerApi('/api/admin/reportes/ganancias');
        
        if (respuesta && respuesta.reporte) {
            const reporte = respuesta.reporte;
            document.getElementById('stat-total-tickets').textContent = reporte.total_tickets || 0;
            document.getElementById('stat-ganancias').textContent = 
                formatearMoneda(reporte.ganancias_totales || 0);
            document.getElementById('stat-articulos').textContent = reporte.articulos_alquilados || 0;
            document.getElementById('stat-depositos').textContent = 
                formatearMoneda(reporte.total_depositos || 0);
        }
    } catch (error) {
        console.error('Error cargando dashboard:', error);
    }
}

// Crea un nuevo artículo mediante prompts y lo envía al servidor
async function crearArticulo() {
    const nombre = prompt('Nombre del artículo:');
    if (!nombre) return;
    
    const descripcion = prompt('Descripción:');
    const precioStr = prompt('Precio diario (COP):');
    const precio = parseFloat(precioStr);
    
    if (isNaN(precio) || precio <= 0) {
        mostrarError('Precio inválido');
        return;
    }
    
    const categoria = prompt('Categoría:');
    const cantidadStr = prompt('Cantidad disponible:');
    const cantidad = parseInt(cantidadStr);
    
    if (isNaN(cantidad) || cantidad <= 0) {
        mostrarError('Cantidad inválida');
        return;
    }
    
    try {
        const respuesta = await enviarApi('/api/admin/articulos', {
            nombre,
            descripcion,
            precio_diario: precio,
            categoria,
            cantidad_disponible: cantidad,
            imagen_url: ''
        });
        
        if (respuesta && respuesta.estado === 'ok') {
            mostrarExito('Artículo creado correctamente');
            await cargarDashboard();
        } else {
            mostrarError(respuesta?.error || 'Error creando artículo');
        }
    } catch (error) {
        console.error('Error creando artículo:', error);
        mostrarError('Error creando artículo');
    }
}

/**
 * Eliminar artículo
 */
async function eliminarArticulo(idArticulo) {
    if (!confirm('¿Confirmar eliminación del artículo?')) return;
    
    try {
        const respuesta = await fetch(`/api/admin/articulos/${idArticulo}`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include'
        });
        
        const datos = await respuesta.json();
        
        if (datos && datos.estado === 'ok') {
            mostrarExito('Artículo eliminado correctamente');
            location.reload();
        } else {
            mostrarError(datos?.error || 'Error eliminando artículo');
        }
    } catch (error) {
        console.error('Error eliminando artículo:', error);
        mostrarError('Error eliminando artículo');
    }
}
