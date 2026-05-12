import os
from uuid import uuid4

from flask import Blueprint, jsonify, session, request, current_app
from app.utilidades.base_datos import obtener_conexion
from app.utilidades.constantes import EXTENSIONES_PERMITIDAS
from werkzeug.utils import secure_filename
from datetime import datetime

admin_bp = Blueprint('admin', __name__)


def _guardar_imagen_articulo(archivo):
    if not archivo or not archivo.filename:
        return ''

    nombre_archivo = secure_filename(archivo.filename)
    extension = os.path.splitext(nombre_archivo)[1].lower().lstrip('.')
    if extension not in EXTENSIONES_PERMITIDAS:
        raise ValueError('Formato de imagen no permitido')

    nombre_final = f"{uuid4().hex}.{extension}"
    ruta_relativa = os.path.join('img', nombre_final)
    ruta_fisica = os.path.join(current_app.static_folder, 'img', nombre_final)
    os.makedirs(os.path.dirname(ruta_fisica), exist_ok=True)
    archivo.save(ruta_fisica)
    return f"/estaticos/{ruta_relativa.replace('\\', '/')}"

# ════════════════════════════════════════════════════════════════════════════════
# 0. CATEGORÍAS (Para alimentar los select del Frontend)
# ════════════════════════════════════════════════════════════════════════════════
@admin_bp.route('/api/categorias', methods=['GET'])
def get_categorias():
    try:
        conexion = obtener_conexion()
        cursor = conexion.cursor(dictionary=True)
        # Para categorías, usamos los valores únicos del campo categoria_id
        cursor.execute("SELECT DISTINCT categoria_id FROM articulos WHERE categoria_id IS NOT NULL")
        resultados = cursor.fetchall()
        categorias = [{'id': cat['categoria_id'], 'nombre': cat['categoria_id']} for cat in resultados]
        conexion.close()
        return jsonify(categorias)
    except Exception as e:
        print(f"Error al obtener categorías: {e}")
        return jsonify([])

# ════════════════════════════════════════════════════════════════════════════════
# 1. INVENTARIO (Vista con nombres de categorías)
# ════════════════════════════════════════════════════════════════════════════════
@admin_bp.route('/api/inventario', methods=['GET'])
def get_inventario():
    usuario_id = session.get('user_id') 
    if not usuario_id:
        return jsonify({"error": "No autorizado"}), 401
        
    conexion = obtener_conexion()
    cursor = conexion.cursor(dictionary=True)
    
    try:
        query = """
            SELECT a.id, a.nombre, a.estado_articulo, 
                   a.precio, a.precio_alquiler, a.categoria_id AS categoria, a.fecha_adquisicion 
            FROM articulos a
            WHERE a.id_duenio = %s
            ORDER BY a.fecha_adquisicion DESC
        """
        cursor.execute(query, (usuario_id,))
        articulos = cursor.fetchall()
        
        for art in articulos:
            # Formatear fecha
            if art.get('fecha_adquisicion'):
                art['fecha_adquisicion'] = art['fecha_adquisicion'].strftime('%Y-%m-%d') if hasattr(art['fecha_adquisicion'], 'strftime') else str(art['fecha_adquisicion'])
                
        conexion.close()
        return jsonify(articulos)
    except Exception as e:
        print(f"Error: {e}")
        return jsonify({"error": str(e)}), 500
    finally:
        conexion.close()

@admin_bp.route('/api/inventario/<int:id>', methods=['GET'])
def get_articulo_individual(id):
    usuario_id = session.get('user_id')
    if not usuario_id:
        return jsonify({"error": "No autorizado"}), 401
        
    conexion = obtener_conexion()
    cursor = conexion.cursor(dictionary=True)
    
    try:
        cursor.execute(
            "SELECT * FROM articulos WHERE id = %s AND id_duenio = %s", 
            (id, usuario_id)
        )
        articulo = cursor.fetchone()
        
        if not articulo:
            return jsonify({"error": "No encontrado"}), 404
            
        if articulo.get('fecha_adquisicion'):
            articulo['fecha_adquisicion'] = articulo['fecha_adquisicion'].strftime('%Y-%m-%d') if hasattr(articulo['fecha_adquisicion'], 'strftime') else str(articulo['fecha_adquisicion'])
            
        return jsonify(articulo)
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        conexion.close()

# ════════════════════════════════════════════════════════════════════════════════
# 2. ACCIONES (Guardar, Editar, Eliminar)
# ════════════════════════════════════════════════════════════════════════════════

@admin_bp.route('/api/inventario/nuevo', methods=['POST'])
def nuevo_articulo():
    usuario_id = session.get('user_id')
    if not usuario_id:
        return jsonify({"error": "No autorizado"}), 401
        
    datos = request.form.to_dict() if request.form else (request.get_json(silent=True) or {})
    archivo_imagen = request.files.get('imagen')
    conexion = obtener_conexion()
    cursor = conexion.cursor()
    
    try:
        imagen_guardada = _guardar_imagen_articulo(archivo_imagen) if archivo_imagen else (datos.get('imagen_url') or datos.get('imagen', ''))

        # Generar SKU único
        sku_generado = f"SKU-{datos['nombre'][:3].upper()}-{usuario_id}-{datetime.now().timestamp()}"
        precio = float(datos.get('precio_alquiler', 0))
        
        query = """
            INSERT INTO articulos 
            (nombre, categoria_id, id_duenio, estado_articulo, 
             precio, precio_alquiler, descripcion, imagen, imagen_url, fecha_adquisicion)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        """
        cursor.execute(query, (
            datos['nombre'], 
            datos['categoria_id'], 
            usuario_id, 
            'Disponible',
            precio, 
            precio,
            datos.get('descripcion', ''),
            imagen_guardada,
            imagen_guardada,
            datos.get('fecha_adquisicion')
        ))
        conexion.commit()
        return jsonify({"success": True, "message": "Artículo creado"})
    except Exception as e:
        conexion.rollback()
        print(f"Error: {e}")
        return jsonify({"success": False, "error": str(e)}), 500
    finally:
        cursor.close()
        conexion.close()

@admin_bp.route('/api/inventario/editar/<int:id>', methods=['PUT'])
def editar_articulo_db(id):
    usuario_id = session.get('user_id')
    if not usuario_id:
        return jsonify({"error": "No autorizado"}), 401
        
    datos = request.form.to_dict() if request.form else (request.get_json(silent=True) or {})
    archivo_imagen = request.files.get('imagen')
    conexion = obtener_conexion()
    cursor = conexion.cursor()
    
    try:
        # Verificar que el artículo pertenece al usuario
        cursor.execute(
            "SELECT id FROM articulos WHERE id = %s AND id_duenio = %s",
            (id, usuario_id)
        )
        if not cursor.fetchone():
            return jsonify({"error": "No tienes permiso"}), 403
        
        cursor.execute("SELECT imagen, imagen_url FROM articulos WHERE id = %s AND id_duenio = %s", (id, usuario_id))
        articulo_actual = cursor.fetchone()
        if not articulo_actual:
            return jsonify({"error": "No tienes permiso"}), 403

        precio = float(datos.get('precio_alquiler', 0))
        imagen_guardada = _guardar_imagen_articulo(archivo_imagen) if archivo_imagen else (datos.get('imagen_url') or datos.get('imagen') or articulo_actual[1] or articulo_actual[0] or '')
        
        query = """
            UPDATE articulos 
            SET nombre=%s, categoria_id=%s, estado_articulo=%s, 
                precio=%s, precio_alquiler=%s, descripcion=%s, imagen=%s, imagen_url=%s, fecha_adquisicion=%s
            WHERE id=%s AND id_duenio=%s
        """
        cursor.execute(query, (
            datos['nombre'], 
            datos['categoria_id'], 
            datos.get('estado_articulo', 'Disponible'),
            precio,
            precio,
            datos.get('descripcion', ''),
            imagen_guardada,
            imagen_guardada,
            datos.get('fecha_adquisicion'),
            id,
            usuario_id
        ))
        conexion.commit()
        return jsonify({"success": True, "message": "Artículo actualizado"})
    except Exception as e:
        conexion.rollback()
        print(f"Error: {e}")
        return jsonify({"success": False, "error": str(e)}), 500
    finally:
        cursor.close()
        conexion.close()

@admin_bp.route('/api/inventario/eliminar/<int:id>', methods=['DELETE'])
def eliminar_articulo_db(id):
    usuario_id = session.get('user_id')
    if not usuario_id:
        return jsonify({"error": "No autorizado"}), 401
        
    conexion = obtener_conexion()
    cursor = conexion.cursor()
    
    try:
        # Verificar que pertenece al usuario
        cursor.execute(
            "SELECT id FROM articulos WHERE id = %s AND id_duenio = %s",
            (id, usuario_id)
        )
        if not cursor.fetchone():
            return jsonify({"error": "No tienes permiso"}), 403
        
        cursor.execute("DELETE FROM articulos WHERE id_articulo = %s", (id,))
        conexion.commit()
        return jsonify({"success": True, "message": "Artículo eliminado"})
    except Exception as e:
        conexion.rollback()
        if "foreign key" in str(e).lower():
            return jsonify({"error": "No se puede eliminar: tiene préstamos registrados"}), 400
        return jsonify({"error": str(e)}), 500
    finally:
        cursor.close()
        conexion.close()

# ════════════════════════════════════════════════════════════════════════════════
# 3. ESTADÍSTICAS
# ════════════════════════════════════════════════════════════════════════════════

@admin_bp.route('/api/stats', methods=['GET'])
def get_stats():
    usuario_id = session.get('user_id')
    if not usuario_id:
        return jsonify({"error": "No autorizado"}), 401
    
    try:
        conexion = obtener_conexion()
        cursor = conexion.cursor(dictionary=True)
        
        # Total de artículos del usuario
        cursor.execute("SELECT COUNT(*) as total FROM articulos WHERE id_duenio = %s", (usuario_id,))
        total_inv = cursor.fetchone()['total'] or 0

        # Valor total del inventario (precio de compra)
        cursor.execute("SELECT COALESCE(SUM(precio), 0) as valor_total FROM articulos WHERE id_duenio = %s", (usuario_id,))
        valor_total = cursor.fetchone()['valor_total'] or 0
        
        # Disponibles
        cursor.execute("SELECT COUNT(*) as disponibles FROM articulos WHERE id_duenio = %s AND estado_articulo = 'Disponible'", (usuario_id,))
        disponibles = cursor.fetchone()['disponibles'] or 0
        
        # Prestados
        cursor.execute("SELECT COUNT(*) as prestados FROM articulos WHERE id_duenio = %s AND estado_articulo = 'Prestado'", (usuario_id,))
        prestados = cursor.fetchone()['prestados'] or 0
        
        conexion.close()
        return jsonify({
            "total": total_inv,
            "valor_total": float(valor_total),
            "disponibles": disponibles,
            "prestados": prestados
        })
    except Exception as e:
        print(f"Error en stats: {e}")
        return jsonify({"total": 0, "valor_total": 0, "disponibles": 0, "prestados": 0}), 500