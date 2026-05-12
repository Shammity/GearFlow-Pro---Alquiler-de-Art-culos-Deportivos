from flask import Blueprint, request, jsonify, session
from app.utilidades.base_datos import obtener_conexion 

autenticacion_bp = Blueprint('autenticacion', __name__)

# ════════════════════════════════════════════════════════════════════════════════
# 1. LOGIN
# ════════════════════════════════════════════════════════════════════════════════
@autenticacion_bp.route('/api/auth/login', methods=['POST'])
def login():
    datos = request.get_json()
    correo = datos.get('correo')
    contrasena = datos.get('contrasena')

    conexion = obtener_conexion()
    cursor = conexion.cursor(dictionary=True)
    
    try:
        # El frontend envía 'correo' y 'contrasena' (del formulario HTML)
        query = "SELECT id, first_name, last_name, email FROM usuarios WHERE email = %s AND password = %s"
        cursor.execute(query, (correo, contrasena))
        usuario = cursor.fetchone()

        if usuario:
            session['user_id'] = usuario['id']
            session['nombre'] = f"{usuario['first_name']} {usuario['last_name']}"
            session['email'] = usuario['email']
            return jsonify({"success": True, "message": "Login exitoso"})
        
        return jsonify({"success": False, "message": "Correo o contraseña incorrectos"}), 401
    finally:
        cursor.close()

# ════════════════════════════════════════════════════════════════════════════════
# 2. REGISTRO
# ════════════════════════════════════════════════════════════════════════════════
@autenticacion_bp.route('/api/auth/registro', methods=['POST'])
def registro():
    datos = request.get_json()
    nombre = datos.get('nombre')
    cedula = datos.get('cedula')
    correo = datos.get('correo')
    contrasena = datos.get('contrasena')

    conexion = obtener_conexion()
    cursor = conexion.cursor()

    try:
        # Usar columnas de BD nueva
        query = "INSERT INTO usuarios (username, first_name, last_name, email, password, is_active) VALUES (%s, %s, %s, %s, %s, 1)"
        cursor.execute(query, (correo, nombre, '', correo, contrasena))
        conexion.commit()
        return jsonify({"success": True, "message": "Usuario creado con éxito"})
    except Exception as e:
        conexion.rollback()
        print(f"Error en registro: {e}")
        return jsonify({"success": False, "message": "El correo ya existe o hay un error"}), 400
    finally:
        cursor.close()

# ════════════════════════════════════════════════════════════════════════════════
# 3. VERIFICAR SESIÓN (Para que el Dashboard no de error)
# ════════════════════════════════════════════════════════════════════════════════
@autenticacion_bp.route('/api/check-session', methods=['GET'])
def check_session():
    if 'user_id' in session:
        return jsonify({
            "logged_in": True, 
            "usuario": {
                "id": session.get('user_id'),
                "nombre": session.get('nombre'), 
                "rol": session.get('rol')
            }
        })
    return jsonify({"logged_in": False}), 200

# ════════════════════════════════════════════════════════════════════════════════
# 4. RECUPERAR CONTRASEÑA (Forgot Password)
# ════════════════════════════════════════════════════════════════════════════════
@autenticacion_bp.route('/api/auth/recuperar', methods=['POST'])
def recuperar():
    datos = request.get_json()
    correo = datos.get('correo')
    
    conexion = obtener_conexion()
    cursor = conexion.cursor(dictionary=True)
    
    cursor.execute("SELECT nombre_completo FROM usuarios WHERE correo = %s", (correo,))
    usuario = cursor.fetchone()
    
    if usuario:
        # Aquí iría el envío de email real, pero para el proyecto:
        return jsonify({"success": True, "message": f"Hola {usuario['nombre_completo']}, se han enviado instrucciones a tu correo."})
    
    return jsonify({"success": False, "message": "El correo no está registrado"}), 404

# ════════════════════════════════════════════════════════════════════════════════
# 5. LOGOUT
# ════════════════════════════════════════════════════════════════════════════════
@autenticacion_bp.route('/api/auth/logout', methods=['GET'])
def logout():
    session.clear() 
    return jsonify({"success": True})