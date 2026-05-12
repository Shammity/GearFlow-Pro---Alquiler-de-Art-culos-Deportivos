# ════════════════════════════════════════════════════════════════════════════════
# CONFIGURACIÓN CENTRALIZADA - SISTEMA DE ARTÍCULOS DEPORTIVOS
# ════════════════════════════════════════════════════════════════════════════════

import os
from dotenv import load_dotenv

load_dotenv()


class ConfiguracionBase:
    """Configuración base compartida entre todos los entornos"""
    
    # Flask
    SECRET_KEY = os.getenv('SECRET_KEY', 'dev_key_cambiar_en_produccion')
    FLASK_ENV = os.getenv('FLASK_ENV', 'development')
    
    # CORS
    CORS_ORIGINS = os.getenv('CORS_ORIGINS', 'http://localhost:5000').split(',')
    
    # Base de Datos
    DB_HOST = os.getenv('DB_HOST', 'localhost')
    DB_PORT = int(os.getenv('DB_PORT', 3306))
    DB_USER = os.getenv('DB_USER', 'root')
    DB_PASSWORD = os.getenv('DB_PASSWORD', '1234')
    DB_NAME = os.getenv('DB_NAME', 'sistema_articulos_deportivos')
    
    # Sesión
    SESSION_TYPE = os.getenv('SESSION_TYPE', 'filesystem')
    PERMANENT_SESSION_LIFETIME = 3600  # 1 hora
    
    # Configuración de Negocio
    MONEDA = os.getenv('MONEDA', 'COP')
    DEPOSITO_GARANTIA_PORCENTAJE = float(os.getenv('DEPOSITO_GARANTIA_PORCENTAJE', 20))


class ConfiguracionDesarrollo(ConfiguracionBase):
    """Configuración para desarrollo"""
    DEBUG = True
    TESTING = False


class ConfiguracionProduccion(ConfiguracionBase):
    """Configuración para producción"""
    DEBUG = False
    TESTING = False
    SECRET_KEY = os.getenv('SECRET_KEY')  # DEBE definirse en producción


class ConfiguracionPrueba(ConfiguracionBase):
    """Configuración para pruebas"""
    DEBUG = True
    TESTING = True
    DB_NAME = 'sistema_articulos_deportivos_test'


# Seleccionar configuración según entorno
def obtener_config():
    entorno = os.getenv('FLASK_ENV', 'development')
    
    if entorno == 'produccion':
        return ConfiguracionProduccion()
    elif entorno == 'prueba':
        return ConfiguracionPrueba()
    else:
        return ConfiguracionDesarrollo()
