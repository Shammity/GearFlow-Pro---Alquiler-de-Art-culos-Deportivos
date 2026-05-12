# ════════════════════════════════════════════════════════════════════════════════
# CONFIGURACIÓN CENTRAL DE LA APLICACIÓN (FLASK FACTORY)
# ════════════════════════════════════════════════════════════════════════════════
# app/__init__.py
import os
from flask import Flask, render_template, session, jsonify, redirect, url_for
from dotenv import load_dotenv
from app.utilidades.base_datos import cerrar_conexion

load_dotenv()

def crear_app():
    app = Flask(__name__,
                template_folder='plantillas', 
                static_folder='estaticos')
    
    # Llave secreta para que las sesiones (login) funcionen
    app.config['SECRET_KEY'] = os.getenv('SECRET_KEY', 'mi_llave_secreta_gearflow')

    # 1. Registro de Blueprints 
    # Aquí es donde se conectan los archivos de rutas externos
    from app.rutas.autenticacion import autenticacion_bp
    from app.rutas.admin import admin_bp
    from app.rutas.catalogo import catalogo_bp
    from app.rutas.tickets import tickets_bp
    from app.rutas.prestamos import prestamos_bp

    app.register_blueprint(autenticacion_bp)
    app.register_blueprint(admin_bp)
    app.register_blueprint(catalogo_bp)
    app.register_blueprint(tickets_bp)
    app.register_blueprint(prestamos_bp)

    # Cerrar la base de datos automáticamente al terminar la petición
    app.teardown_appcontext(cerrar_conexion)

    # ══════════════════════════════════════════════════════════════════════════
    # RUTAS DE VISTAS (HTML)
    # ══════════════════════════════════════════════════════════════════════════
    @app.route('/api/test-db')
    def test_db():
        """Endpoint para probar que la BD está conectada"""
        try:
            from app.utilidades.base_datos import obtener_conexion
            conexion = obtener_conexion()
            cursor = conexion.cursor(dictionary=True)
            
            cursor.execute("SELECT COUNT(*) as usuarios_count FROM usuarios")
            usuarios = cursor.fetchone()
            
            cursor.execute("SELECT COUNT(*) as articulos_count FROM articulos")
            articulos = cursor.fetchone()
            
            cursor.close()
            conexion.close()
            
            return jsonify({
                "success": True,
                "usuarios": usuarios['usuarios_count'],
                "articulos": articulos['articulos_count']
            })
        except Exception as e:
            return jsonify({"success": False, "error": str(e)}), 500

    @app.route('/')
    def index(): 
        return render_template('index.html')

    @app.route('/dashboard')
    def view_dashboard():
        if 'user_id' not in session:
            # En lugar de render_template, usamos redirect
            return redirect(url_for('view_login')) 
        return render_template('dashboard.html')

    @app.route('/auth/login')
    def view_login(): 
        return render_template('login.html')

    @app.route('/auth/registro')
    def view_registro(): 
        return render_template('register.html')

    @app.route('/auth/forgot-password')
    def view_forgot(): 
        return render_template('forgotPassword.html')

    # ══════════════════════════════════════════════════════════════════════════
    # API DE UTILIDAD Y SESIÓN
    # ══════════════════════════════════════════════════════════════════════════
    
    @app.route('/api/check-session')
    def check_session():
        if 'user_id' in session:
            return jsonify({
                "logged_in": True,
                "usuario": {
                    "nombre": session.get('nombre'),
                    "rol": session.get('rol')
                }
            })
        return jsonify({"logged_in": False})

    @app.route('/api/user_info')
    def user_info():
        if 'user_id' in session:
            return jsonify({
                "nombre": session.get('nombre', 'Usuario'),
                "id": session.get('user_id'),
                "rol": session.get('rol', 1)
            })
        return jsonify({"error": "No autorizado"}), 401

    @app.route('/logout')
    def logout():
        session.clear()
        return redirect(url_for('index'))

    return app