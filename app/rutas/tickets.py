from flask import Blueprint, request, jsonify, session
from app.utilidades.base_datos import obtener_conexion

tickets_bp = Blueprint('tickets', __name__)

# ════════════════════════════════════════════════════════════════════════════════
# LISTAR TICKETS DEL USUARIO (Tanto como cliente como dueño)
# ════════════════════════════════════════════════════════════════════════════════
@tickets_bp.route('/api/tickets', methods=['GET'])
def listar_tickets():
    if 'user_id' not in session:
        return jsonify({"error": "No autorizado"}), 401

    user_id = session['user_id']
    conexion = obtener_conexion()
    cursor = conexion.cursor(dictionary=True)
    
    try:
        # Recuperamos tickets del usuario como cliente Y como dueño de artículos
        query = """
            SELECT 
                t.id,
                t.id_cliente,
                t.id_duenio,
                CONCAT(u.first_name, ' ', u.last_name) as cliente,
                a.nombre as articulo,
                t.estado_ticket as estado,
                t.fecha_salida,
                t.total_pago as total,
                CASE 
                    WHEN t.id_cliente = %s THEN 'MI_ALQUILER'
                    ELSE 'ME_ALQUILARON'
                END AS rol
            FROM tickets t
            JOIN usuarios u ON t.id_cliente = u.id
            LEFT JOIN detalle_ticket dt ON t.id = dt.id_ticket
            LEFT JOIN articulos a ON dt.id_articulo = a.id
            WHERE t.id_cliente = %s OR t.id_duenio = %s
            ORDER BY t.fecha_salida DESC
            LIMIT 10
        """
        cursor.execute(query, (user_id, user_id, user_id))
        tickets = cursor.fetchall()
        return jsonify(tickets)
    except Exception as e:
        print(f"Error en tickets: {e}")
        return jsonify({"error": str(e)}), 500
    finally:
        cursor.close()
        conexion.close()

# ════════════════════════════════════════════════════════════════════════════════
# LISTAR TICKETS POR ESTADO
# ════════════════════════════════════════════════════════════════════════════════
@tickets_bp.route('/api/tickets/estado/<estado>', methods=['GET'])
def listar_tickets_por_estado(estado):
    if 'user_id' not in session:
        return jsonify({"error": "No autorizado"}), 401

    user_id = session['user_id']
    conexion = obtener_conexion()
    cursor = conexion.cursor(dictionary=True)
    
    try:
        query = """
            SELECT 
                t.id,
                CONCAT(u.first_name, ' ', u.last_name) as cliente,
                a.nombre as articulo,
                t.estado_ticket as estado,
                t.fecha_salida,
                t.total_pago as total
            FROM tickets t
            JOIN usuarios u ON t.id_cliente = u.id
            LEFT JOIN detalle_ticket dt ON t.id = dt.id_ticket
            LEFT JOIN articulos a ON dt.id_articulo = a.id
            WHERE (t.id_cliente = %s OR t.id_duenio = %s) AND t.estado_ticket = %s
            ORDER BY t.fecha_salida DESC
        """
        cursor.execute(query, (user_id, user_id, estado))
        tickets = cursor.fetchall()
        return jsonify(tickets)
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        cursor.close()
        conexion.close()

# ════════════════════════════════════════════════════════════════════════════════
# ÚLTIMOS PRÉSTAMOS (Para dashboard)
# ════════════════════════════════════════════════════════════════════════════════
@tickets_bp.route('/api/ultimos-prestamos', methods=['GET'])
def ultimos_prestamos():
    if 'user_id' not in session:
        return jsonify({"error": "No autorizado"}), 401

    user_id = session['user_id']
    conexion = obtener_conexion()
    cursor = conexion.cursor(dictionary=True)
    
    try:
        query = """
            SELECT 
                t.id,
                CONCAT(u.first_name, ' ', u.last_name) as cliente,
                a.nombre as articulo,
                t.estado_ticket as estado,
                t.fecha_salida,
                t.total_pago as total
            FROM tickets t
            JOIN usuarios u ON t.id_cliente = u.id
            LEFT JOIN detalle_ticket dt ON t.id = dt.id_ticket
            LEFT JOIN articulos a ON dt.id_articulo = a.id
            WHERE t.id_cliente = %s OR t.id_duenio = %s
            ORDER BY t.fecha_salida DESC
            LIMIT 5
        """
        cursor.execute(query, (user_id, user_id))
        tickets = cursor.fetchall()
        return jsonify(tickets)
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        cursor.close()
        conexion.close()