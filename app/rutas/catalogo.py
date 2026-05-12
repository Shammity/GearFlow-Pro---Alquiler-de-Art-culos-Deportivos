from flask import Blueprint, jsonify, session
from app.utilidades.base_datos import obtener_conexion

catalogo_bp = Blueprint('catalogo', __name__)

# ════════════════════════════════════════════════════════════════════════════════
# 1. CATÁLOGO PÚBLICO (Lo que ven todos para alquilar)
# ════════════════════════════════════════════════════════════════════════════════
@catalogo_bp.route('/api/articulos', methods=['GET'])
def listar_catalogo():
    conexion = obtener_conexion()
    cursor = conexion.cursor(dictionary=True)
    
    try:
        query = """
            SELECT 
                a.id, 
                a.nombre, 
                a.categoria_id AS categoria,
                a.estado_articulo AS estado, 
                a.precio,
                a.precio_alquiler,
                a.descripcion,
                COALESCE(a.imagen_url, a.imagen) AS imagen
            FROM articulos a
            WHERE a.estado_articulo = 'Disponible'
            ORDER BY a.fecha_adquisicion DESC
        """
        cursor.execute(query)
        articulos = cursor.fetchall()
        return jsonify(articulos)
    except Exception as e:
        print(f"Error en catálogo: {e}")
        return jsonify({"error": str(e)}), 500
    finally:
        cursor.close()
        conexion.close()

# ════════════════════════════════════════════════════════════════════════════════
# 1.5 OBTENER CATEGORÍAS
# ════════════════════════════════════════════════════════════════════════════════
@catalogo_bp.route('/api/categorias', methods=['GET'])
def obtener_categorias():
    conexion = obtener_conexion()
    cursor = conexion.cursor(dictionary=True)
    
    try:
        # Obtener categorías únicas desde articulos
        query = "SELECT DISTINCT categoria_id FROM articulos WHERE categoria_id IS NOT NULL"
        cursor.execute(query)
        categorias_raw = cursor.fetchall()
        
        # Transformar para que el frontend entienda
        categorias = []
        for cat in categorias_raw:
            if cat['categoria_id']:
                categorias.append({
                    "id": cat['categoria_id'],
                    "nombre": cat['categoria_id']
                })
        
        return jsonify(categorias)
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        cursor.close()
        conexion.close()

# ════════════════════════════════════════════════════════════════════════════════
# 2. INVENTARIO PRIVADO (Lo que yo soy dueño)
# ════════════════════════════════════════════════════════════════════════════════
@catalogo_bp.route('/api/inventario', methods=['GET'])
def listar_inventario():
    user_id = session.get('user_id')
    if not user_id:
        return jsonify({"error": "No autorizado"}), 401

    conexion = obtener_conexion()
    cursor = conexion.cursor(dictionary=True)
    
    try:
        query = """
            SELECT 
                a.id, 
                a.nombre, 
                a.categoria_id AS categoria,
                a.estado_articulo AS estado, 
                a.precio,
                a.precio_alquiler,
                COALESCE(a.imagen_url, a.imagen) AS imagen
            FROM articulos a
            WHERE a.id_duenio = %s
            ORDER BY a.fecha_adquisicion DESC
        """
        cursor.execute(query, (user_id,))
        return jsonify(cursor.fetchall())
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        cursor.close()
        conexion.close()

# ════════════════════════════════════════════════════════════════════════════════
# 3. MIS ARTÍCULOS (Para admin, los que publiqué)
# ════════════════════════════════════════════════════════════════════════════════
@catalogo_bp.route('/api/mis-articulos', methods=['GET'])
def obtener_mis_articulos():
    user_id = session.get('user_id')
    if not user_id:
        return jsonify({"error": "No autorizado"}), 401

    conexion = obtener_conexion()
    cursor = conexion.cursor(dictionary=True)
    
    try:
        query = """
            SELECT 
                a.id, 
                a.nombre, 
                a.categoria_id AS categoria,
                a.estado_articulo AS estado, 
                a.precio,
                a.descripcion,
                COALESCE(a.imagen_url, a.imagen) AS imagen
            FROM articulos a
            WHERE a.id_duenio = %s
            ORDER BY a.fecha_adquisicion DESC
        """
        cursor.execute(query, (user_id,))
        return jsonify(cursor.fetchall())
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        cursor.close()
        conexion.close()

# ════════════════════════════════════════════════════════════════════════════════
# 4. ESTADÍSTICAS DEL DASHBOARD
# ════════════════════════════════════════════════════════════════════════════════
@catalogo_bp.route('/api/dashboard/stats', methods=['GET'])
def obtener_stats():
    user_id = session.get('user_id')
    if not user_id: 
        return jsonify({"error": "No autorizado"}), 401
    
    conexion = obtener_conexion()
    cursor = conexion.cursor(dictionary=True)
    
    try:
        # Cuenta estadísticas para los cuadros de colores del Dashboard
        query = """
            SELECT 
                COUNT(*) as total,
                SUM(CASE WHEN estado_articulo = 'Prestado' THEN 1 ELSE 0 END) as prestados,
                SUM(CASE WHEN estado_articulo = 'Disponible' THEN 1 ELSE 0 END) as disponibles,
                SUM(precio) as total_valor
            FROM articulos 
            WHERE id_duenio = %s
        """
        cursor.execute(query, (user_id,))
        stats = cursor.fetchone()
        
        # Manejo de nulos por si el usuario no tiene artículos aún
        if not stats or stats['total'] is None:
            stats = {"total": 0, "prestados": 0, "disponibles": 0, "total_valor": 0}
        else:
            # Convertir None a 0
            stats['prestados'] = stats['prestados'] or 0
            stats['disponibles'] = stats['disponibles'] or 0
            stats['total_valor'] = stats['total_valor'] or 0
            
        return jsonify(stats)
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        cursor.close()
        conexion.close()