# ════════════════════════════════════════════════════════════════════════════════
# GESTIÓN DE CONEXIONES A BASE DE DATOS - POOL SINGLETON
# ════════════════════════════════════════════════════════════════════════════════

from mysql.connector import Error
from mysql.connector.pooling import MySQLConnectionPool
from flask import g
import os
from dotenv import load_dotenv

load_dotenv()

# Configuración de la base de datos desde el archivo .env
configuracion_bd = {
    'host': os.getenv('DB_HOST', 'localhost'),
    'port': int(os.getenv('DB_PORT', 3306)),
    'user': os.getenv('DB_USER', 'root'),
    'password': os.getenv('DB_PASSWORD', '1234'),
    'database': os.getenv('DB_NAME', 'gestion_deportiva_db')
}

# Pool singleton - se crea UNA sola vez al iniciar la app
try:
    pool_conexiones = MySQLConnectionPool(
        pool_name="pool_articulos_deportivos",
        pool_size=10,
        pool_reset_session=True,
        **configuracion_bd
    )
    print("[✓] Pool de conexiones inicializado correctamente")
except Error as e:
    pool_conexiones = None
    print(f"[✗] Error al crear pool de conexiones: {e}")


class ConexionSegura:
    """
    Envuelve una conexión MySQL para prevenir fugas de memoria.
    """
    def __init__(self, conexion):
        self._conexion = conexion
        self._cerrada = False

    def cerrar(self):
        if not self._cerrada:
            self._cerrada = True
            self._conexion.close()

    # Compatibilidad con código existente que invoca conexion.close()
    def close(self):
        self.cerrar()

    def __getattr__(self, nombre):
        return getattr(self._conexion, nombre)

    def __setattr__(self, nombre, valor):
        if nombre in ('_conexion', '_cerrada'):
            super().__setattr__(nombre, valor)
        else:
            setattr(self._conexion, nombre, valor)


def obtener_conexion():
    """
    Obtiene una conexión reutilizable del pool.
    Se registra automáticamente en el objeto 'g' de Flask para el request actual.
    """
    if 'db_conexion' not in g:
        try:
            if not pool_conexiones:
                print("[ERROR] Pool de conexiones no disponible")
                return None
            
            conexion_raw = pool_conexiones.get_connection()
            g.db_conexion = ConexionSegura(conexion_raw)
        except Error as e:
            print(f"[ERROR] Error obteniendo conexión del pool: {e}")
            return None
            
    return g.db_conexion


def cerrar_conexion(excepcion=None):
    """
    Se ejecuta automáticamente al finalizar cada petición (request).
    Cierra la conexión activa si existe.
    """
    conexion = g.pop('db_conexion', None)
    if conexion is not None:
        try:
            conexion.cerrar()
        except Exception as e:
            print(f"[WARN] Error cerrando conexión: {e}")
