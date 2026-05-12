# ════════════════════════════════════════════════════════════════════════════════
# PUNTO DE ENTRADA - SISTEMA DE ARTÍCULOS DEPORTIVOS
# ════════════════════════════════════════════════════════════════════════════════
import os
from dotenv import load_dotenv
from app import crear_app

# Cargar variables de entorno
load_dotenv()

# Crear aplicación
aplicacion = crear_app()

if __name__ == '__main__':
    puerto = int(os.getenv('FLASK_PORT', 5000))
    
    print("\n" + "="*80)
    print("SISTEMA DE GESTIÓN DE ARTÍCULOS DEPORTIVOS POR TICKETS")
    print("="*80)
    print(f"Servidor iniciado en: http://localhost:{puerto}")
    print(f"Ambiente: {os.getenv('FLASK_ENV', 'development')}")
    print(f"Base de datos: {os.getenv('DB_NAME')}")
    print("\n Haz clic derecho + ctrl en el link para abrir en navegador")
    print("="*80 + "\n")
    
    aplicacion.run(
        host='127.0.0.1',   
        port=puerto,
        debug=os.getenv('FLASK_DEBUG', True)
    )