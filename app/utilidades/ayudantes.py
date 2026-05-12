# ════════════════════════════════════════════════════════════════════════════════
# UTILIDADES DE SEGURIDAD Y DECORADORES
# ════════════════════════════════════════════════════════════════════════════════

import bcrypt
from flask import session, redirect, url_for, flash, request, jsonify
from functools import wraps

def hashear_contrasena(contrasena):
    """Convierte texto plano en un hash seguro para la base de datos"""
    sal = bcrypt.gensalt()
    return bcrypt.hashpw(contrasena.encode('utf-8'), sal).decode('utf-8')

def verificar_contrasena(contrasena_plana, contrasena_hash):
    """Compara una contraseña ingresada con el hash guardado"""
    try:
        return bcrypt.checkpw(contrasena_plana.encode('utf-8'), contrasena_hash.encode('utf-8'))
    except Exception:
        return False

def login_requerido(f):
    """Decorador para proteger rutas que requieren inicio de sesión"""
    @wraps(f)
    def decorador(*args, **kwargs):
        if 'usuario_id' not in session:
            if request.path.startswith('/api/') or request.is_json:
                return jsonify({'error': 'Sesión requerida'}), 401
            flash('Debes iniciar sesión para acceder a esta página.', 'danger')
            return redirect(url_for('autenticacion.ver_login'))
        return f(*args, **kwargs)
    return decorador

def solo_admin(f):
    """Decorador para rutas que SOLO el administrador puede ver (Rol 2)"""
    @wraps(f)
    def decorador(*args, **kwargs):
        if session.get('rol_id') != 2:
            if request.path.startswith('/api/') or request.is_json:
                return jsonify({'error': 'Permisos insuficientes'}), 403
            flash('No tienes permisos de administrador.', 'danger')
            return redirect(url_for('index'))
        return f(*args, **kwargs)
    return decorador