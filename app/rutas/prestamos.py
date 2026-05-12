# ════════════════════════════════════════════════════════════════════════════════
# RUTAS PARA EL SISTEMA DE PRÉSTAMO Y PAGOS - GEARFLOW PRO
# ════════════════════════════════════════════════════════════════════════════════
from flask import Blueprint, request, jsonify, session
from app.utilidades.base_datos import obtener_conexion
from datetime import datetime, timedelta

prestamos_bp = Blueprint('prestamos', __name__, url_prefix='/api/prestamos')

# ════════════════════════════════════════════════════════════════════════════════
# 1. CREAR TICKETS DESDE EL CARRITO (La ruta que llama app.js)
# ════════════════════════════════════════════════════════════════════════════════
@prestamos_bp.route('/crear', methods=['POST'])
def crear_tickets_multiple():
    if 'user_id' not in session:
        return jsonify({"success": False, "message": "Inicia sesión primero"}), 401
    
    data = request.get_json()
    items = data.get('items', [])
    id_cliente = session['user_id']
    
    if not items:
        return jsonify({"success": False, "message": "Carrito vacío"}), 400

    db = obtener_conexion()
    cursor = db.cursor()
    
    try:
        # 1. Crear la cabecera del TICKET
        # Calculamos el total de todos los productos en el carrito
        total_pago = sum(float(item['precio']) * int(item['dias']) for item in items)
        
        # Fecha de salida: hoy
        fecha_salida = datetime.now()
        
        # Fecha estimada basada en el primer item
        primer_item = items[0]
        fecha_dev_estimada = datetime.strptime(primer_item['fecha'], '%Y-%m-%d').date() + timedelta(days=int(primer_item['dias']))

        # Obtener el id_duenio del primer artículo
        cursor.execute("SELECT id_duenio FROM articulos WHERE id = %s", (int(primer_item['id']),))
        result = cursor.fetchone()
        id_duenio = result[0] if result else 1

        query_ticket = """
            INSERT INTO tickets (id_cliente, id_duenio, fecha_salida, fecha_devolucion_estimada, estado_ticket, total_pago)
            VALUES (%s, %s, %s, %s, 'Pendiente', %s)
        """
        cursor.execute(query_ticket, (id_cliente, id_duenio, fecha_salida, fecha_dev_estimada, total_pago))
        id_ticket_nuevo = cursor.lastrowid

        # 2. Insertar cada artículo en DETALLE_TICKET y actualizar estado
        for item in items:
            subtotal = float(item['precio']) * int(item['dias'])
            dias = int(item['dias'])
            
            query_detalle = """
                INSERT INTO detalle_ticket (id_ticket, id_articulo, dias_prestamo, precio_alquiler, subtotal)
                VALUES (%s, %s, %s, %s, %s)
            """
            cursor.execute(query_detalle, (id_ticket_nuevo, int(item['id']), dias, float(item['precio']), subtotal))
            
            # 3. Actualizar el estado del artículo a 'Prestado'
            cursor.execute("UPDATE articulos SET estado_articulo = 'Prestado' WHERE id = %s", (int(item['id']),))

        db.commit()
        return jsonify({
            "success": True, 
            "message": f"¡Ticket #{id_ticket_nuevo} generado con éxito!",
            "id_ticket": id_ticket_nuevo
        })

    except Exception as e:
        db.rollback()
        print(f"Error Crítico: {e}")
        return jsonify({"success": False, "message": f"Error en DB: {str(e)}"}), 500
    finally:
        cursor.close()
        db.close()

# ════════════════════════════════════════════════════════════════════════════════
# 2. OBTENER DETALLES DE UN TICKET
# ════════════════════════════════════════════════════════════════════════════════
@prestamos_bp.route('/<int:id_ticket>', methods=['GET'])
def obtener_ticket(id_ticket):
    db = obtener_conexion()
    cursor = db.cursor(dictionary=True)
    
    try:
        query = """
            SELECT 
                t.id,
                t.id_cliente,
                CONCAT(u.first_name, ' ', u.last_name) as nombre_cliente,
                t.fecha_salida,
                t.fecha_devolucion_estimada,
                t.estado_ticket,
                t.total_pago,
                GROUP_CONCAT(a.nombre) as articulos
            FROM tickets t
            JOIN usuarios u ON t.id_cliente = u.id
            LEFT JOIN detalle_ticket dt ON t.id = dt.id_ticket
            LEFT JOIN articulos a ON dt.id_articulo = a.id
            WHERE t.id = %s
            GROUP BY t.id
        """
        cursor.execute(query, (id_ticket,))
        ticket = cursor.fetchone()
        
        if not ticket:
            return jsonify({"error": "Ticket no encontrado"}), 404
        
        return jsonify(ticket)
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        cursor.close()
        db.close()

# ════════════════════════════════════════════════════════════════════════════════
# 3. APROBAR TICKET (Acción del creador del artículo)
# ════════════════════════════════════════════════════════════════════════════════
@prestamos_bp.route('/<int:id_ticket>/aprobar', methods=['POST'])
def aprobar_ticket(id_ticket):
    if 'user_id' not in session:
        return jsonify({"success": False, "message": "No autorizado"}), 401
    
    db = obtener_conexion()
    cursor = db.cursor()
    
    try:
        # Verificar que el usuario es el dueño del artículo
        query_check = """
            SELECT COUNT(*) as count FROM detalle_ticket dt
            JOIN articulos a ON dt.id_articulo = a.id
            WHERE dt.id_ticket = %s AND a.id_duenio = %s
        """
        cursor.execute(query_check, (id_ticket, session['user_id']))
        result = cursor.fetchone()
        
        if not result[0]:
            return jsonify({"success": False, "message": "No tienes permiso para aprobar este ticket"}), 403
        
        # Actualizar estado a 'En Progreso'
        cursor.execute("UPDATE tickets SET estado_ticket = 'En Progreso' WHERE id = %s", (id_ticket,))
        db.commit()
        
        return jsonify({"success": True, "message": "Ticket aprobado"})
    except Exception as e:
        db.rollback()
        return jsonify({"success": False, "message": str(e)}), 500
    finally:
        cursor.close()
        db.close()

# ════════════════════════════════════════════════════════════════════════════════
# 4. CONFIRMAR ENTREGA DEL ARTÍCULO
# ════════════════════════════════════════════════════════════════════════════════
@prestamos_bp.route('/<int:id_ticket>/confirmar-entrega', methods=['POST'])
def confirmar_entrega(id_ticket):
    if 'user_id' not in session:
        return jsonify({"success": False, "message": "No autorizado"}), 401
    
    db = obtener_conexion()
    cursor = db.cursor()
    
    try:
        # Verificar que el usuario es el cliente
        cursor.execute("SELECT id_cliente FROM tickets WHERE id = %s", (id_ticket,))
        ticket = cursor.fetchone()
        
        if not ticket or ticket[0] != session['user_id']:
            return jsonify({"success": False, "message": "No tienes permiso"}), 403
        
        # Actualizar estado a 'Entregado'
        cursor.execute("UPDATE tickets SET estado_ticket = 'Entregado' WHERE id = %s", (id_ticket,))
        db.commit()
        
        return jsonify({"success": True, "message": "Artículo confirmado como entregado"})
    except Exception as e:
        db.rollback()
        return jsonify({"success": False, "message": str(e)}), 500
    finally:
        cursor.close()
        db.close()

# ════════════════════════════════════════════════════════════════════════════════
# 5. REGISTRAR DEVOLUCIÓN
# ════════════════════════════════════════════════════════════════════════════════
@prestamos_bp.route('/<int:id_ticket>/devolver', methods=['POST'])
def devolver_articulo(id_ticket):
    if 'user_id' not in session:
        return jsonify({"success": False, "message": "No autorizado"}), 401
    
    db = obtener_conexion()
    cursor = db.cursor()
    
    try:
        # Verificar que el usuario es el cliente
        cursor.execute("SELECT id_cliente FROM tickets WHERE id = %s", (id_ticket,))
        ticket = cursor.fetchone()
        
        if not ticket or ticket[0] != session['user_id']:
            return jsonify({"success": False, "message": "No tienes permiso"}), 403
        
        # Obtener artículos del ticket
        cursor.execute("SELECT id_articulo FROM detalle_ticket WHERE id_ticket = %s", (id_ticket,))
        articulos = cursor.fetchall()
        
        # Actualizar estado del ticket a 'Devuelto'
        cursor.execute(
            "UPDATE tickets SET estado_ticket = 'Devuelto', fecha_devolucion_real = %s WHERE id = %s",
            (datetime.now().date(), id_ticket)
        )
        
        # Cambiar estado de artículos a 'Disponible'
        for art_row in articulos:
            cursor.execute("UPDATE articulos SET estado_articulo = 'Disponible' WHERE id = %s", (art_row[0],))
        
        db.commit()
        
        return jsonify({"success": True, "message": "Artículo devuelto exitosamente"})
    except Exception as e:
        db.rollback()
        return jsonify({"success": False, "message": str(e)}), 500
    finally:
        cursor.close()
        db.close()

# ════════════════════════════════════════════════════════════════════════════════
# 6. CONFIRMAR ENTREGA (DUEÑO DEL ARTÍCULO)
# ════════════════════════════════════════════════════════════════════════════════
@prestamos_bp.route('/<int:id_ticket>/confirmar-entrega-dueno', methods=['POST'])
def confirmar_entrega_dueno(id_ticket):
    if 'user_id' not in session:
        return jsonify({"success": False, "message": "No autorizado"}), 401
    
    db = obtener_conexion()
    cursor = db.cursor()
    
    try:
        # Verificar que el usuario es el dueño del artículo
        query_check = """
            SELECT t.id, COUNT(*) as count FROM tickets t
            JOIN detalle_ticket dt ON t.id = dt.id_ticket
            JOIN articulos a ON dt.id_articulo = a.id
            WHERE t.id = %s AND a.id_duenio = %s
            GROUP BY t.id
        """
        cursor.execute(query_check, (id_ticket, session['user_id']))
        result = cursor.fetchone()
        
        if not result or result[1] == 0:
            return jsonify({"success": False, "message": "No tienes permiso para este ticket"}), 403
        
        # Actualizar estado a 'Entregado'
        cursor.execute("UPDATE tickets SET estado_ticket = 'Entregado' WHERE id = %s", (id_ticket,))
        db.commit()
        
        return jsonify({"success": True, "message": "Entrega confirmada correctamente"})
    except Exception as e:
        db.rollback()
        return jsonify({"success": False, "message": str(e)}), 500
    finally:
        cursor.close()
        db.close()

# ════════════════════════════════════════════════════════════════════════════════
# 7. REGISTRAR DEVOLUCIÓN (DUEÑO DEL ARTÍCULO)
# ════════════════════════════════════════════════════════════════════════════════
@prestamos_bp.route('/<int:id_ticket>/registrar-devolucion-dueno', methods=['POST'])
def registrar_devolucion_dueno(id_ticket):
    if 'user_id' not in session:
        return jsonify({"success": False, "message": "No autorizado"}), 401
    
    db = obtener_conexion()
    cursor = db.cursor()
    
    try:
        # Verificar que el usuario es el dueño del artículo
        query_check = """
            SELECT t.id, COUNT(*) as count FROM tickets t
            JOIN detalle_ticket dt ON t.id = dt.id_ticket
            JOIN articulos a ON dt.id_articulo = a.id
            WHERE t.id = %s AND a.id_duenio = %s
            GROUP BY t.id
        """
        cursor.execute(query_check, (id_ticket, session['user_id']))
        result = cursor.fetchone()
        
        if not result or result[1] == 0:
            return jsonify({"success": False, "message": "No tienes permiso para este ticket"}), 403
        
        # Obtener artículos del ticket
        cursor.execute("SELECT id_articulo FROM detalle_ticket WHERE id_ticket = %s", (id_ticket,))
        articulos = cursor.fetchall()
        
        # Actualizar estado a 'Devuelto'
        cursor.execute(
            "UPDATE tickets SET estado_ticket = 'Devuelto', fecha_devolucion_real = %s WHERE id = %s",
            (datetime.now().date(), id_ticket)
        )
        
        # Cambiar estado de artículos a 'Disponible'
        for art_row in articulos:
            cursor.execute("UPDATE articulos SET estado_articulo = 'Disponible' WHERE id = %s", (art_row[0],))
        
        db.commit()
        
        return jsonify({"success": True, "message": "Devolución registrada correctamente"})
    except Exception as e:
        db.rollback()
        return jsonify({"success": False, "message": str(e)}), 500
    finally:
        cursor.close()
        db.close()